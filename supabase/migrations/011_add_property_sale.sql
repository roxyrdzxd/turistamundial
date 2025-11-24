-- Agregar campos para venta de propiedades
ALTER TABLE player_countries 
ADD COLUMN IF NOT EXISTS is_for_sale BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE player_countries 
ADD COLUMN IF NOT EXISTS sale_price INTEGER;

-- Crear índice para búsquedas rápidas de propiedades en venta
CREATE INDEX IF NOT EXISTS idx_player_countries_for_sale ON player_countries(session_id, is_for_sale) WHERE is_for_sale = true;

