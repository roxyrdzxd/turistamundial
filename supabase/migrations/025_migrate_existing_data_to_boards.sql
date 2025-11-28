-- Migración para asegurar que todos los datos existentes del tablero tradicional
-- tengan el board_id correcto y los campos necesarios

-- Asegurar que el tablero "Turista Mundial" existe
INSERT INTO boards (id, name, description, is_active) VALUES
('00000000-0000-0000-0000-000000000001', 'Turista Mundial', 'Tablero clásico con países del mundo', true)
ON CONFLICT (name) DO UPDATE SET is_active = true;

-- Actualizar todos los países existentes que no tienen board_id
-- Asignarlos al tablero mundial por defecto
UPDATE countries
SET board_id = '00000000-0000-0000-0000-000000000001'
WHERE board_id IS NULL;

-- Agregar campos faltantes a países existentes si no los tienen
UPDATE countries
SET 
  property_type = COALESCE(property_type, 'city'),
  improvement_level_1_name = COALESCE(improvement_level_1_name, 'Casa'),
  improvement_level_2_name = COALESCE(improvement_level_2_name, 'Casa'),
  improvement_level_3_name = COALESCE(improvement_level_3_name, 'Casa'),
  improvement_level_4_name = COALESCE(improvement_level_4_name, 'Casa'),
  improvement_level_5_name = COALESCE(improvement_level_5_name, 'Hotel')
WHERE board_id = '00000000-0000-0000-0000-000000000001'
  AND (
    property_type IS NULL OR
    improvement_level_1_name IS NULL OR
    improvement_level_2_name IS NULL OR
    improvement_level_3_name IS NULL OR
    improvement_level_4_name IS NULL OR
    improvement_level_5_name IS NULL
  );

-- Actualizar todas las sesiones existentes que no tienen board_id
-- Asignarlas al tablero mundial por defecto
UPDATE game_sessions
SET board_id = '00000000-0000-0000-0000-000000000001'
WHERE board_id IS NULL;

-- Verificar que no queden países sin board_id
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM countries WHERE board_id IS NULL) THEN
    RAISE EXCEPTION 'Quedan países sin board_id asignado. Revisa la migración.';
  END IF;
END $$;

