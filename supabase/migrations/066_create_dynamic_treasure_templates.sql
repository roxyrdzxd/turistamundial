-- Migración para crear sistema de templates de tesoros dinámicos con insignias
-- Permite que ciertos tesoros/insignias aparezcan aleatoriamente cerca del usuario

-- Agregar campo para identificar tesoros dinámicos
ALTER TABLE treasures 
ADD COLUMN IF NOT EXISTS is_dynamic BOOLEAN DEFAULT false;

-- Tabla para definir templates de tesoros que pueden aparecer aleatoriamente
CREATE TABLE IF NOT EXISTS dynamic_treasure_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  coins_reward INTEGER NOT NULL DEFAULT 10 CHECK (coins_reward > 0),
  rarity TEXT NOT NULL DEFAULT 'common' CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  badge_url TEXT, -- Si tiene badge, se otorga al recolectar
  spawn_probability DOUBLE PRECISION DEFAULT 0.1 CHECK (spawn_probability >= 0 AND spawn_probability <= 1), -- Probabilidad de aparecer (0-1)
  min_distance_meters INTEGER DEFAULT 300 CHECK (min_distance_meters > 0), -- Distancia mínima para que aparezca (requiere caminar)
  max_distance_meters INTEGER DEFAULT 1000 CHECK (max_distance_meters >= min_distance_meters), -- Distancia máxima
  min_walk_distance_meters INTEGER DEFAULT 300 CHECK (min_walk_distance_meters > 0), -- Distancia mínima a caminar (pasos estimados)
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_dynamic_templates_active ON dynamic_treasure_templates(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_treasures_is_dynamic ON treasures(is_dynamic) WHERE is_dynamic = true;

-- Función mejorada para spawn con templates e insignias
CREATE OR REPLACE FUNCTION spawn_dynamic_treasures_with_badges(
  p_latitude DOUBLE PRECISION,
  p_longitude DOUBLE PRECISION,
  p_radius_meters INTEGER DEFAULT 2000,
  p_min_treasures INTEGER DEFAULT 3
)
RETURNS JSONB AS $$
DECLARE
  v_existing_count INTEGER;
  v_treasures_to_spawn INTEGER;
  v_spawned_count INTEGER := 0;
  v_template_spawned_count INTEGER := 0;
  v_random_lat DOUBLE PRECISION;
  v_random_lng DOUBLE PRECISION;
  v_random_distance DOUBLE PRECISION;
  v_random_angle DOUBLE PRECISION;
  v_rarity TEXT;
  v_coins_reward INTEGER;
  v_radius_meters INTEGER;
  v_treasure_name TEXT;
  v_treasure_desc TEXT;
  v_treasure_id UUID;
  v_template dynamic_treasure_templates%ROWTYPE;
  v_should_spawn_template BOOLEAN;
  v_names TEXT[] := ARRAY[
    'Tesoro Perdido', 'Cofre Antiguo', 'Reliquia Escondida', 'Moneda Histórica',
    'Artefacto Misterioso', 'Gema Brillante', 'Medalla Olvidada', 'Cristal Mágico',
    'Mapa Antiguo', 'Estatuilla Rara', 'Moneda de Oro', 'Piedra Preciosa',
    'Collar Perdido', 'Anillo Antiguo', 'Llave Misteriosa', 'Cofre del Tesoro'
  ];
  v_descriptions TEXT[] := ARRAY[
    'Un tesoro que apareció misteriosamente en este lugar',
    'Alguien dejó esto aquí hace mucho tiempo',
    'Un cofre que espera ser descubierto',
    'Este tesoro te está buscando',
    'Un hallazgo inesperado en tu camino',
    'La suerte te ha traído aquí',
    'Un tesoro que solo los exploradores encuentran',
    'Este lugar guarda secretos valiosos'
  ];
BEGIN
  -- Contar tesoros activos disponibles en el área
  SELECT COUNT(*) INTO v_existing_count
  FROM treasures t
  WHERE 
    t.is_active = true
    AND (t.despawn_time IS NULL OR t.despawn_time > NOW())
    AND ST_DWithin(
      t.location::geography,
      ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography,
      p_radius_meters
    )
    AND (
      t.max_collections IS NULL OR t.current_collections < t.max_collections
    )
    AND (
      DATE(t.spawn_time) = CURRENT_DATE
      OR (t.despawn_time IS NULL)
    );

  -- Calcular cuántos tesoros básicos necesitamos generar
  v_treasures_to_spawn := GREATEST(0, p_min_treasures - v_existing_count);

  -- Generar tesoros básicos aleatorios (sin insignias)
  FOR i IN 1..v_treasures_to_spawn LOOP
    -- Generar ubicación aleatoria dentro del radio (entre 200m y el radio máximo)
    v_random_distance := 200 + (RANDOM() * (p_radius_meters - 200));
    v_random_angle := RANDOM() * 2 * PI();
    
    -- Calcular nueva latitud y longitud
    v_random_lat := p_latitude + (v_random_distance / 111000.0) * COS(v_random_angle);
    v_random_lng := p_longitude + (v_random_distance / (111000.0 * COS(RADIANS(p_latitude)))) * SIN(v_random_angle);

    -- Determinar rareza aleatoria (70% común, 20% raro, 8% épico, 2% legendario)
    v_rarity := CASE
      WHEN RANDOM() < 0.70 THEN 'common'
      WHEN RANDOM() < 0.90 THEN 'rare'
      WHEN RANDOM() < 0.98 THEN 'epic'
      ELSE 'legendary'
    END;

    -- Asignar recompensa y radio según rareza
    CASE v_rarity
      WHEN 'common' THEN
        v_coins_reward := 10 + FLOOR(RANDOM() * 20)::INTEGER;
        v_radius_meters := 50 + FLOOR(RANDOM() * 50)::INTEGER;
      WHEN 'rare' THEN
        v_coins_reward := 30 + FLOOR(RANDOM() * 40)::INTEGER;
        v_radius_meters := 75 + FLOOR(RANDOM() * 50)::INTEGER;
      WHEN 'epic' THEN
        v_coins_reward := 70 + FLOOR(RANDOM() * 60)::INTEGER;
        v_radius_meters := 100 + FLOOR(RANDOM() * 50)::INTEGER;
      WHEN 'legendary' THEN
        v_coins_reward := 130 + FLOOR(RANDOM() * 120)::INTEGER;
        v_radius_meters := 150 + FLOOR(RANDOM() * 100)::INTEGER;
    END CASE;

    -- Seleccionar nombre y descripción aleatorios
    v_treasure_name := v_names[1 + FLOOR(RANDOM() * array_length(v_names, 1))::INTEGER];
    v_treasure_desc := v_descriptions[1 + FLOOR(RANDOM() * array_length(v_descriptions, 1))::INTEGER];

    -- Crear el tesoro básico (desaparece después de 24 horas, sin insignia)
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
      is_active,
      is_dynamic
    ) VALUES (
      v_treasure_name,
      v_treasure_desc,
      v_coins_reward,
      ST_SetSRID(ST_MakePoint(v_random_lng, v_random_lat), 4326),
      v_radius_meters,
      v_rarity,
      1,
      NOW(),
      NOW() + INTERVAL '24 hours',
      true,
      true
    )
    RETURNING id INTO v_treasure_id;

    v_spawned_count := v_spawned_count + 1;
  END LOOP;

  -- NUEVO: Generar tesoros desde templates (con insignias)
  FOR v_template IN 
    SELECT * FROM dynamic_treasure_templates 
    WHERE is_active = true
  LOOP
    -- Verificar probabilidad de spawn
    v_should_spawn_template := RANDOM() < v_template.spawn_probability;
    
    IF v_should_spawn_template THEN
      -- Verificar que no haya demasiados tesoros dinámicos con insignia en el área
      -- (evitar spam de insignias)
      IF NOT EXISTS (
        SELECT 1 FROM treasures t
        WHERE 
          t.is_dynamic = true
          AND t.badge_url IS NOT NULL
          AND t.is_active = true
          AND (t.despawn_time IS NULL OR t.despawn_time > NOW())
          AND ST_DWithin(
            t.location::geography,
            ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography,
            p_radius_meters
          )
          AND DATE(t.spawn_time) = CURRENT_DATE
      ) THEN
        -- Generar ubicación aleatoria dentro del rango del template
        v_random_distance := v_template.min_distance_meters + 
          (RANDOM() * (v_template.max_distance_meters - v_template.min_distance_meters));
        v_random_angle := RANDOM() * 2 * PI();
        
        -- Calcular coordenadas
        v_random_lat := p_latitude + (v_random_distance / 111000.0) * COS(v_random_angle);
        v_random_lng := p_longitude + (v_random_distance / (111000.0 * COS(RADIANS(p_latitude)))) * SIN(v_random_angle);
        
        -- Crear tesoro desde template (con badge_url si tiene)
        INSERT INTO treasures (
          name,
          description,
          coins_reward,
          location,
          radius_meters,
          rarity,
          badge_url,
          max_collections,
          spawn_time,
          despawn_time,
          is_active,
          is_dynamic
        ) VALUES (
          v_template.name,
          v_template.description,
          v_template.coins_reward,
          ST_SetSRID(ST_MakePoint(v_random_lng, v_random_lat), 4326),
          50 + FLOOR(RANDOM() * 50)::INTEGER, -- Radio aleatorio 50-100m
          v_template.rarity,
          v_template.badge_url,
          1,
          NOW(),
          NOW() + INTERVAL '24 hours',
          true,
          true
        )
        RETURNING id INTO v_treasure_id;
        
        v_template_spawned_count := v_template_spawned_count + 1;
        v_spawned_count := v_spawned_count + 1;
      END IF;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'existing_count', v_existing_count,
    'spawned_count', v_spawned_count,
    'template_spawned_count', v_template_spawned_count,
    'total_available', v_existing_count + v_spawned_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies para dynamic_treasure_templates
ALTER TABLE dynamic_treasure_templates ENABLE ROW LEVEL SECURITY;

-- Política para que todos puedan ver templates activos
CREATE POLICY "Anyone can view active templates" ON dynamic_treasure_templates
  FOR SELECT
  USING (is_active = true);

-- Política para que solo admins puedan gestionar templates
CREATE POLICY "Admins can manage templates" ON dynamic_treasure_templates
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Comentarios
COMMENT ON TABLE dynamic_treasure_templates IS 'Templates de tesoros que pueden aparecer aleatoriamente cerca del usuario. Pueden incluir insignias.';
COMMENT ON COLUMN dynamic_treasure_templates.spawn_probability IS 'Probabilidad de que este template aparezca (0.0 a 1.0). Ej: 0.15 = 15% de probabilidad.';
COMMENT ON COLUMN dynamic_treasure_templates.min_distance_meters IS 'Distancia mínima desde el usuario para que aparezca (requiere caminar).';
COMMENT ON COLUMN dynamic_treasure_templates.max_distance_meters IS 'Distancia máxima desde el usuario para que aparezca.';
COMMENT ON COLUMN dynamic_treasure_templates.min_walk_distance_meters IS 'Distancia mínima estimada que el usuario debe caminar para recolectarlo.';
COMMENT ON FUNCTION spawn_dynamic_treasures_with_badges IS 'Genera tesoros dinámicos básicos y desde templates. Los templates pueden incluir insignias (badge_url).';
