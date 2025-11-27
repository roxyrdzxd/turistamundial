-- Migración para corregir errores en el registro de usuarios
-- Problema: "Database error saving new user" al intentar registrarse

-- Función mejorada para crear perfil en registro de usuario
-- Maneja usernames duplicados y errores en process_referral
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_referral_code TEXT;
  v_username TEXT;
  v_base_username TEXT;
  v_username_exists BOOLEAN;
  v_counter INTEGER := 0;
  v_referral_result JSONB;
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
      -- Esto asegura que el registro nunca falle por problemas con el username
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
  
  -- Procesar referido si existe código en metadata
  -- NO debe fallar el registro si hay error en el referido
  v_referral_code := NEW.raw_user_meta_data->>'referral_code';
  IF v_referral_code IS NOT NULL AND v_referral_code != '' THEN
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
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

