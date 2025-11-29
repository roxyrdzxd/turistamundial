-- Actualizar el avatar "Estrella" a "Flor" con animación Lottie
UPDATE shop_items
SET 
  name = 'Avatar Flor',
  description = 'Avatar exclusivo con animación de flor colorida',
  image_url = 'https://cgoisveithzvituzyoga.supabase.co/storage/v1/object/public/lotties/Color%20flower%20animation.json',
  data = '{"avatar_type": "flower", "rarity": "common", "is_lottie": true}'::jsonb
WHERE name = 'Avatar Estrella';

-- Actualizar los avatares ya equipados de usuarios que tengan el avatar estrella
-- Primero obtenemos el ID del item actualizado
DO $$
DECLARE
  v_avatar_flor_id UUID;
BEGIN
  -- Obtener el ID del avatar Flor
  SELECT id INTO v_avatar_flor_id
  FROM shop_items
  WHERE name = 'Avatar Flor'
  LIMIT 1;

  -- Si encontramos el ID, actualizar los perfiles que tienen este avatar equipado
  IF v_avatar_flor_id IS NOT NULL THEN
    UPDATE profiles
    SET avatar_url = 'https://cgoisveithzvituzyoga.supabase.co/storage/v1/object/public/lotties/Color%20flower%20animation.json'
    WHERE id IN (
      SELECT DISTINCT ui.user_id
      FROM user_inventory ui
      WHERE ui.item_id = v_avatar_flor_id
        AND ui.is_equipped = true
    );
  END IF;
END $$;

