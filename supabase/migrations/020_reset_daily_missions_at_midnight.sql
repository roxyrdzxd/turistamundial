-- Migración para reiniciar misiones diarias a medianoche

-- Función mejorada para inicializar misiones diarias que elimina las del día anterior
CREATE OR REPLACE FUNCTION initialize_daily_missions(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
  v_mission RECORD;
  v_deleted_count INTEGER := 0;
BEGIN
  -- Primero, eliminar todas las misiones diarias del día anterior (o anteriores)
  -- que no hayan sido reclamadas
  DELETE FROM user_missions um
  USING missions m
  WHERE um.user_id = p_user_id
    AND um.mission_id = m.id
    AND m.type = 'daily'
    AND DATE(um.created_at) < CURRENT_DATE;
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

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
      )
      ON CONFLICT (user_id, mission_id) DO UPDATE
      SET progress = 0,
          target = (v_mission.requirement->>'count')::INTEGER,
          completed_at = NULL,
          claimed_at = NULL,
          created_at = NOW();
      
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para reiniciar todas las misiones diarias para todos los usuarios
-- Esta función se ejecutará a medianoche mediante pg_cron
CREATE OR REPLACE FUNCTION reset_all_daily_missions()
RETURNS JSONB AS $$
DECLARE
  v_user RECORD;
  v_total_reset INTEGER := 0;
  v_total_users INTEGER := 0;
BEGIN
  -- Obtener todos los usuarios que tienen misiones diarias del día anterior
  FOR v_user IN
    SELECT DISTINCT um.user_id
    FROM user_missions um
    INNER JOIN missions m ON um.mission_id = m.id
    WHERE m.type = 'daily'
      AND DATE(um.created_at) < CURRENT_DATE
  LOOP
    -- Reinicializar misiones diarias para cada usuario
    PERFORM initialize_daily_missions(v_user.user_id);
    v_total_users := v_total_users + 1;
  END LOOP;

  -- También inicializar misiones diarias para usuarios que nunca las han tenido
  -- pero que tienen perfil activo
  FOR v_user IN
    SELECT p.id
    FROM profiles p
    WHERE NOT EXISTS (
      SELECT 1
      FROM user_missions um
      INNER JOIN missions m ON um.mission_id = m.id
      WHERE um.user_id = p.id
        AND m.type = 'daily'
        AND DATE(um.created_at) = CURRENT_DATE
    )
  LOOP
    PERFORM initialize_daily_missions(v_user.id);
    v_total_users := v_total_users + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'users_processed', v_total_users,
    'timestamp', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para actualizar progreso de misiones que también verifica si es un nuevo día
-- y reinicia misiones diarias si es necesario
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
  v_mission_date DATE;
BEGIN
  -- Verificar si el usuario tiene misiones diarias del día anterior y reiniciarlas
  IF EXISTS (
    SELECT 1
    FROM user_missions um
    INNER JOIN missions m ON um.mission_id = m.id
    WHERE um.user_id = p_user_id
      AND m.type = 'daily'
      AND DATE(um.created_at) < CURRENT_DATE
  ) THEN
    -- Reinicializar misiones diarias si es un nuevo día
    PERFORM initialize_daily_missions(p_user_id);
  END IF;

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
      
      -- Para misiones diarias, verificar que sean del día actual
      IF v_mission.type = 'daily' THEN
        SELECT DATE(created_at) INTO v_mission_date
        FROM user_missions
        WHERE user_id = p_user_id
          AND mission_id = v_mission.id;
        
        -- Si la misión no existe o es de un día anterior, saltarla
        -- (ya debería haberse reiniciado arriba, pero por seguridad)
        IF v_mission_date IS NULL OR v_mission_date < CURRENT_DATE THEN
          CONTINUE;
        END IF;
      END IF;
    END IF;

    -- Buscar progreso de misión del usuario
    SELECT * INTO v_user_mission
    FROM user_missions
    WHERE user_id = p_user_id
      AND mission_id = v_mission.id
      AND (v_mission.type != 'daily' OR DATE(created_at) = CURRENT_DATE);

    IF v_user_mission IS NULL THEN
      -- Crear nuevo progreso solo si es del día actual (para misiones diarias)
      IF v_mission.type = 'daily' THEN
        -- Inicializar misiones diarias primero
        PERFORM initialize_daily_missions(p_user_id);
        -- Intentar obtener de nuevo
        SELECT * INTO v_user_mission
        FROM user_missions
        WHERE user_id = p_user_id
          AND mission_id = v_mission.id
          AND DATE(created_at) = CURRENT_DATE;
        
        -- Si aún no existe, saltar
        IF v_user_mission IS NULL THEN
          CONTINUE;
        END IF;
      ELSE
        -- Para misiones no diarias, verificar si existe primero
        SELECT * INTO v_user_mission
        FROM user_missions
        WHERE user_id = p_user_id
          AND mission_id = v_mission.id;
        
        -- Si no existe, crear nuevo progreso
        IF v_user_mission IS NULL THEN
          INSERT INTO user_missions (user_id, mission_id, progress, target)
          VALUES (
            p_user_id,
            v_mission.id,
            LEAST(p_count, (v_mission.requirement->>'count')::INTEGER),
            (v_mission.requirement->>'count')::INTEGER
          )
          RETURNING * INTO v_user_mission;
        END IF;
      END IF;
    END IF;

    -- Actualizar progreso existente (solo si es del día actual para misiones diarias)
    IF v_mission.type = 'daily' AND DATE(v_user_mission.created_at) < CURRENT_DATE THEN
      CONTINUE; -- Saltar misiones diarias del día anterior
    END IF;

    UPDATE user_missions
    SET progress = LEAST(progress + p_count, target)
    WHERE id = v_user_mission.id
    RETURNING * INTO v_user_mission;

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

-- Función helper para inicializar misiones diarias para un usuario específico
-- Ejemplo de uso: SELECT initialize_daily_missions_for_user('UUID_DEL_USUARIO');
-- O para todos los usuarios: SELECT reset_all_daily_missions();

-- NOTA: Para configurar el reinicio automático a medianoche, usa un cron job externo
-- que llame a la API route /api/cron/reset-daily-missions
-- Ver documentación en docs/DAILY_MISSIONS_RESET.md para más detalles

