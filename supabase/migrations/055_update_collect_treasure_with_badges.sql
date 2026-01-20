-- Actualizar función collect_treasure para otorgar medallas automáticamente
-- Cuando un usuario recolecta un tesoro que tiene badge_url, se le otorga la medalla

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
  v_mission_result JSONB;
  v_is_rare BOOLEAN := false;
  v_is_legendary BOOLEAN := false;
  v_is_morning BOOLEAN := false;
  v_badge_granted BOOLEAN := false;
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

  -- Determinar tipo de tesoro para misiones
  v_is_rare := v_treasure.rarity IN ('rare', 'epic', 'legendary');
  v_is_legendary := v_treasure.rarity = 'legendary';
  v_is_morning := EXTRACT(HOUR FROM NOW()) < 12;
  
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
  
  -- Otorgar medalla si el tesoro tiene badge_url
  IF v_treasure.badge_url IS NOT NULL AND v_treasure.badge_url != '' THEN
    BEGIN
      -- Insertar directamente sin verificar RLS ya que la función es SECURITY DEFINER
      -- La política RLS permite INSERT si user_id = auth.uid(), pero como somos SECURITY DEFINER,
      -- necesitamos insertar directamente sin pasar por RLS
      INSERT INTO user_treasure_badges (user_id, treasure_id)
      VALUES (p_user_id, p_treasure_id)
      ON CONFLICT (user_id, treasure_id) DO NOTHING;
      
      GET DIAGNOSTICS v_badge_granted = ROW_COUNT;
      -- Si se insertó (ROW_COUNT = 1), se otorgó la medalla
      -- Si no (conflicto), el usuario ya tenía la medalla
    EXCEPTION WHEN OTHERS THEN
      -- Log del error para debugging
      RAISE WARNING 'Error al otorgar medalla: %', SQLERRM;
      v_badge_granted := false;
    END;
  END IF;
  
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
    -- Eliminar medalla si se otorgó
    IF v_badge_granted THEN
      DELETE FROM user_treasure_badges WHERE user_id = p_user_id AND treasure_id = p_treasure_id;
    END IF;
    
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Error al otorgar coins: ' || (v_result->>'error')
    );
  END IF;

  -- Actualizar progreso de misiones
  -- Misión general: collect_treasure
  BEGIN
    SELECT update_mission_progress(
      p_user_id,
      'collect_treasure',
      1,
      NULL
    ) INTO v_mission_result;
  EXCEPTION WHEN OTHERS THEN
    -- Ignorar errores de misiones, no es crítico
    NULL;
  END;
  
  -- Misión de tesoros raros
  IF v_is_rare THEN
    BEGIN
      SELECT update_mission_progress(
        p_user_id,
        'collect_rare_treasure',
        1,
        NULL
      ) INTO v_mission_result;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;
  
  -- Misión de tesoros legendarios
  IF v_is_legendary THEN
    BEGIN
      SELECT update_mission_progress(
        p_user_id,
        'collect_legendary_treasure',
        1,
        NULL
      ) INTO v_mission_result;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;
  
  -- Misión matutina
  IF v_is_morning THEN
    BEGIN
      SELECT update_mission_progress(
        p_user_id,
        'collect_treasure_morning',
        1,
        NULL
      ) INTO v_mission_result;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'coins_earned', v_treasure.coins_reward,
    'new_balance', (v_result->>'new_balance')::integer,
    'treasure_name', v_treasure.name,
    'treasure_rarity', v_treasure.rarity,
    'distance_meters', ROUND(v_distance_meters::numeric, 2),
    'badge_granted', v_badge_granted AND v_treasure.badge_url IS NOT NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentario
COMMENT ON FUNCTION collect_treasure IS 'Recolecta un tesoro, otorga coins y medalla (si el tesoro tiene badge_url). Actualizado para incluir sistema de medallas.';
