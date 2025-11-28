-- Migración para crear sistema de múltiples tableros
-- Permite que los usuarios seleccionen entre diferentes tableros al crear partidas

-- Tabla de tableros
CREATE TABLE IF NOT EXISTS boards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Agregar board_id a game_sessions
ALTER TABLE game_sessions
ADD COLUMN IF NOT EXISTS board_id UUID REFERENCES boards(id) ON DELETE RESTRICT;

-- Agregar board_id a countries y cambiar position para que sea único por board
-- Primero eliminar la constraint UNIQUE de position
ALTER TABLE countries
DROP CONSTRAINT IF EXISTS countries_position_key;

-- Agregar board_id a countries
ALTER TABLE countries
ADD COLUMN IF NOT EXISTS board_id UUID REFERENCES boards(id) ON DELETE CASCADE;

-- Crear constraint única para position por board
CREATE UNIQUE INDEX IF NOT EXISTS idx_countries_board_position 
ON countries(board_id, position) 
WHERE board_id IS NOT NULL;

-- Agregar campo type para diferenciar tipos de propiedades (city, stadium, attraction, transport, service, special)
ALTER TABLE countries
ADD COLUMN IF NOT EXISTS property_type TEXT DEFAULT 'city' CHECK (property_type IN ('city', 'stadium', 'attraction', 'transport', 'service', 'special'));

-- Agregar campo monopoly_group para agrupar propiedades en monopolios
ALTER TABLE countries
ADD COLUMN IF NOT EXISTS monopoly_group TEXT;

-- Agregar campos para nombres personalizados de mejoras (en lugar de casas/hoteles)
ALTER TABLE countries
ADD COLUMN IF NOT EXISTS improvement_level_1_name TEXT DEFAULT 'Casa';
ALTER TABLE countries
ADD COLUMN IF NOT EXISTS improvement_level_2_name TEXT DEFAULT 'Casa';
ALTER TABLE countries
ADD COLUMN IF NOT EXISTS improvement_level_3_name TEXT DEFAULT 'Casa';
ALTER TABLE countries
ADD COLUMN IF NOT EXISTS improvement_level_4_name TEXT DEFAULT 'Casa';
ALTER TABLE countries
ADD COLUMN IF NOT EXISTS improvement_level_5_name TEXT DEFAULT 'Hotel';

-- Crear tablero "Turista Mundial" (el existente)
INSERT INTO boards (id, name, description, is_active) VALUES
('00000000-0000-0000-0000-000000000001', 'Turista Mundial', 'Tablero clásico con países del mundo', true)
ON CONFLICT (name) DO NOTHING;

-- Actualizar countries existentes para asignarlos al tablero mundial
UPDATE countries
SET board_id = '00000000-0000-0000-0000-000000000001'
WHERE board_id IS NULL;

-- Crear tablero "Turista Nuevo León"
INSERT INTO boards (id, name, description, is_active) VALUES
('00000000-0000-0000-0000-000000000002', 'Turista Nuevo León', 'Tablero con ciudades y lugares de Nuevo León, México', true)
ON CONFLICT (name) DO NOTHING;

-- RLS Policies para boards
ALTER TABLE boards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active boards" ON boards
  FOR SELECT
  USING (is_active = true);

