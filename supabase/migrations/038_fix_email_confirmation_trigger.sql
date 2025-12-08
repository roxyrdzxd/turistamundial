-- Migración para corregir el error "Error confirming user"
-- El problema es que el trigger puede estar fallando durante la confirmación del email
-- Esta migración asegura que NUNCA falle la confirmación del usuario, incluso si hay errores al crear el perfil

-- 1. Mejorar handle_new_user para que NUNCA falle el registro
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_referral_code TEXT;
  v_username TEXT;
  v_base_username TEXT;
  v_username_exists BOOLEAN;
  v_counter INTEGER := 0;
  v_referral_result JSONB;
  v_profile_exists BOOLEAN;
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
  
  -- Crear perfil con manejo de errores robusto
  -- IMPORTANTE: NUNCA debe fallar el registro si hay error al crear el perfil
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
    IF v_referral_code IS NOT NULL AND v_referral_code != '' THEN
      -- Verificar que el usuario no tenga ya un referido
      IF NOT EXISTS(SELECT 1 FROM referrals WHERE referred_id = NEW.id) THEN
        BEGIN
          -- Llamar a la función de procesamiento de referidos
          SELECT process_referral(NEW.id, v_referral_code) INTO v_referral_result;
          
          -- Verificar si el resultado indica error
          IF v_referral_result->>'success' = 'false' THEN
            -- Log del error pero no fallar el registro
            RAISE WARNING 'Error al procesar referido para usuario %: %', NEW.id, v_referral_result->>'error';
          END IF;
        EXCEPTION
          WHEN OTHERS THEN
            -- Cualquier error en process_referral no debe fallar el registro
            RAISE WARNING 'Excepción al procesar referido para usuario %: %', NEW.id, SQLERRM;
        END;
      END IF;
    END IF;
  END IF;
  
  -- SIEMPRE retornar NEW, incluso si hubo errores
  -- Esto es crítico para que el registro del usuario no falle
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Mejorar handle_email_confirmed para que NUNCA falle la confirmación
CREATE OR REPLACE FUNCTION public.handle_email_confirmed()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo procesar si el email fue confirmado (antes era NULL, ahora tiene valor)
  IF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN
    -- Verificar si el perfil existe
    IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
      -- Intentar crear el perfil usando ensure_user_profile
      -- IMPORTANTE: Si falla, solo loguear el error pero NO fallar la confirmación
      BEGIN
        PERFORM ensure_user_profile(NEW.id);
      EXCEPTION
        WHEN OTHERS THEN
          -- Si falla, intentar crear con username simple
          BEGIN
            INSERT INTO public.profiles (id, username)
            VALUES (NEW.id, 'Usuario' || REPLACE(NEW.id::text, '-', ''))
            ON CONFLICT (id) DO NOTHING;
          EXCEPTION
            WHEN OTHERS THEN
              -- Si aún falla, solo loguear pero NO fallar la confirmación
              RAISE WARNING 'Error al crear perfil para usuario % después de confirmar email: %', NEW.id, SQLERRM;
          END;
      END;
    END IF;
  END IF;
  
  -- SIEMPRE retornar NEW, incluso si hubo errores
  -- Esto es crítico para que la confirmación del email no falle
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Asegurar que el trigger existe
DROP TRIGGER IF EXISTS on_auth_user_email_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_email_confirmed
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW
  WHEN (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL)
  EXECUTE FUNCTION public.handle_email_confirmed();

COMMENT ON FUNCTION public.handle_new_user() IS 
'Crea el perfil de un usuario al registrarse. NUNCA debe fallar el registro del usuario, incluso si hay errores al crear el perfil.';

COMMENT ON FUNCTION public.handle_email_confirmed() IS 
'Crea el perfil si no existe cuando se confirma el email. NUNCA debe fallar la confirmación del email, incluso si hay errores al crear el perfil.';

