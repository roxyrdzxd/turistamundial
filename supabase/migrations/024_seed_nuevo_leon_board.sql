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
(v_board_id, 'Tigres', 'yellow', 150, 0, 0, 0, 17, 'stadium', 'Atracciones deportivas', 'Casa', 'Casa', 'Casa', 'Casa', 'Hotel'),
(v_board_id, 'Rayados', 'yellow', 150, 0, 0, 0, 18, 'stadium', 'Atracciones deportivas', 'Casa', 'Casa', 'Casa', 'Casa', 'Hotel'),
(v_board_id, 'Sultanes', 'yellow', 200, 0, 0, 0, 19, 'stadium', 'Atracciones deportivas', 'Casa', 'Casa', 'Casa', 'Casa', 'Hotel')
ON CONFLICT (board_id, position) DO UPDATE SET monopoly_group = EXCLUDED.monopoly_group;

-- Casilla 20: Aeropuerto Internacional (Transporte)
INSERT INTO countries (board_id, name, continent, price, base_rent, house_price, hotel_price, position, property_type, monopoly_group, improvement_level_1_name, improvement_level_2_name, improvement_level_3_name, improvement_level_4_name, improvement_level_5_name) VALUES
(v_board_id, 'Aeropuerto Internacional', 'purple', 200, 25, 0, 0, 20, 'transport', 'Transporte', 'Casa', 'Casa', 'Casa', 'Casa', 'Hotel')
ON CONFLICT (board_id, position) DO UPDATE SET monopoly_group = EXCLUDED.monopoly_group, property_type = EXCLUDED.property_type, name = EXCLUDED.name;

-- Lado superior (posiciones 21-29): Atracciones Turísticas
-- Grupo: Atracciones Turísticas
INSERT INTO countries (board_id, name, continent, price, base_rent, house_price, hotel_price, position, property_type, monopoly_group, improvement_level_1_name, improvement_level_2_name, improvement_level_3_name, improvement_level_4_name, improvement_level_5_name) VALUES
(v_board_id, 'Parque Fundidora', 'green', 220, 18, 0, 0, 21, 'attraction', 'Atracciones Turísticas', 'Casa', 'Casa', 'Casa', 'Casa', 'Hotel'),
(v_board_id, 'Pueblo Mágico Santiago', 'green', 220, 18, 0, 0, 22, 'attraction', 'Atracciones Turísticas', 'Casa', 'Casa', 'Casa', 'Casa', 'Hotel'),
(v_board_id, 'Barrio Antiguo', 'green', 240, 20, 0, 0, 23, 'attraction', 'Atracciones Turísticas', 'Casa', 'Casa', 'Casa', 'Casa', 'Hotel'),
(v_board_id, 'Obispado Asta Bandera', 'green', 240, 20, 0, 0, 24, 'attraction', 'Atracciones Turísticas', 'Casa', 'Casa', 'Casa', 'Casa', 'Hotel'),
(v_board_id, 'Macroplaza', 'green', 260, 22, 0, 0, 25, 'attraction', 'Atracciones Turísticas', 'Casa', 'Casa', 'Casa', 'Casa', 'Hotel'),
(v_board_id, 'Museo de Historia', 'green', 260, 22, 0, 0, 26, 'attraction', 'Atracciones Turísticas', 'Casa', 'Casa', 'Casa', 'Casa', 'Hotel'),
(v_board_id, 'Milarca', 'green', 280, 24, 0, 0, 27, 'attraction', 'Atracciones Turísticas', 'Casa', 'Casa', 'Casa', 'Casa', 'Hotel'),
(v_board_id, 'Torre Rise', 'green', 280, 24, 0, 0, 28, 'attraction', 'Atracciones Turísticas', 'Casa', 'Casa', 'Casa', 'Casa', 'Hotel'),
(v_board_id, 'Torre BBVA', 'green', 300, 26, 0, 0, 29, 'attraction', 'Atracciones Turísticas', 'Casa', 'Casa', 'Casa', 'Casa', 'Hotel')
ON CONFLICT (board_id, position) DO UPDATE SET monopoly_group = EXCLUDED.monopoly_group;

-- Casilla 30: Ir a Cárcel (especial)
INSERT INTO countries (board_id, name, continent, price, base_rent, house_price, hotel_price, position, property_type, improvement_level_1_name, improvement_level_2_name, improvement_level_3_name, improvement_level_4_name, improvement_level_5_name) VALUES
(v_board_id, 'Ir a Cárcel', 'special', 0, 0, 0, 0, 30, 'special', 'Casa', 'Casa', 'Casa', 'Casa', 'Hotel')
ON CONFLICT (board_id, position) DO NOTHING;

-- Lado derecho (posiciones 31-39): Más atracciones, transporte y servicios
-- Grupo: Atracciones Turísticas (continuación)
-- Grupo: Transporte
INSERT INTO countries (board_id, name, continent, price, base_rent, house_price, hotel_price, position, property_type, monopoly_group, improvement_level_1_name, improvement_level_2_name, improvement_level_3_name, improvement_level_4_name, improvement_level_5_name) VALUES
(v_board_id, 'Arena Monterrey', 'green', 300, 26, 0, 0, 31, 'attraction', 'Atracciones Turísticas', 'Casa', 'Casa', 'Casa', 'Casa', 'Hotel'),
(v_board_id, 'Presa de la Boca', 'green', 320, 28, 0, 0, 32, 'attraction', 'Atracciones Turísticas', 'Casa', 'Casa', 'Casa', 'Casa', 'Hotel'),
(v_board_id, 'Auditorio Pabellón M', 'green', 320, 28, 0, 0, 33, 'attraction', 'Atracciones Turísticas', 'Casa', 'Casa', 'Casa', 'Casa', 'Hotel'),
(v_board_id, 'Fuerza Regia', 'yellow', 200, 0, 0, 0, 34, 'stadium', 'Atracciones deportivas', 'Casa', 'Casa', 'Casa', 'Casa', 'Hotel'),
(v_board_id, 'Cuauhtémoc', 'purple', 200, 25, 0, 0, 35, 'transport', 'Transporte', 'Casa', 'Casa', 'Casa', 'Casa', 'Hotel'),
(v_board_id, 'Y Griega', 'purple', 200, 25, 0, 0, 36, 'transport', 'Transporte', 'Casa', 'Casa', 'Casa', 'Casa', 'Hotel'),
(v_board_id, 'Alameda', 'purple', 200, 25, 0, 0, 37, 'transport', 'Transporte', 'Casa', 'Casa', 'Casa', 'Casa', 'Hotel'),
(v_board_id, 'Exposición', 'purple', 200, 25, 0, 0, 38, 'transport', 'Transporte', 'Casa', 'Casa', 'Casa', 'Casa', 'Hotel'),
(v_board_id, 'San Bernabé', 'purple', 200, 25, 0, 0, 39, 'transport', 'Transporte', 'Casa', 'Casa', 'Casa', 'Casa', 'Hotel')
ON CONFLICT (board_id, position) DO UPDATE SET monopoly_group = EXCLUDED.monopoly_group;

-- Servicios (AyD y CFE) - Se pueden agregar después si se necesitan
-- Por ahora no están en el tablero principal de 40 casillas

END $$;



































-- Insertar propiedades del tablero "Turista Stranger Things"
-- Tablero con 40 casillas basado en lugares y elementos de Stranger Things

-- ID del tablero Stranger Things
DO $$
DECLARE
  v_board_id UUID := '00000000-0000-0000-0000-000000000003';
BEGIN

-- Primero crear el tablero en la tabla boards
INSERT INTO boards (id, name, description, is_active) VALUES
(v_board_id, 'Turista Stranger Things', 'Tablero temático basado en la serie Stranger Things', true)
ON CONFLICT (name) DO UPDATE SET is_active = true;

-- Casilla 0: Inicio (especial, no se compra)
INSERT INTO countries (board_id, name, continent, price, base_rent, house_price, hotel_price, position, property_type, improvement_level_1_name, improvement_level_2_name, improvement_level_3_name, improvement_level_4_name, improvement_level_5_name) VALUES
(v_board_id, 'Inicio', 'special', 0, 0, 0, 0, 0, 'special', 'Casa', 'Casa', 'Casa', 'Casa', 'Hotel')
ON CONFLICT (board_id, position) DO NOTHING;

-- Lado inferior (posiciones 1-9): Lugares de Hawkins
-- Monopolio: Hawkins
INSERT INTO countries (board_id, name, continent, price, base_rent, house_price, hotel_price, position, property_type, monopoly_group, improvement_level_1_name, improvement_level_2_name, improvement_level_3_name, improvement_level_4_name, improvement_level_5_name) VALUES
(v_board_id, 'Casa Byers', 'blue', 60, 2, 50, 200, 1, 'city', 'Hawkins', 'Investigación', 'Equipo', 'Base Secreta', 'Portal', 'Fortaleza'),
(v_board_id, 'Casa Wheeler', 'blue', 60, 4, 50, 200, 2, 'city', 'Hawkins', 'Investigación', 'Equipo', 'Base Secreta', 'Portal', 'Fortaleza'),
(v_board_id, 'Starcourt Mall', 'pink', 100, 6, 50, 200, 3, 'city', 'Hawkins', 'Investigación', 'Equipo', 'Base Secreta', 'Portal', 'Fortaleza'),
(v_board_id, 'Biblioteca Hawkins', 'pink', 100, 6, 50, 200, 4, 'city', 'Hawkins', 'Investigación', 'Equipo', 'Base Secreta', 'Portal', 'Fortaleza'),
(v_board_id, 'Casa Henderson', 'blue', 60, 6, 50, 200, 5, 'city', 'Hawkins', 'Investigación', 'Equipo', 'Base Secreta', 'Portal', 'Fortaleza'),
(v_board_id, 'Escuela Hawkins', 'pink', 120, 8, 50, 200, 6, 'city', 'Hawkins', 'Investigación', 'Equipo', 'Base Secreta', 'Portal', 'Fortaleza'),
(v_board_id, 'Casa Sinclair', 'blue', 80, 6, 50, 200, 7, 'city', 'Hawkins', 'Investigación', 'Equipo', 'Base Secreta', 'Portal', 'Fortaleza'),
(v_board_id, 'Casa Harrington', 'orange', 140, 10, 100, 300, 8, 'city', 'Hawkins', 'Investigación', 'Equipo', 'Base Secreta', 'Portal', 'Fortaleza'),
(v_board_id, 'Casa Buckley', 'orange', 140, 10, 100, 300, 9, 'city', 'Hawkins', 'Investigación', 'Equipo', 'Base Secreta', 'Portal', 'Fortaleza')
ON CONFLICT (board_id, position) DO UPDATE SET monopoly_group = EXCLUDED.monopoly_group;

-- Casilla 10: Laboratorio Secuestro (Cárcel)
INSERT INTO countries (board_id, name, continent, price, base_rent, house_price, hotel_price, position, property_type, improvement_level_1_name, improvement_level_2_name, improvement_level_3_name, improvement_level_4_name, improvement_level_5_name) VALUES
(v_board_id, 'Laboratorio Secuestro', 'special', 0, 0, 0, 0, 10, 'special', 'Casa', 'Casa', 'Casa', 'Casa', 'Hotel')
ON CONFLICT (board_id, position) DO NOTHING;

-- Lado izquierdo (posiciones 11-19): El Upside Down
-- Monopolio: El Upside Down
INSERT INTO countries (board_id, name, continent, price, base_rent, house_price, hotel_price, position, property_type, monopoly_group, improvement_level_1_name, improvement_level_2_name, improvement_level_3_name, improvement_level_4_name, improvement_level_5_name) VALUES
(v_board_id, 'Upside Down Byers', 'orange', 160, 12, 100, 300, 11, 'city', 'El Upside Down', 'Investigación', 'Equipo', 'Base Secreta', 'Portal', 'Fortaleza'),
(v_board_id, 'Upside Down Wheeler', 'orange', 160, 12, 100, 300, 12, 'city', 'El Upside Down', 'Investigación', 'Equipo', 'Base Secreta', 'Portal', 'Fortaleza'),
(v_board_id, 'Nido del Demogorgon', 'red', 180, 14, 100, 300, 13, 'city', 'El Upside Down', 'Investigación', 'Equipo', 'Base Secreta', 'Portal', 'Fortaleza'),
(v_board_id, 'Portal del Árbol', 'red', 180, 14, 100, 300, 14, 'city', 'El Upside Down', 'Investigación', 'Equipo', 'Base Secreta', 'Portal', 'Fortaleza'),
(v_board_id, 'Castillo de Vecna', 'red', 200, 16, 100, 300, 15, 'city', 'El Upside Down', 'Investigación', 'Equipo', 'Base Secreta', 'Portal', 'Fortaleza'),
(v_board_id, 'Mind Flayer Nest', 'red', 200, 16, 100, 300, 16, 'city', 'El Upside Down', 'Investigación', 'Equipo', 'Base Secreta', 'Portal', 'Fortaleza'),
(v_board_id, 'Portal Starcourt', 'yellow', 150, 0, 0, 0, 17, 'attraction', 'Dimensiones Paralelas', 'Casa', 'Casa', 'Casa', 'Casa', 'Hotel'),
(v_board_id, 'Portal Laboratorio', 'yellow', 150, 0, 0, 0, 18, 'attraction', 'Dimensiones Paralelas', 'Casa', 'Casa', 'Casa', 'Casa', 'Hotel'),
(v_board_id, 'Portal Lago', 'yellow', 200, 0, 0, 0, 19, 'attraction', 'Dimensiones Paralelas', 'Casa', 'Casa', 'Casa', 'Casa', 'Hotel')
ON CONFLICT (board_id, position) DO UPDATE SET monopoly_group = EXCLUDED.monopoly_group;

-- Casilla 20: Día Libre (Estacionamiento Gratuito)
INSERT INTO countries (board_id, name, continent, price, base_rent, house_price, hotel_price, position, property_type, improvement_level_1_name, improvement_level_2_name, improvement_level_3_name, improvement_level_4_name, improvement_level_5_name) VALUES
(v_board_id, 'Día Libre', 'special', 0, 0, 0, 0, 20, 'special', 'Casa', 'Casa', 'Casa', 'Casa', 'Hotel')
ON CONFLICT (board_id, position) DO NOTHING;

-- Lado superior (posiciones 21-29): Laboratorio Hawkins
-- Monopolio: Laboratorio Hawkins
INSERT INTO countries (board_id, name, continent, price, base_rent, house_price, hotel_price, position, property_type, monopoly_group, improvement_level_1_name, improvement_level_2_name, improvement_level_3_name, improvement_level_4_name, improvement_level_5_name) VALUES
(v_board_id, 'Entrada Laboratorio', 'green', 220, 18, 0, 0, 21, 'attraction', 'Laboratorio Hawkins', 'Casa', 'Casa', 'Casa', 'Casa', 'Hotel'),
(v_board_id, 'Sala de Control', 'green', 220, 18, 0, 0, 22, 'attraction', 'Laboratorio Hawkins', 'Casa', 'Casa', 'Casa', 'Casa', 'Hotel'),
(v_board_id, 'Sector 7', 'green', 240, 20, 0, 0, 23, 'attraction', 'Laboratorio Hawkins', 'Casa', 'Casa', 'Casa', 'Casa', 'Hotel'),
(v_board_id, 'Cámara de Eleven', 'green', 240, 20, 0, 0, 24, 'attraction', 'Laboratorio Hawkins', 'Casa', 'Casa', 'Casa', 'Casa', 'Hotel'),
(v_board_id, 'Portal Principal', 'green', 260, 22, 0, 0, 25, 'attraction', 'Laboratorio Hawkins', 'Casa', 'Casa', 'Casa', 'Casa', 'Hotel'),
(v_board_id, 'Sala de Experimentos', 'green', 260, 22, 0, 0, 26, 'attraction', 'Laboratorio Hawkins', 'Casa', 'Casa', 'Casa', 'Casa', 'Hotel'),
(v_board_id, 'Búnker Secreto', 'green', 280, 24, 0, 0, 27, 'attraction', 'Laboratorio Hawkins', 'Casa', 'Casa', 'Casa', 'Casa', 'Hotel'),
(v_board_id, 'Torre de Vigilancia', 'green', 280, 24, 0, 0, 28, 'attraction', 'Laboratorio Hawkins', 'Casa', 'Casa', 'Casa', 'Casa', 'Hotel'),
(v_board_id, 'Núcleo del Portal', 'green', 300, 26, 0, 0, 29, 'attraction', 'Laboratorio Hawkins', 'Casa', 'Casa', 'Casa', 'Casa', 'Hotel')
ON CONFLICT (board_id, position) DO UPDATE SET monopoly_group = EXCLUDED.monopoly_group;

-- Casilla 30: Atrapado en el Upside Down (Ir a Cárcel)
INSERT INTO countries (board_id, name, continent, price, base_rent, house_price, hotel_price, position, property_type, improvement_level_1_name, improvement_level_2_name, improvement_level_3_name, improvement_level_4_name, improvement_level_5_name) VALUES
(v_board_id, 'Atrapado en el Upside Down', 'special', 0, 0, 0, 0, 30, 'special', 'Casa', 'Casa', 'Casa', 'Casa', 'Hotel')
ON CONFLICT (board_id, position) DO NOTHING;

-- Lado derecho (posiciones 31-39): Más lugares y transporte
-- Grupo: Dimensiones Paralelas (continuación)
-- Grupo: Transporte
INSERT INTO countries (board_id, name, continent, price, base_rent, house_price, hotel_price, position, property_type, monopoly_group, improvement_level_1_name, improvement_level_2_name, improvement_level_3_name, improvement_level_4_name, improvement_level_5_name) VALUES
(v_board_id, 'Portal Ruso', 'green', 300, 26, 0, 0, 31, 'attraction', 'Dimensiones Paralelas', 'Casa', 'Casa', 'Casa', 'Casa', 'Hotel'),
(v_board_id, 'Portal de Vecna', 'green', 320, 28, 0, 0, 32, 'attraction', 'Dimensiones Paralelas', 'Casa', 'Casa', 'Casa', 'Casa', 'Hotel'),
(v_board_id, 'Portal de Max', 'green', 320, 28, 0, 0, 33, 'attraction', 'Dimensiones Paralelas', 'Casa', 'Casa', 'Casa', 'Casa', 'Hotel'),
(v_board_id, 'Bicicletas', 'purple', 200, 25, 0, 0, 34, 'transport', 'Transporte', 'Casa', 'Casa', 'Casa', 'Casa', 'Hotel'),
(v_board_id, 'Camioneta de Joyce', 'purple', 200, 25, 0, 0, 35, 'transport', 'Transporte', 'Casa', 'Casa', 'Casa', 'Casa', 'Hotel'),
(v_board_id, 'Auto de Hopper', 'purple', 200, 25, 0, 0, 36, 'transport', 'Transporte', 'Casa', 'Casa', 'Casa', 'Casa', 'Hotel'),
(v_board_id, 'Portal del Upside Down', 'purple', 200, 25, 0, 0, 37, 'transport', 'Transporte', 'Casa', 'Casa', 'Casa', 'Casa', 'Hotel'),
(v_board_id, 'Servicios Públicos', 'gray', 150, 0, 0, 0, 38, 'service', 'Servicios', 'Casa', 'Casa', 'Casa', 'Casa', 'Hotel'),
(v_board_id, 'Servicios Especiales', 'gray', 150, 0, 0, 0, 39, 'service', 'Servicios', 'Casa', 'Casa', 'Casa', 'Casa', 'Hotel')
ON CONFLICT (board_id, position) DO UPDATE SET monopoly_group = EXCLUDED.monopoly_group;

END $$;