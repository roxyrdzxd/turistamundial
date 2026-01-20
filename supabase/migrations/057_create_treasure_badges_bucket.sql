-- Crear bucket de medallas de tesoros en Supabase Storage
-- Nota: Este SQL debe ejecutarse en el SQL Editor de Supabase
-- Los buckets de Storage se crean a través de la API o el dashboard, pero podemos crear las políticas aquí

-- IMPORTANTE: Primero crea el bucket "treasure-badges" desde el dashboard de Supabase:
-- 1. Ve a Storage > Create bucket
-- 2. Nombre: "treasure-badges"
-- 3. Public: true (marcar como público para acceso sin autenticación)
-- 4. File size limit: 50KB (o el que prefieras)
-- 5. Allowed MIME types: image/png, image/jpeg (opcional, para restringir tipos)

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Anyone can view treasure badges" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload treasure badges" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update treasure badges" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete treasure badges" ON storage.objects;

-- Permitir a todos ver las medallas (público)
-- Esto permite que las medallas se carguen en el perfil sin autenticación
CREATE POLICY "Anyone can view treasure badges"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'treasure-badges');

-- Permitir a administradores subir medallas
-- Verificar que el usuario tenga rol 'admin' en profiles
CREATE POLICY "Admins can upload treasure badges"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'treasure-badges' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Permitir a administradores actualizar medallas
CREATE POLICY "Admins can update treasure badges"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'treasure-badges' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
)
WITH CHECK (
  bucket_id = 'treasure-badges' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Permitir a administradores eliminar medallas
CREATE POLICY "Admins can delete treasure badges"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'treasure-badges' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

COMMENT ON POLICY "Anyone can view treasure badges" ON storage.objects IS
'Permite a todos los usuarios (público) ver y descargar medallas del bucket "treasure-badges"';
