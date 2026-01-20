-- Fix: Agregar política RLS para INSERT en treasure_collections
-- La función collect_treasure necesita poder insertar recolecciones

-- Permitir que usuarios inserten sus propias recolecciones
CREATE POLICY IF NOT EXISTS "Users can insert own collections" ON treasure_collections
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- También necesitamos permitir que la función SECURITY DEFINER pueda insertar
-- Para esto, creamos una política que permita insertar si el user_id coincide
-- con el usuario autenticado (la función pasa el user_id como parámetro)
-- Nota: La función collect_treasure es SECURITY DEFINER, así que debería poder insertar
-- pero por si acaso, agregamos esta política adicional

-- Comentario
COMMENT ON POLICY "Users can insert own collections" ON treasure_collections IS 
  'Permite que los usuarios inserten sus propias recolecciones de tesoros. Usado por la función collect_treasure.';
