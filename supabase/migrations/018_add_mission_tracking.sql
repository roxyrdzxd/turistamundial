-- Migración para agregar sistema de tracking de misiones

-- Función para actualizar progreso de misiones
CREATE OR REPLACE FUNCTION update_mission_progress(
  p_user_id UUID,
  p_action TEXT,
  p_count INTEGER DEFAULT 1,
  p_session_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_mission RECORD;
  v_user_mission RECORD;
  v_updated_count INTEGER := 0;
  v_completed_count INTEGER := 0;
  v_result JSONB := '[]'::jsonb;
BEGIN
  -- Buscar misiones activas que requieren esta acción
  FOR v_mission IN
    SELECT m.*
    FROM missions m
    WHERE m.is_active = true
      AND m.requirement->>'action' = p_action
  LOOP
    -- Verificar si es misión diaria/semanal y si está vigente
    IF v_mission.type IN ('daily', 'weekly') THEN
      -- Verificar si la misión no ha expirado
      IF v_mission.expires_at IS NOT NULL AND v_mission.expires_at < NOW() THEN
        CONTINUE; -- Saltar misiones expiradas
      END IF;
    END IF;

    -- Buscar o crear progreso de misión del usuario
    SELECT * INTO v_user_mission
    FROM user_missions
    WHERE user_id = p_user_id
      AND mission_id = v_mission.id;

    IF v_user_mission IS NULL THEN
      -- Crear nuevo progreso
      INSERT INTO user_missions (user_id, mission_id, progress, target)
      VALUES (
        p_user_id,
        v_mission.id,
        LEAST(p_count, (v_mission.requirement->>'count')::INTEGER),
        (v_mission.requirement->>'count')::INTEGER
      )
      RETURNING * INTO v_user_mission;
    ELSE
      -- Actualizar progreso existente
      UPDATE user_missions
      SET progress = LEAST(progress + p_count, target)
      WHERE id = v_user_mission.id
      RETURNING * INTO v_user_mission;
    END IF;

    -- Verificar si se completó
    IF v_user_mission.progress >= v_user_mission.target AND v_user_mission.completed_at IS NULL THEN
      UPDATE user_missions
      SET completed_at = NOW()
      WHERE id = v_user_mission.id;
      
      v_completed_count := v_completed_count + 1;
    END IF;

    v_updated_count := v_updated_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'updated', v_updated_count,
    'completed', v_completed_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para inicializar misiones diarias para un usuario
CREATE OR REPLACE FUNCTION initialize_daily_missions(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
  v_mission RECORD;
BEGIN
  -- Obtener misiones diarias activas
  FOR v_mission IN
    SELECT *
    FROM missions
    WHERE type = 'daily'
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > NOW())
  LOOP
    -- Verificar si ya existe progreso para hoy
    IF NOT EXISTS (
      SELECT 1
      FROM user_missions
      WHERE user_id = p_user_id
        AND mission_id = v_mission.id
        AND DATE(created_at) = CURRENT_DATE
    ) THEN
      -- Crear nuevo progreso
      INSERT INTO user_missions (user_id, mission_id, progress, target)
      VALUES (
        p_user_id,
        v_mission.id,
        0,
        (v_mission.requirement->>'count')::INTEGER
      );
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para inicializar misiones semanales para un usuario
CREATE OR REPLACE FUNCTION initialize_weekly_missions(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
  v_mission RECORD;
  v_week_start DATE;
BEGIN
  -- Calcular inicio de semana (lunes)
  v_week_start := DATE_TRUNC('week', CURRENT_DATE)::DATE;

  -- Obtener misiones semanales activas
  FOR v_mission IN
    SELECT *
    FROM missions
    WHERE type = 'weekly'
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > NOW())
  LOOP
    -- Verificar si ya existe progreso para esta semana
    IF NOT EXISTS (
      SELECT 1
      FROM user_missions
      WHERE user_id = p_user_id
        AND mission_id = v_mission.id
        AND DATE(created_at) >= v_week_start
    ) THEN
      -- Crear nuevo progreso
      INSERT INTO user_missions (user_id, mission_id, progress, target)
      VALUES (
        p_user_id,
        v_mission.id,
        0,
        (v_mission.requirement->>'count')::INTEGER
      );
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para inicializar misiones de logros (achievements) para un usuario
CREATE OR REPLACE FUNCTION initialize_achievement_missions(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
  v_mission RECORD;
BEGIN
  -- Obtener misiones de logros activas
  FOR v_mission IN
    SELECT *
    FROM missions
    WHERE type = 'achievement'
      AND is_active = true
  LOOP
    -- Verificar si ya existe progreso
    IF NOT EXISTS (
      SELECT 1
      FROM user_missions
      WHERE user_id = p_user_id
        AND mission_id = v_mission.id
    ) THEN
      -- Crear nuevo progreso
      INSERT INTO user_missions (user_id, mission_id, progress, target)
      VALUES (
        p_user_id,
        v_mission.id,
        0,
        (v_mission.requirement->>'count')::INTEGER
      );
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

