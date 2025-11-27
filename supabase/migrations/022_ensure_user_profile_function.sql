-- Migración para crear función que asegura que el perfil de usuario existe
-- Esto sirve como fallback si el trigger no funciona correctamente

-- Función para asegurar que un perfil existe para un usuario
CREATE OR REPLACE FUNCTION ensure_user_profile(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_username TEXT;
  v_base_username TEXT;
  v_username_exists BOOLEAN;
  v_counter INTEGER := 0;
  v_profile_exists BOOLEAN;
BEGIN
  -- Verificar si el perfil ya existe
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = p_user_id) INTO v_profile_exists;
  
  IF v_profile_exists THEN
    RETURN true;
  END IF;
  
  -- Si no existe, crear el perfil
  -- Obtener username de metadata del usuario o generar uno por defecto
  SELECT COALESCE(
    NULLIF(TRIM((raw_user_meta_data->>'username')::TEXT), ''),
    'Usuario' || UPPER(SUBSTRING(REPLACE(p_user_id::text, '-', ''), 1, 8))
  ) INTO v_base_username
  FROM auth.users
  WHERE id = p_user_id;
  
  -- Si no se pudo obtener de metadata, usar valor por defecto
  IF v_base_username IS NULL THEN
    v_base_username := 'Usuario' || UPPER(SUBSTRING(REPLACE(p_user_id::text, '-', ''), 1, 8));
  END IF;
  
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
      v_username := 'Usuario' || REPLACE(p_user_id::text, '-', '');
      EXIT;
    END IF;
  END LOOP;
  
  -- Crear perfil con manejo de errores
  BEGIN
    INSERT INTO public.profiles (id, username)
    VALUES (p_user_id, v_username)
    ON CONFLICT (id) DO UPDATE
    SET username = COALESCE(EXCLUDED.username, profiles.username);
    
    RETURN true;
  EXCEPTION
    WHEN OTHERS THEN
      -- Si falla, intentar con username basado en ID
      BEGIN
        INSERT INTO public.profiles (id, username)
        VALUES (p_user_id, 'Usuario' || REPLACE(p_user_id::text, '-', ''))
        ON CONFLICT (id) DO NOTHING;
        
        RETURN true;
      EXCEPTION
        WHEN OTHERS THEN
          -- Si aún falla, loguear el error pero retornar false
          RAISE WARNING 'Error crítico al crear perfil para usuario %: %', p_user_id, SQLERRM;
          RETURN false;
      END;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION ensure_user_profile(UUID) IS 
'Asegura que un perfil existe para un usuario. Si no existe, lo crea automáticamente. 
Retorna true si el perfil existe o se creó exitosamente, false en caso de error.';

