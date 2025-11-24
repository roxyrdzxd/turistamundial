-- Crear bucket de sonidos en Supabase Storage
-- Nota: Este SQL debe ejecutarse en el SQL Editor de Supabase
-- Los buckets de Storage se crean a través de la API o el dashboard, pero podemos crear las políticas aquí

-- IMPORTANTE: Primero crea el bucket "sounds" desde el dashboard de Supabase:
-- 1. Ve a Storage > Create bucket
-- 2. Nombre: "sounds"
-- 3. Public: true (marcar como público para acceso sin autenticación)
-- 4. File size limit: 5MB (o el que prefieras)
-- 5. Allowed MIME types: audio/mpeg, audio/mp3 (opcional, para restringir tipos)

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Anyone can view sounds" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload sounds" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update sounds" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete sounds" ON storage.objects;

-- Permitir a todos ver los sonidos (público)
-- Esto permite que los sonidos se carguen en el juego sin autenticación
CREATE POLICY "Anyone can view sounds"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'sounds');

-- Opcional: Permitir a administradores subir sonidos
-- Nota: Ajusta la condición según tu sistema de roles
-- Por ahora, permitimos a usuarios autenticados subir (puedes restringirlo más tarde)
CREATE POLICY "Admins can upload sounds"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'sounds');

-- Opcional: Permitir a administradores actualizar sonidos
CREATE POLICY "Admins can update sounds"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'sounds')
WITH CHECK (bucket_id = 'sounds');

-- Opcional: Permitir a administradores eliminar sonidos
CREATE POLICY "Admins can delete sounds"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'sounds');

COMMENT ON POLICY "Anyone can view sounds" ON storage.objects IS
'Permite a todos los usuarios (público) ver y descargar sonidos del bucket "sounds"';

