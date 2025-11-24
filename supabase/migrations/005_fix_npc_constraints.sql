-- Verificar y eliminar la constraint de foreign key de profiles si aún existe
-- Esta migración asegura que la constraint se elimine correctamente

DO $$ 
DECLARE
  constraint_name_var TEXT;
BEGIN
  -- Buscar el nombre real de la constraint
  SELECT constraint_name INTO constraint_name_var
  FROM information_schema.table_constraints 
  WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND constraint_type = 'FOREIGN KEY'
    AND constraint_name LIKE '%id%'
  LIMIT 1;

  -- Si encontramos una constraint, eliminarla
  IF constraint_name_var IS NOT NULL THEN
    EXECUTE format('ALTER TABLE profiles DROP CONSTRAINT IF EXISTS %I', constraint_name_var);
    RAISE NOTICE 'Constraint eliminada: %', constraint_name_var;
  ELSE
    RAISE NOTICE 'No se encontró constraint de foreign key en profiles';
  END IF;
END $$;

-- Asegurar que las políticas RLS permitan insertar perfiles
DROP POLICY IF EXISTS "Allow NPC profile creation" ON profiles;
CREATE POLICY "Allow NPC profile creation"
  ON profiles FOR INSERT
  WITH CHECK (true);

-- Asegurar que las políticas RLS permitan ver todos los perfiles
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT
  USING (true);

-- Verificar que el índice existe
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);

