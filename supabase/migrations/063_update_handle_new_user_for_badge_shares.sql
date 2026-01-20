-- Migración para actualizar handle_new_user para soportar badge shares
-- Detecta si el referido viene de un link de medalla compartida y aplica el bonus

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_referral_code TEXT;
  v_badge_treasure_id TEXT;
  v_username TEXT;
  v_base_username TEXT;
  v_username_exists BOOLEAN;
  v_counter INTEGER := 0;
  v_referral_result JSONB;
  v_profile_exists BOOLEAN;
  v_from_badge_share BOOLEAN := false;
BEGIN
  -- Obtener username de metadata o generar uno por defecto
  v_base_username := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'username'), ''),
    'Usuario' || UPPER(SUBSTRING(REPLACE(NEW.id::text, '-', ''), 1, 8))
  );
  
  v_username := v_base_username;
  
  -- Verificar si el username ya existe y generar uno único si es necesario
  LOOP
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE username = v_username) INTO v_username_exists;
    
    EXIT WHEN NOT v_username_exists;
    
    -- Si existe, agregar un sufijo numérico
    v_counter := v_counter + 1;
    v_username := v_base_username || v_counter::TEXT;
    
    -- Prevenir loop infinito (máximo 1000 intentos)
    IF v_counter > 1000 THEN
      -- Si no podemos generar un username único, usar el ID completo
      v_username := 'Usuario' || REPLACE(NEW.id::text, '-', '');
      EXIT;
    END IF;
  END LOOP;
  
  -- Crear perfil con manejo de errores
  -- Usar ON CONFLICT para evitar errores si el perfil ya existe
  BEGIN
    INSERT INTO public.profiles (id, username)
    VALUES (NEW.id, v_username)
    ON CONFLICT (id) DO UPDATE
    SET username = COALESCE(EXCLUDED.username, profiles.username);
  EXCEPTION
    WHEN OTHERS THEN
      -- Si hay cualquier error, intentar con username basado en ID
      BEGIN
        INSERT INTO public.profiles (id, username)
        VALUES (NEW.id, 'Usuario' || REPLACE(NEW.id::text, '-', ''))
        ON CONFLICT (id) DO NOTHING;
      EXCEPTION
        WHEN OTHERS THEN
          -- Si aún falla, solo loguear el error pero NO fallar el registro
          -- Esto es crítico: el registro del usuario NO debe fallar
          RAISE WARNING 'Error al crear perfil para usuario %: %', NEW.id, SQLERRM;
      END;
  END;
  
  -- Verificar que el perfil existe antes de procesar referido
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = NEW.id) INTO v_profile_exists;
  
  -- Procesar referido si existe código en metadata Y el perfil existe
  -- NO debe fallar el registro si hay error en el referido
  IF v_profile_exists THEN
    v_referral_code := NEW.raw_user_meta_data->>'referral_code';
    v_badge_treasure_id := NEW.raw_user_meta_data->>'badge_treasure_id';
    
    -- Determinar si viene de un badge share
    v_from_badge_share := (v_badge_treasure_id IS NOT NULL AND v_badge_treasure_id != '');
    
    IF v_referral_code IS NOT NULL AND v_referral_code != '' THEN
      -- Verificar que el usuario no tenga ya un referido
      IF NOT EXISTS(SELECT 1 FROM referrals WHERE referred_id = NEW.id) THEN
        BEGIN
          -- Llamar a la función de procesamiento de referidos con soporte para badge shares
          SELECT process_referral(
            NEW.id, 
            v_referral_code,
            v_from_badge_share,
            CASE WHEN v_from_badge_share THEN v_badge_treasure_id::UUID ELSE NULL END
          ) INTO v_referral_result;
          
          -- Verificar si el resultado indica error
          IF v_referral_result->>'success' = 'false' THEN
            -- Log del error pero no fallar el registro
            RAISE WARNING 'Error al procesar referido para usuario %: %', NEW.id, v_referral_result->>'error';
          ELSE
            -- Log de éxito para debugging
            IF v_from_badge_share THEN
              RAISE NOTICE 'Referido procesado exitosamente para usuario % con código % desde badge share (treasure_id: %). Recompensa: % TC', 
                NEW.id, v_referral_code, v_badge_treasure_id, v_referral_result->>'reward_coins';
            ELSE
              RAISE NOTICE 'Referido procesado exitosamente para usuario % con código %. Recompensa: % TC', 
                NEW.id, v_referral_code, v_referral_result->>'reward_coins';
            END IF;
          END IF;
        EXCEPTION
          WHEN OTHERS THEN
            -- Cualquier error en process_referral no debe fallar el registro
            RAISE WARNING 'Excepción al procesar referido para usuario %: %', NEW.id, SQLERRM;
        END;
      ELSE
        RAISE NOTICE 'Usuario % ya tiene un referido, no se procesa nuevo código', NEW.id;
      END IF;
    END IF;
  ELSE
    RAISE WARNING 'Perfil no encontrado para usuario % después de intentar crearlo', NEW.id;
  END IF;
  
  -- SIEMPRE retornar NEW, incluso si hubo errores
  -- Esto es crítico para que el registro del usuario no falle
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
