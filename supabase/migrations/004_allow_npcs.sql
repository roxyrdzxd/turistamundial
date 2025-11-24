-- Permitir NPCs: Modificar profiles para que no siempre requiera auth.users
-- Esto permite crear perfiles para NPCs sin usuarios de autenticación

-- Primero, eliminar la constraint de foreign key de profiles si existe
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'profiles_id_fkey' 
    AND table_name = 'profiles'
  ) THEN
    ALTER TABLE profiles DROP CONSTRAINT profiles_id_fkey;
  END IF;
END $$;

-- Crear un índice para mejorar performance
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);

-- Actualizar la política RLS para permitir ver todos los perfiles (incluyendo NPCs)
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT
  USING (true);

-- Permitir insertar perfiles (para NPCs)
DROP POLICY IF EXISTS "Allow NPC profile creation" ON profiles;
CREATE POLICY "Allow NPC profile creation"
  ON profiles FOR INSERT
  WITH CHECK (true);

-- Nota: Los NPCs se crearán con IDs UUID que no existen en auth.users
-- El username será el identificador principal para NPCs (ej: "Bot Alpha")

