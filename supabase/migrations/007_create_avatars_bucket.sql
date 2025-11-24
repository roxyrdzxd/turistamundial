-- Crear bucket de avatares en Supabase Storage
-- Nota: Este SQL debe ejecutarse en el SQL Editor de Supabase
-- Los buckets de Storage se crean a través de la API o el dashboard, pero podemos crear las políticas aquí

-- Crear el bucket si no existe (esto se hace mejor desde el dashboard de Supabase)
-- Ve a Storage > Create bucket > Nombre: "avatars" > Public: true

-- Políticas RLS para el bucket de avatares
-- Nota: Primero crea el bucket "avatars" desde el dashboard de Supabase (Storage > Create bucket)

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;

-- Permitir a los usuarios autenticados subir sus propios avatares
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  (string_to_array(name, '/'))[1] = auth.uid()::text
);

-- Permitir a los usuarios autenticados actualizar sus propios avatares
CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (string_to_array(name, '/'))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'avatars' AND
  (string_to_array(name, '/'))[1] = auth.uid()::text
);

-- Permitir a todos ver los avatares (público)
CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- Permitir a los usuarios autenticados eliminar sus propios avatares
CREATE POLICY "Users can delete own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (string_to_array(name, '/'))[1] = auth.uid()::text
);

