-- Actualizar el avatar "Dorado" a "Dinero" con animación Lottie
UPDATE shop_items
SET 
  name = 'Avatar Dinero',
  description = 'Avatar exclusivo con animación de dinero',
  image_url = 'https://cgoisveithzvituzyoga.supabase.co/storage/v1/object/public/lotties/Money%20(1).json',
  data = '{"avatar_type": "money", "rarity": "rare", "is_lottie": true}'::jsonb
WHERE name = 'Avatar Dorado';

-- Actualizar los avatares ya equipados de usuarios que tengan el avatar dorado
-- Primero obtenemos el ID del item actualizado
DO $$
DECLARE
  v_avatar_dinero_id UUID;
BEGIN
  -- Obtener el ID del avatar Dinero
  SELECT id INTO v_avatar_dinero_id
  FROM shop_items
  WHERE name = 'Avatar Dinero'
  LIMIT 1;

  -- Si encontramos el ID, actualizar los perfiles que tienen este avatar equipado
  IF v_avatar_dinero_id IS NOT NULL THEN
    UPDATE profiles
    SET avatar_url = 'https://cgoisveithzvituzyoga.supabase.co/storage/v1/object/public/lotties/Money%20(1).json'
    WHERE id IN (
      SELECT DISTINCT ui.user_id
      FROM user_inventory ui
      WHERE ui.item_id = v_avatar_dinero_id
        AND ui.is_equipped = true
    );
  END IF;
END $$;

