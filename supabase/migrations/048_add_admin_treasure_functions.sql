-- Funciones para administración de tesoros
-- Permiten crear y gestionar tesoros desde el panel de admin

-- Función para crear tesoro desde admin panel
CREATE OR REPLACE FUNCTION create_treasure_admin(
  p_name TEXT,
  p_latitude DOUBLE PRECISION,
  p_longitude DOUBLE PRECISION,
  p_description TEXT DEFAULT NULL,
  p_coins_reward INTEGER DEFAULT 10,
  p_radius_meters INTEGER DEFAULT 50,
  p_rarity TEXT DEFAULT 'common',
  p_max_collections INTEGER DEFAULT NULL,
  p_despawn_time TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_is_active BOOLEAN DEFAULT true
)
RETURNS JSONB AS $$
DECLARE
  v_treasure_id UUID;
  v_treasure JSONB;
BEGIN
  -- Validar rareza
  IF p_rarity NOT IN ('common', 'rare', 'epic', 'legendary') THEN
    RAISE EXCEPTION 'Rareza inválida: %', p_rarity;
  END IF;

  -- Validar coordenadas
  IF p_latitude < -90 OR p_latitude > 90 OR p_longitude < -180 OR p_longitude > 180 THEN
    RAISE EXCEPTION 'Coordenadas inválidas: lat=%, lng=%', p_latitude, p_longitude;
  END IF;

  -- Crear tesoro
  INSERT INTO treasures (
    name,
    description,
    coins_reward,
    location,
    radius_meters,
    rarity,
    max_collections,
    spawn_time,
    despawn_time,
    is_active
  ) VALUES (
    p_name,
    p_description,
    p_coins_reward,
    ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326),
    p_radius_meters,
    p_rarity,
    p_max_collections,
    NOW(),
    p_despawn_time,
    p_is_active
  )
  RETURNING id INTO v_treasure_id;

  -- Retornar tesoro creado con coordenadas
  SELECT jsonb_build_object(
    'id', t.id,
    'name', t.name,
    'description', t.description,
    'coins_reward', t.coins_reward,
    'latitude', ST_Y(t.location),
    'longitude', ST_X(t.location),
    'radius_meters', t.radius_meters,
    'rarity', t.rarity,
    'max_collections', t.max_collections,
    'current_collections', t.current_collections,
    'spawn_time', t.spawn_time,
    'despawn_time', t.despawn_time,
    'is_active', t.is_active,
    'created_at', t.created_at,
    'updated_at', t.updated_at
  ) INTO v_treasure
  FROM treasures t
  WHERE t.id = v_treasure_id;

  RETURN v_treasure;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para actualizar tesoro desde admin panel
CREATE OR REPLACE FUNCTION update_treasure_admin(
  p_treasure_id UUID,
  p_name TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_coins_reward INTEGER DEFAULT NULL,
  p_latitude DOUBLE PRECISION DEFAULT NULL,
  p_longitude DOUBLE PRECISION DEFAULT NULL,
  p_radius_meters INTEGER DEFAULT NULL,
  p_rarity TEXT DEFAULT NULL,
  p_max_collections INTEGER DEFAULT NULL,
  p_despawn_time TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_is_active BOOLEAN DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_treasure JSONB;
  v_rows_updated INTEGER;
BEGIN
  -- Validar rareza si se proporciona
  IF p_rarity IS NOT NULL AND p_rarity NOT IN ('common', 'rare', 'epic', 'legendary') THEN
    RAISE EXCEPTION 'Rareza inválida: %', p_rarity;
  END IF;

  -- Validar coordenadas si se proporcionan
  IF (p_latitude IS NOT NULL OR p_longitude IS NOT NULL) THEN
    IF p_latitude IS NULL OR p_longitude IS NULL THEN
      RAISE EXCEPTION 'Debe proporcionar tanto latitud como longitud';
    END IF;
    IF p_latitude < -90 OR p_latitude > 90 OR p_longitude < -180 OR p_longitude > 180 THEN
      RAISE EXCEPTION 'Coordenadas inválidas: lat=%, lng=%', p_latitude, p_longitude;
    END IF;
  END IF;

  -- Actualizar tesoro
  UPDATE treasures
  SET
    name = COALESCE(p_name, name),
    description = COALESCE(p_description, description),
    coins_reward = COALESCE(p_coins_reward, coins_reward),
    location = CASE 
      WHEN p_latitude IS NOT NULL AND p_longitude IS NOT NULL 
      THEN ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)
      ELSE location
    END,
    radius_meters = COALESCE(p_radius_meters, radius_meters),
    rarity = COALESCE(p_rarity, rarity),
    max_collections = COALESCE(p_max_collections, max_collections),
    despawn_time = COALESCE(p_despawn_time, despawn_time),
    is_active = COALESCE(p_is_active, is_active),
    updated_at = NOW()
  WHERE id = p_treasure_id;

  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;

  IF v_rows_updated = 0 THEN
    RAISE EXCEPTION 'Tesoro no encontrado: %', p_treasure_id;
  END IF;

  -- Retornar tesoro actualizado con coordenadas
  SELECT jsonb_build_object(
    'id', t.id,
    'name', t.name,
    'description', t.description,
    'coins_reward', t.coins_reward,
    'latitude', ST_Y(t.location),
    'longitude', ST_X(t.location),
    'radius_meters', t.radius_meters,
    'rarity', t.rarity,
    'max_collections', t.max_collections,
    'current_collections', t.current_collections,
    'spawn_time', t.spawn_time,
    'despawn_time', t.despawn_time,
    'is_active', t.is_active,
    'created_at', t.created_at,
    'updated_at', t.updated_at
  ) INTO v_treasure
  FROM treasures t
  WHERE t.id = p_treasure_id;

  RETURN v_treasure;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener tesoros con coordenadas (para admin)
CREATE OR REPLACE FUNCTION get_treasures_admin(
  p_is_active BOOLEAN DEFAULT NULL,
  p_rarity TEXT DEFAULT NULL
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
  max_collections INTEGER,
  current_collections INTEGER,
  spawn_time TIMESTAMP WITH TIME ZONE,
  despawn_time TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
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
    t.max_collections,
    t.current_collections,
    t.spawn_time,
    t.despawn_time,
    t.is_active,
    t.created_at,
    t.updated_at
  FROM treasures t
  WHERE
    (p_is_active IS NULL OR t.is_active = p_is_active)
    AND (p_rarity IS NULL OR t.rarity = p_rarity)
  ORDER BY t.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentarios
COMMENT ON FUNCTION create_treasure_admin IS 'Crea un nuevo tesoro desde el panel de administración';
COMMENT ON FUNCTION update_treasure_admin IS 'Actualiza un tesoro existente desde el panel de administración';
COMMENT ON FUNCTION get_treasures_admin IS 'Obtiene todos los tesoros con coordenadas para el panel de administración';
