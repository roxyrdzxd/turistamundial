-- Migración para crear sistema de tesoros en el mapa (estilo Pokémon GO)
-- Permite a los jugadores encontrar tesoros con TuristaCoins mientras exploran

-- Habilitar extensión PostGIS para cálculos geográficos
CREATE EXTENSION IF NOT EXISTS postgis;

-- Tabla de tesoros
CREATE TABLE IF NOT EXISTS treasures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  coins_reward INTEGER NOT NULL DEFAULT 10 CHECK (coins_reward > 0),
  location GEOMETRY(POINT, 4326) NOT NULL, -- lat/lng usando PostGIS (SRID 4326 = WGS84)
  radius_meters INTEGER NOT NULL DEFAULT 50 CHECK (radius_meters > 0), -- Distancia para recolectar
  rarity TEXT NOT NULL DEFAULT 'common' CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  max_collections INTEGER DEFAULT NULL, -- NULL = ilimitado, número = límite de veces recolectable
  current_collections INTEGER NOT NULL DEFAULT 0,
  spawn_time TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  despawn_time TIMESTAMP WITH TIME ZONE, -- NULL = no desaparece
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Tabla de recolecciones de tesoros por usuario
CREATE TABLE IF NOT EXISTS treasure_collections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  treasure_id UUID NOT NULL REFERENCES treasures(id) ON DELETE CASCADE,
  collected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  coins_earned INTEGER NOT NULL CHECK (coins_earned > 0),
  user_location GEOMETRY(POINT, 4326) NOT NULL, -- Ubicación del usuario al recolectar
  UNIQUE(user_id, treasure_id) -- Un usuario solo puede recolectar un tesoro una vez
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_treasures_location ON treasures USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_treasures_active ON treasures(is_active);
CREATE INDEX IF NOT EXISTS idx_treasures_spawn_time ON treasures(spawn_time);
CREATE INDEX IF NOT EXISTS idx_treasures_rarity ON treasures(rarity);
CREATE INDEX IF NOT EXISTS idx_treasure_collections_user ON treasure_collections(user_id);
CREATE INDEX IF NOT EXISTS idx_treasure_collections_treasure ON treasure_collections(treasure_id);
CREATE INDEX IF NOT EXISTS idx_treasure_collections_collected_at ON treasure_collections(collected_at DESC);
CREATE INDEX IF NOT EXISTS idx_treasure_collections_user_location ON treasure_collections USING GIST(user_location);

-- Función para encontrar tesoros cercanos a una ubicación
CREATE OR REPLACE FUNCTION find_nearby_treasures(
  p_latitude DOUBLE PRECISION,
  p_longitude DOUBLE PRECISION,
  p_radius_meters INTEGER DEFAULT 1000,
  p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  coins_reward INTEGER,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  radius_meters INTEGER,
  rarity TEXT,
  distance_meters DOUBLE PRECISION,
  can_collect BOOLEAN,
  already_collected BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.name,
    t.description,
    t.coins_reward,
    ST_Y(t.location) AS latitude,
    ST_X(t.location) AS longitude,
    t.radius_meters,
    t.rarity,
    ST_Distance(
      t.location::geography,
      ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography
    )::DOUBLE PRECISION AS distance_meters,
    CASE 
      WHEN t.is_active = false THEN false
      WHEN t.despawn_time IS NOT NULL AND t.despawn_time < NOW() THEN false
      WHEN t.max_collections IS NOT NULL AND t.current_collections >= t.max_collections THEN false
      WHEN p_user_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM treasure_collections tc 
        WHERE tc.user_id = p_user_id AND tc.treasure_id = t.id
      ) THEN false
      ELSE true
    END AS can_collect,
    CASE 
      WHEN p_user_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM treasure_collections tc 
        WHERE tc.user_id = p_user_id AND tc.treasure_id = t.id
      ) THEN true
      ELSE false
    END AS already_collected
  FROM treasures t
  WHERE 
    t.is_active = true
    AND (t.despawn_time IS NULL OR t.despawn_time > NOW())
    AND ST_DWithin(
      t.location::geography,
      ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography,
      p_radius_meters
    )
  ORDER BY 
    ST_Distance(
      t.location::geography,
      ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography
    )::DOUBLE PRECISION ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para recolectar un tesoro
CREATE OR REPLACE FUNCTION collect_treasure(
  p_user_id UUID,
  p_treasure_id UUID,
  p_user_latitude DOUBLE PRECISION,
  p_user_longitude DOUBLE PRECISION
)
RETURNS JSONB AS $$
DECLARE
  v_treasure treasures%ROWTYPE;
  v_distance_meters DOUBLE PRECISION;
  v_already_collected BOOLEAN;
  v_result JSONB;
BEGIN
  -- Verificar que el tesoro existe y está activo
  SELECT * INTO v_treasure
  FROM treasures
  WHERE id = p_treasure_id AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Tesoro no encontrado o inactivo'
    );
  END IF;
  
  -- Verificar que no haya expirado
  IF v_treasure.despawn_time IS NOT NULL AND v_treasure.despawn_time < NOW() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Este tesoro ya expiró'
    );
  END IF;
  
  -- Verificar límite de colecciones
  IF v_treasure.max_collections IS NOT NULL AND v_treasure.current_collections >= v_treasure.max_collections THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Este tesoro ya fue recolectado el máximo de veces'
    );
  END IF;
  
  -- Verificar si el usuario ya lo recolectó
  SELECT EXISTS(
    SELECT 1 FROM treasure_collections 
    WHERE user_id = p_user_id AND treasure_id = p_treasure_id
  ) INTO v_already_collected;
  
  IF v_already_collected THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Ya recolectaste este tesoro'
    );
  END IF;
  
  -- Calcular distancia del usuario al tesoro
  SELECT ST_Distance(
    v_treasure.location::geography,
    ST_SetSRID(ST_MakePoint(p_user_longitude, p_user_latitude), 4326)::geography
  ) INTO v_distance_meters;
  
  -- Verificar que el usuario esté dentro del radio
  IF v_distance_meters > v_treasure.radius_meters THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Estás muy lejos del tesoro. Acércate más.',
      'distance_meters', ROUND(v_distance_meters::numeric, 2),
      'required_radius', v_treasure.radius_meters
    );
  END IF;
  
  -- Registrar la recolección
  INSERT INTO treasure_collections (user_id, treasure_id, coins_earned, user_location)
  VALUES (
    p_user_id,
    p_treasure_id,
    v_treasure.coins_reward,
    ST_SetSRID(ST_MakePoint(p_user_longitude, p_user_latitude), 4326)
  );
  
  -- Actualizar contador de colecciones del tesoro
  UPDATE treasures
  SET 
    current_collections = current_collections + 1,
    updated_at = NOW()
  WHERE id = p_treasure_id;
  
  -- Otorgar coins al usuario usando la función existente
  SELECT grant_coins(
    p_user_id,
    v_treasure.coins_reward,
    'treasure',
    'Tesoro recolectado: ' || v_treasure.name,
    p_treasure_id
  ) INTO v_result;
  
  -- Si grant_coins falló, hacer rollback
  IF (v_result->>'success')::boolean = false THEN
    -- Eliminar la recolección
    DELETE FROM treasure_collections WHERE user_id = p_user_id AND treasure_id = p_treasure_id;
    -- Revertir contador
    UPDATE treasures SET current_collections = current_collections - 1 WHERE id = p_treasure_id;
    
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Error al otorgar coins: ' || (v_result->>'error')
    );
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'coins_earned', v_treasure.coins_reward,
    'new_balance', (v_result->>'new_balance')::integer,
    'treasure_name', v_treasure.name,
    'distance_meters', ROUND(v_distance_meters::numeric, 2)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies
ALTER TABLE treasures ENABLE ROW LEVEL SECURITY;
ALTER TABLE treasure_collections ENABLE ROW LEVEL SECURITY;

-- Políticas para tesoros (cualquiera puede ver tesoros activos)
CREATE POLICY "Anyone can view active treasures" ON treasures
  FOR SELECT
  USING (is_active = true);

-- Políticas para recolecciones (usuarios solo ven sus propias recolecciones)
CREATE POLICY "Users can view own collections" ON treasure_collections
  FOR SELECT
  USING (user_id = auth.uid());

-- Actualizar el tipo de transacción en coin_transactions para incluir 'treasure'
-- Primero eliminamos la constraint existente y la recreamos
ALTER TABLE coin_transactions 
  DROP CONSTRAINT IF EXISTS coin_transactions_type_check;

ALTER TABLE coin_transactions 
  ADD CONSTRAINT coin_transactions_type_check 
  CHECK (type IN ('purchase', 'mission', 'achievement', 'reward', 'referral', 'purchase_item', 'refund', 'treasure'));

-- Insertar algunos tesoros de ejemplo (Monterrey, México)
-- Estos son solo ejemplos, se pueden modificar o eliminar
INSERT INTO treasures (name, description, coins_reward, location, radius_meters, rarity, is_active) VALUES
('Tesoro del Obispado', 'Un tesoro histórico cerca del Obispado', 25, ST_SetSRID(ST_MakePoint(-100.3186, 25.6866), 4326), 50, 'common', true),
('Tesoro del Parque Fundidora', 'Tesoro escondido en el parque', 50, ST_SetSRID(ST_MakePoint(-100.2856, 25.6789), 4326), 75, 'rare', true),
('Tesoro del Macroplaza', 'Tesoro en el corazón de la ciudad', 15, ST_SetSRID(ST_MakePoint(-100.3106, 25.6861), 4326), 50, 'common', true),
('Tesoro del Cerro de la Silla', 'Tesoro en la montaña emblemática', 100, ST_SetSRID(ST_MakePoint(-100.2500, 25.6167), 4326), 100, 'epic', true)
ON CONFLICT DO NOTHING;

-- Comentarios para documentación
COMMENT ON TABLE treasures IS 'Tabla de tesoros que aparecen en el mapa. Los jugadores pueden recolectarlos para ganar TuristaCoins.';
COMMENT ON TABLE treasure_collections IS 'Registro de tesoros recolectados por usuarios.';
COMMENT ON FUNCTION find_nearby_treasures IS 'Encuentra tesoros cercanos a una ubicación geográfica.';
COMMENT ON FUNCTION collect_treasure IS 'Permite a un usuario recolectar un tesoro y ganar coins.';
