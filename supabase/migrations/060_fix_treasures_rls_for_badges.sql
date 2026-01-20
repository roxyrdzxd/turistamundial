-- Corregir política RLS de treasures para permitir ver tesoros recolectados
-- Los usuarios deben poder ver los tesoros que han recolectado (para mostrar medallas)
-- incluso si el tesoro ya no está activo

-- Eliminar política existente que solo permite ver tesoros activos
DROP POLICY IF EXISTS "Anyone can view active treasures" ON treasures;

-- Crear nueva política que permite:
-- 1. Ver tesoros activos (para el mapa)
-- 2. Ver tesoros que el usuario ha recolectado (para mostrar medallas en perfil)
CREATE POLICY "Anyone can view active treasures or own collected" ON treasures
  FOR SELECT
  USING (
    is_active = true 
    OR EXISTS (
      SELECT 1 FROM user_treasure_badges
      WHERE user_treasure_badges.treasure_id = treasures.id
      AND user_treasure_badges.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM treasure_collections
      WHERE treasure_collections.treasure_id = treasures.id
      AND treasure_collections.user_id = auth.uid()
    )
  );

COMMENT ON POLICY "Anyone can view active treasures or own collected" ON treasures IS
'Permite ver tesoros activos (para el mapa) o tesoros que el usuario ha recolectado (para mostrar medallas en perfil, incluso si ya no están activos).';
