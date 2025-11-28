-- Migración para hacer más robusta la creación de perfiles
-- Asegura que el perfil siempre exista cuando el usuario accede

-- 1. Mejorar la función handle_new_user para que sea más robusta
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
  
  -- Crear perfil con manejo de errores
  -- Usar ON CONFLICT para evitar errores si el perfil ya existe
  BEGIN
    INSERT INTO public.profiles (id, username)
    VALUES (NEW.id, v_username)
    ON CONFLICT (id) DO UPDATE
    SET username = COALESCE(EXCLUDED.username, profiles.username);
    
    -- Verificar que el perfil se creó correctamente
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = NEW.id) INTO v_profile_exists;
    
    IF NOT v_profile_exists THEN
      RAISE WARNING 'Perfil no se creó correctamente para usuario %', NEW.id;
      -- Intentar crear nuevamente con username basado en ID
      INSERT INTO public.profiles (id, username)
      VALUES (NEW.id, 'Usuario' || REPLACE(NEW.id::text, '-', ''))
      ON CONFLICT (id) DO NOTHING;
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      -- Si hay cualquier error, intentar con username basado en ID
      BEGIN
        INSERT INTO public.profiles (id, username)
        VALUES (NEW.id, 'Usuario' || REPLACE(NEW.id::text, '-', ''))
        ON CONFLICT (id) DO NOTHING;
      EXCEPTION
        WHEN OTHERS THEN
          -- Si aún falla, solo loguear el error pero no fallar el registro
          RAISE WARNING 'Error crítico al crear perfil para usuario %: %', NEW.id, SQLERRM;
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
          ELSE
            -- Log de éxito para debugging
            RAISE NOTICE 'Referido procesado exitosamente para usuario % con código %', NEW.id, v_referral_code;
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
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Crear función que se ejecuta cuando se confirma el email
-- Esto asegura que si el perfil no se creó en el registro, se cree al confirmar
CREATE OR REPLACE FUNCTION public.handle_email_confirmed()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo procesar si el email fue confirmado (antes era NULL, ahora tiene valor)
  IF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN
    -- Verificar si el perfil existe
    IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
      -- Intentar crear el perfil usando ensure_user_profile
      PERFORM ensure_user_profile(NEW.id);
      
      RAISE NOTICE 'Perfil creado para usuario % después de confirmar email', NEW.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Crear trigger que se ejecuta cuando se actualiza auth.users (cuando se confirma el email)
DROP TRIGGER IF EXISTS on_auth_user_email_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_email_confirmed
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW
  WHEN (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL)
  EXECUTE FUNCTION public.handle_email_confirmed();

-- 4. Crear función para verificar y crear perfil si no existe (para usar en middleware/APIs)
CREATE OR REPLACE FUNCTION public.ensure_user_profile_safe(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_profile_exists BOOLEAN;
BEGIN
  -- Verificar si el perfil existe
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = p_user_id) INTO v_profile_exists;
  
  IF v_profile_exists THEN
    RETURN true;
  END IF;
  
  -- Si no existe, intentar crearlo
  BEGIN
    PERFORM ensure_user_profile(p_user_id);
    
    -- Verificar nuevamente
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = p_user_id) INTO v_profile_exists;
    
    RETURN v_profile_exists;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error al crear perfil para usuario %: %', p_user_id, SQLERRM;
      RETURN false;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.ensure_user_profile_safe(UUID) IS 
'Verifica y crea el perfil de un usuario de forma segura. Retorna true si el perfil existe o se creó exitosamente.';

