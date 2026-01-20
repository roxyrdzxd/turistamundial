-- Fix: Agregar política RLS para INSERT en treasure_collections
-- La función collect_treasure necesita poder insertar recolecciones

-- Eliminar política si existe (por si acaso)
DROP POLICY IF EXISTS "Users can insert own collections" ON treasure_collections;

-- Permitir que usuarios inserten sus propias recolecciones
-- Esta política permite que tanto usuarios directos como funciones SECURITY DEFINER
-- puedan insertar, siempre que el user_id coincida con auth.uid()
CREATE POLICY "Users can insert own collections" ON treasure_collections
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Verificar políticas para UPDATE en treasures
-- La función collect_treasure necesita actualizar current_collections
-- Como es SECURITY DEFINER, debería poder hacerlo, pero verifiquemos que no haya bloqueos
-- Si hay problemas, podríamos necesitar una política específica para funciones

-- También necesitamos permitir que la función SECURITY DEFINER pueda insertar
-- Para esto, creamos una política que permita insertar si el user_id coincide
-- con el usuario autenticado (la función pasa el user_id como parámetro)
-- Nota: La función collect_treasure es SECURITY DEFINER, así que debería poder insertar
-- pero por si acaso, agregamos esta política adicional

-- Comentario
COMMENT ON POLICY "Users can insert own collections" ON treasure_collections IS 
  'Permite que los usuarios inserten sus propias recolecciones de tesoros. Usado por la función collect_treasure.';
