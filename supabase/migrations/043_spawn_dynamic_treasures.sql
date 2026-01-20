-- Función para generar tesoros dinámicos cerca de una ubicación
-- Asegura que haya al menos un mínimo de tesoros disponibles diariamente

CREATE OR REPLACE FUNCTION spawn_daily_treasures(
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
  -- Contar tesoros activos disponibles en el área (que no hayan sido recolectados por nadie hoy)
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
      -- Tesoros que no han alcanzado su límite de colecciones
      t.max_collections IS NULL OR t.current_collections < t.max_collections
    )
    AND (
      -- Solo contar tesoros creados hoy o que aún no han expirado
      DATE(t.spawn_time) = CURRENT_DATE
      OR (t.despawn_time IS NULL)
    );

  -- Calcular cuántos tesoros necesitamos generar
  v_treasures_to_spawn := GREATEST(0, p_min_treasures - v_existing_count);

  -- Generar tesoros aleatorios
  FOR i IN 1..v_treasures_to_spawn LOOP
    -- Generar ubicación aleatoria dentro del radio (entre 200m y el radio máximo)
    v_random_distance := 200 + (RANDOM() * (p_radius_meters - 200));
    v_random_angle := RANDOM() * 2 * PI();
    
    -- Calcular nueva latitud y longitud usando proyección simple
    -- Aproximación: 1 grado de latitud ≈ 111km, 1 grado de longitud ≈ 111km * cos(latitud)
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
        v_coins_reward := 10 + FLOOR(RANDOM() * 20)::INTEGER; -- 10-30 coins
        v_radius_meters := 50 + FLOOR(RANDOM() * 50)::INTEGER; -- 50-100m
      WHEN 'rare' THEN
        v_coins_reward := 30 + FLOOR(RANDOM() * 40)::INTEGER; -- 30-70 coins
        v_radius_meters := 75 + FLOOR(RANDOM() * 50)::INTEGER; -- 75-125m
      WHEN 'epic' THEN
        v_coins_reward := 70 + FLOOR(RANDOM() * 60)::INTEGER; -- 70-130 coins
        v_radius_meters := 100 + FLOOR(RANDOM() * 50)::INTEGER; -- 100-150m
      WHEN 'legendary' THEN
        v_coins_reward := 130 + FLOOR(RANDOM() * 120)::INTEGER; -- 130-250 coins
        v_radius_meters := 150 + FLOOR(RANDOM() * 100)::INTEGER; -- 150-250m
    END CASE;

    -- Seleccionar nombre y descripción aleatorios
    v_treasure_name := v_names[1 + FLOOR(RANDOM() * array_length(v_names, 1))::INTEGER];
    v_treasure_desc := v_descriptions[1 + FLOOR(RANDOM() * array_length(v_descriptions, 1))::INTEGER];

    -- Crear el tesoro (desaparece después de 24 horas)
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
      v_treasure_name,
      v_treasure_desc,
      v_coins_reward,
      ST_SetSRID(ST_MakePoint(v_random_lng, v_random_lat), 4326),
      v_radius_meters,
      v_rarity,
      1, -- Solo puede ser recolectado una vez
      NOW(),
      NOW() + INTERVAL '24 hours', -- Desaparece en 24 horas
      true
    )
    RETURNING id INTO v_treasure_id;

    v_spawned_count := v_spawned_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'existing_count', v_existing_count,
    'spawned_count', v_spawned_count,
    'total_available', v_existing_count + v_spawned_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentario
COMMENT ON FUNCTION spawn_daily_treasures IS 'Genera tesoros dinámicos cerca de una ubicación para asegurar que haya al menos un mínimo de tesoros disponibles diariamente';
