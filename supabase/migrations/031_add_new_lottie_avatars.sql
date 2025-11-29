-- Insertar nuevos avatares con animaciones Lottie
INSERT INTO shop_items (name, description, category, price_coins, is_active, image_url, data) VALUES
-- Party Dance
('Avatar Party Dance', 'Avatar exclusivo con animación de fiesta y baile', 'avatar', 5000, true, 'https://cgoisveithzvituzyoga.supabase.co/storage/v1/object/public/lotties/Party%20Dance.json', '{"avatar_type": "party_dance", "rarity": "epic", "is_lottie": true}'::jsonb),

-- Chica con audífonos
('Avatar Chica con Audífonos', 'Avatar exclusivo con animación de chica escuchando música', 'avatar', 7500, true, 'https://cgoisveithzvituzyoga.supabase.co/storage/v1/object/public/lotties/Girl%20listening%20to%20music.json', '{"avatar_type": "girl_music", "rarity": "legendary", "is_lottie": true}'::jsonb),

-- Caja Sorpresa
('Avatar Caja Sorpresa', 'Avatar exclusivo con animación de caja sorpresa con corazón', 'avatar', 10000, true, 'https://cgoisveithzvituzyoga.supabase.co/storage/v1/object/public/lotties/Gift%20Box%20with%20heart%20pop%20up.json', '{"avatar_type": "gift_box", "rarity": "legendary", "is_lottie": true}'::jsonb),

-- Osito Teddy
('Avatar Osito Teddy', 'Avatar exclusivo con animación de osito de peluche', 'avatar', 3000, true, 'https://cgoisveithzvituzyoga.supabase.co/storage/v1/object/public/lotties/teddy-bear.json', '{"avatar_type": "teddy_bear", "rarity": "rare", "is_lottie": true}'::jsonb)

ON CONFLICT DO NOTHING;

