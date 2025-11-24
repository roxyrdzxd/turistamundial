-- Insert countries data (Turista Mundial board)
-- This is a simplified version - you can expand with all countries

INSERT INTO countries (name, continent, price, base_rent, house_price, hotel_price, position) VALUES
-- Continente Azul (América del Norte)
('Vancouver', 'blue', 60, 2, 50, 200, 1),
('Seattle', 'blue', 60, 4, 50, 200, 3),
('San Francisco', 'blue', 200, 6, 50, 200, 6),
('Los Angeles', 'blue', 200, 6, 50, 200, 8),
('Las Vegas', 'blue', 180, 14, 100, 300, 9),
('Chicago', 'blue', 180, 14, 100, 300, 11),
('New York', 'blue', 220, 18, 100, 300, 13),
('Miami', 'blue', 220, 18, 100, 300, 14),

-- Continente Rosa (Europa)
('Londres', 'pink', 100, 6, 50, 200, 16),
('París', 'pink', 100, 6, 50, 200, 18),
('Roma', 'pink', 120, 8, 50, 200, 19),
('Madrid', 'pink', 120, 8, 50, 200, 21),
('Berlín', 'pink', 140, 10, 100, 300, 23),
('Ámsterdam', 'pink', 140, 10, 100, 300, 24),

-- Continente Naranja (Asia)
('Tokio', 'orange', 160, 12, 100, 300, 26),
('Seúl', 'orange', 160, 12, 100, 300, 27),
('Hong Kong', 'orange', 180, 14, 100, 300, 29),
('Singapur', 'orange', 180, 14, 100, 300, 31),
('Bangkok', 'orange', 200, 16, 100, 300, 32),
('Bombay', 'orange', 200, 16, 100, 300, 34),

-- Continente Rojo (América del Sur)
('Buenos Aires', 'red', 220, 18, 150, 450, 37),
('Río de Janeiro', 'red', 220, 18, 150, 450, 39),
('Santiago', 'red', 240, 20, 150, 450, 5),
('Lima', 'red', 240, 20, 150, 450, 7),

-- Continente Amarillo (África)
('El Cairo', 'yellow', 260, 22, 150, 450, 12),
('Johannesburgo', 'yellow', 260, 22, 150, 450, 15),
('Casablanca', 'yellow', 280, 24, 150, 450, 17),
('Lagos', 'yellow', 280, 24, 150, 450, 20),

-- Continente Verde (Oceanía)
('Sídney', 'green', 300, 26, 200, 600, 22),
('Melbourne', 'green', 300, 26, 200, 600, 25),
('Auckland', 'green', 320, 28, 200, 600, 28),
('Honolulu', 'green', 320, 28, 200, 600, 30),

-- Continente Morado (Especiales - más caros)
('Dubái', 'purple', 350, 35, 200, 600, 33),
('Moscú', 'purple', 350, 35, 200, 600, 35),
('Pekín', 'purple', 400, 50, 200, 600, 36),
('Shanghái', 'purple', 400, 50, 200, 600, 38)
ON CONFLICT (position) DO NOTHING;

