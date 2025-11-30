-- Migración para agregar campo preferred_color a profiles
-- Permite que los usuarios guarden su color preferido comprado en la tienda

-- Agregar columna preferred_color a profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS preferred_color TEXT;

-- Comentario para documentar el campo
COMMENT ON COLUMN profiles.preferred_color IS 'Color preferido del jugador comprado en la tienda. Se usará en nuevas sesiones de juego. Valores: red, blue, green, yellow, purple, orange, pink, cyan, rainbow, neon';

