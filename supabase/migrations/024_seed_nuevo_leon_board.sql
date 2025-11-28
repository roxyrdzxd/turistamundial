-- Insertar propiedades del tablero "Turista Nuevo León"
-- Tablero con 40 casillas basado en ciudades y lugares de Nuevo León

-- ID del tablero Nuevo León
DO $$
DECLARE
  v_board_id UUID := '00000000-0000-0000-0000-000000000002';
BEGIN

-- Casilla 0: Inicio (especial, no se compra)
INSERT INTO countries (board_id, name, continent, price, base_rent, house_price, hotel_price, position, property_type, improvement_level_1_name, improvement_level_2_name, improvement_level_3_name, improvement_level_4_name, improvement_level_5_name) VALUES
(v_board_id, 'Inicio', 'special', 0, 0, 0, 0, 0, 'special', 'Casa', 'Casa', 'Casa', 'Casa', 'Hotel')
ON CONFLICT (board_id, position) DO NOTHING;

-- Lado inferior (posiciones 1-9): Ciudades Área Metropolitana
-- Capital Regia: Monterrey, San Pedro, San Nicolas, Guadalupe
-- Corredor Industrial: Escobedo, Apodaca, Santa Catarina
-- Tierras Nuevas: Juarez, Cadereyta
INSERT INTO countries (board_id, name, continent, price, base_rent, house_price, hotel_price, position, property_type, monopoly_group, improvement_level_1_name, improvement_level_2_name, improvement_level_3_name, improvement_level_4_name, improvement_level_5_name) VALUES
(v_board_id, 'Monterrey', 'blue', 60, 2, 50, 200, 1, 'city', 'Capital Regia', 'Oxxo', 'Carnes Ramos', 'Piedrera', 'Cervecería', 'Hotel'),
(v_board_id, 'San Nicolas', 'blue', 60, 4, 50, 200, 2, 'city', 'Capital Regia', 'Oxxo', 'Carnes Ramos', 'Piedrera', 'Cervecería', 'Hotel'),
(v_board_id, 'Escobedo', 'pink', 100, 6, 50, 200, 3, 'city', 'Corredor Industrial', 'Oxxo', 'Carnes Ramos', 'Piedrera', 'Cervecería', 'Hotel'),
(v_board_id, 'Apodaca', 'pink', 100, 6, 50, 200, 4, 'city', 'Corredor Industrial', 'Oxxo', 'Carnes Ramos', 'Piedrera', 'Cervecería', 'Hotel'),
(v_board_id, 'San Pedro Garza García', 'blue', 60, 6, 50, 200, 5, 'city', 'Capital Regia', 'Oxxo', 'Carnes Ramos', 'Piedrera', 'Cervecería', 'Hotel'),
(v_board_id, 'Santa Catarina', 'pink', 120, 8, 50, 200, 6, 'city', 'Corredor Industrial', 'Oxxo', 'Carnes Ramos', 'Piedrera', 'Cervecería', 'Hotel'),
(v_board_id, 'Guadalupe', 'blue', 80, 6, 50, 200, 7, 'city', 'Capital Regia', 'Oxxo', 'Carnes Ramos', 'Piedrera', 'Cervecería', 'Hotel'),
(v_board_id, 'Juarez', 'orange', 140, 10, 100, 300, 8, 'city', 'Tierras Nuevas', 'Oxxo', 'Carnes Ramos', 'Piedrera', 'Cervecería', 'Hotel'),
(v_board_id, 'Cadereyta', 'orange', 140, 10, 100, 300, 9, 'city', 'Tierras Nuevas', 'Oxxo', 'Carnes Ramos', 'Piedrera', 'Cervecería', 'Hotel')
ON CONFLICT (board_id, position) DO UPDATE SET monopoly_group = EXCLUDED.monopoly_group;

-- Casilla 10: Cárcel Topo Chico (especial)
INSERT INTO countries (board_id, name, continent, price, base_rent, house_price, hotel_price, position, property_type, improvement_level_1_name, improvement_level_2_name, improvement_level_3_name, improvement_level_4_name, improvement_level_5_name) VALUES
(v_board_id, 'Cárcel Topo Chico', 'special', 0, 0, 0, 0, 10, 'special', 'Casa', 'Casa', 'Casa', 'Casa', 'Hotel')
ON CONFLICT (board_id, position) DO NOTHING;

-- Lado izquierdo (posiciones 11-19): Más ciudades y estadios
-- Tierras Nuevas: García, Pesquería
-- Ruta Citrícola: Linares, Montemorelos, Santiago, Allende
INSERT INTO countries (board_id, name, continent, price, base_rent, house_price, hotel_price, position, property_type, monopoly_group, improvement_level_1_name, improvement_level_2_name, improvement_level_3_name, improvement_level_4_name, improvement_level_5_name) VALUES
(v_board_id, 'García', 'orange', 160, 12, 100, 300, 11, 'city', 'Tierras Nuevas', 'Oxxo', 'Carnes Ramos', 'Piedrera', 'Cervecería', 'Hotel'),
(v_board_id, 'Pesquería', 'orange', 160, 12, 100, 300, 12, 'city', 'Tierras Nuevas', 'Oxxo', 'Carnes Ramos', 'Piedrera', 'Cervecería', 'Hotel'),
(v_board_id, 'Linares', 'red', 180, 14, 100, 300, 13, 'city', 'Ruta Citrícola', 'Oxxo', 'Carnes Ramos', 'Piedrera', 'Cervecería', 'Hotel'),
(v_board_id, 'Montemorelos', 'red', 180, 14, 100, 300, 14, 'city', 'Ruta Citrícola', 'Oxxo', 'Carnes Ramos', 'Piedrera', 'Cervecería', 'Hotel'),
(v_board_id, 'Santiago', 'red', 200, 16, 100, 300, 15, 'city', 'Ruta Citrícola', 'Oxxo', 'Carnes Ramos', 'Piedrera', 'Cervecería', 'Hotel'),
(v_board_id, 'Allende', 'red', 200, 16, 100, 300, 16, 'city', 'Ruta Citrícola', 'Oxxo', 'Carnes Ramos', 'Piedrera', 'Cervecería', 'Hotel'),
(v_board_id, 'Tigres', 'yellow', 150, 0, 0, 0, 17, 'stadium', NULL, 'Casa', 'Casa', 'Casa', 'Casa', 'Hotel'),
(v_board_id, 'Rayados', 'yellow', 150, 0, 0, 0, 18, 'stadium', NULL, 'Casa', 'Casa', 'Casa', 'Casa', 'Hotel'),
(v_board_id, 'Sultanes', 'yellow', 200, 0, 0, 0, 19, 'stadium', NULL, 'Casa', 'Casa', 'Casa', 'Casa', 'Hotel')
ON CONFLICT (board_id, position) DO UPDATE SET monopoly_group = EXCLUDED.monopoly_group;

-- Casilla 20: Estacionamiento Gratuito / Casilla especial
INSERT INTO countries (board_id, name, continent, price, base_rent, house_price, hotel_price, position, property_type, improvement_level_1_name, improvement_level_2_name, improvement_level_3_name, improvement_level_4_name, improvement_level_5_name) VALUES
(v_board_id, 'Estacionamiento Gratuito', 'special', 0, 0, 0, 0, 20, 'special', 'Casa', 'Casa', 'Casa', 'Casa', 'Hotel')
ON CONFLICT (board_id, position) DO NOTHING;

-- Lado superior (posiciones 21-29): Atracciones Turísticas
INSERT INTO countries (board_id, name, continent, price, base_rent, house_price, hotel_price, position, property_type, improvement_level_1_name, improvement_level_2_name, improvement_level_3_name, improvement_level_4_name, improvement_level_5_name) VALUES
(v_board_id, 'Parque Fundidora', 'green', 220, 18, 0, 0, 21, 'attraction', 'Casa', 'Casa', 'Casa', 'Casa', 'Hotel'),
(v_board_id, 'Pueblo Mágico Santiago', 'green', 220, 18, 0, 0, 22, 'attraction', 'Casa', 'Casa', 'Casa', 'Casa', 'Hotel'),
(v_board_id, 'Barrio Antiguo', 'green', 240, 20, 0, 0, 23, 'attraction', 'Casa', 'Casa', 'Casa', 'Casa', 'Hotel'),
(v_board_id, 'Obispado Asta Bandera', 'green', 240, 20, 0, 0, 24, 'attraction', 'Casa', 'Casa', 'Casa', 'Casa', 'Hotel'),
(v_board_id, 'Macroplaza', 'green', 260, 22, 0, 0, 25, 'attraction', 'Casa', 'Casa', 'Casa', 'Casa', 'Hotel'),
(v_board_id, 'Museo de Historia', 'green', 260, 22, 0, 0, 26, 'attraction', 'Casa', 'Casa', 'Casa', 'Casa', 'Hotel'),
(v_board_id, 'Milarca', 'green', 280, 24, 0, 0, 27, 'attraction', 'Casa', 'Casa', 'Casa', 'Casa', 'Hotel'),
(v_board_id, 'Torre Rise', 'green', 280, 24, 0, 0, 28, 'attraction', 'Casa', 'Casa', 'Casa', 'Casa', 'Hotel'),
(v_board_id, 'Torre BBVA', 'green', 300, 26, 0, 0, 29, 'attraction', 'Casa', 'Casa', 'Casa', 'Casa', 'Hotel')
ON CONFLICT (board_id, position) DO NOTHING;

-- Casilla 30: Ir a Cárcel (especial)
INSERT INTO countries (board_id, name, continent, price, base_rent, house_price, hotel_price, position, property_type, improvement_level_1_name, improvement_level_2_name, improvement_level_3_name, improvement_level_4_name, improvement_level_5_name) VALUES
(v_board_id, 'Ir a Cárcel', 'special', 0, 0, 0, 0, 30, 'special', 'Casa', 'Casa', 'Casa', 'Casa', 'Hotel')
ON CONFLICT (board_id, position) DO NOTHING;

-- Lado derecho (posiciones 31-39): Más atracciones, transporte y servicios
INSERT INTO countries (board_id, name, continent, price, base_rent, house_price, hotel_price, position, property_type, improvement_level_1_name, improvement_level_2_name, improvement_level_3_name, improvement_level_4_name, improvement_level_5_name) VALUES
(v_board_id, 'Arena Monterrey', 'green', 300, 26, 0, 0, 31, 'attraction', 'Casa', 'Casa', 'Casa', 'Casa', 'Hotel'),
(v_board_id, 'Presa de la Boca', 'green', 320, 28, 0, 0, 32, 'attraction', 'Casa', 'Casa', 'Casa', 'Casa', 'Hotel'),
(v_board_id, 'Auditorio Pabellón M', 'green', 320, 28, 0, 0, 33, 'attraction', 'Casa', 'Casa', 'Casa', 'Casa', 'Hotel'),
(v_board_id, 'Fuerza Regia', 'yellow', 200, 0, 0, 0, 34, 'stadium', 'Casa', 'Casa', 'Casa', 'Casa', 'Hotel'),
(v_board_id, 'Cuauhtémoc', 'purple', 200, 25, 0, 0, 35, 'transport', 'Casa', 'Casa', 'Casa', 'Casa', 'Hotel'),
(v_board_id, 'Y Griega', 'purple', 200, 25, 0, 0, 36, 'transport', 'Casa', 'Casa', 'Casa', 'Casa', 'Hotel'),
(v_board_id, 'Alameda', 'purple', 200, 25, 0, 0, 37, 'transport', 'Casa', 'Casa', 'Casa', 'Casa', 'Hotel'),
(v_board_id, 'AyD', 'cyan', 150, 0, 0, 0, 38, 'service', 'Casa', 'Casa', 'Casa', 'Casa', 'Hotel'),
(v_board_id, 'CFE', 'cyan', 150, 0, 0, 0, 39, 'service', 'Casa', 'Casa', 'Casa', 'Casa', 'Hotel')
ON CONFLICT (board_id, position) DO NOTHING;

END $$;

