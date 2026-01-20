-- Migración para agregar sistema de roles de administrador
-- Permite gestionar tesoros y misiones desde un panel de administración

-- Agregar columna de rol a profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator'));

-- Crear índice para búsquedas rápidas de administradores
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- Función para verificar si un usuario es administrador
CREATE OR REPLACE FUNCTION is_admin(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = p_user_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para verificar si un usuario es moderador o admin
CREATE OR REPLACE FUNCTION is_moderator_or_admin(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = p_user_id AND role IN ('admin', 'moderator')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Políticas RLS para administradores en treasures
-- Los administradores pueden hacer todo en treasures
DROP POLICY IF EXISTS "Admins can manage all treasures" ON treasures;
CREATE POLICY "Admins can manage all treasures" ON treasures
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Políticas RLS para administradores en missions
-- Los administradores pueden hacer todo en missions
DROP POLICY IF EXISTS "Admins can manage all missions" ON missions;
CREATE POLICY "Admins can manage all missions" ON missions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Comentarios
COMMENT ON COLUMN profiles.role IS 'Rol del usuario: user (normal), admin (administrador), moderator (moderador)';
COMMENT ON FUNCTION is_admin IS 'Verifica si un usuario tiene rol de administrador';
COMMENT ON FUNCTION is_moderator_or_admin IS 'Verifica si un usuario tiene rol de moderador o administrador';
