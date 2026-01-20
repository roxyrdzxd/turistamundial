-- Script de ejemplo para asignar rol de administrador a un usuario
-- IMPORTANTE: Reemplaza 'USER_EMAIL_HERE' con el email del usuario que quieres hacer admin
-- O reemplaza 'USER_ID_HERE' con el UUID del usuario

-- Método 1: Asignar admin por email
UPDATE profiles
SET role = 'admin'
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'USER_EMAIL_HERE'
);

-- Método 2: Asignar admin por UUID directamente
-- UPDATE profiles
-- SET role = 'admin'
-- WHERE id = 'USER_ID_HERE';

-- Verificar que el cambio se aplicó correctamente
SELECT id, username, email, role
FROM profiles
WHERE role = 'admin';

-- Comentario
COMMENT ON FUNCTION is_admin IS 'Para asignar admin a un usuario, ejecuta: UPDATE profiles SET role = ''admin'' WHERE id = ''USER_ID'';';
