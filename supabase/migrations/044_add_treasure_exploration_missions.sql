-- Migración para agregar misiones de exploración y tesoros

-- Insertar misiones relacionadas con tesoros
INSERT INTO missions (title, description, type, reward_coins, requirement, is_active) VALUES
-- Logros (achievements)
('Explorador Novato', 'Recolecta 5 tesoros', 'achievement', 200, '{"action": "collect_treasure", "count": 5, "lifetime": true}'::jsonb, true),
('Cazador de Tesoros', 'Recolecta 25 tesoros', 'achievement', 500, '{"action": "collect_treasure", "count": 25, "lifetime": true}'::jsonb, true),
('Leyenda Urbana', 'Recolecta 100 tesoros', 'achievement', 2000, '{"action": "collect_treasure", "count": 100, "lifetime": true}'::jsonb, true),
('Coleccionista de Rarezas', 'Recolecta 5 tesoros raros o superiores', 'achievement', 800, '{"action": "collect_rare_treasure", "count": 5, "lifetime": true}'::jsonb, true),
('Buscador de Leyendas', 'Recolecta 3 tesoros legendarios', 'achievement', 1500, '{"action": "collect_legendary_treasure", "count": 3, "lifetime": true}'::jsonb, true),
-- Misiones diarias
('Buscador Diario', 'Recolecta 3 tesoros hoy', 'daily', 150, '{"action": "collect_treasure", "count": 3}'::jsonb, true),
('Explorador Matutino', 'Recolecta 1 tesoro antes del mediodía', 'daily', 100, '{"action": "collect_treasure_morning", "count": 1}'::jsonb, true),
-- Misiones semanales
('Explorador Semanal', 'Recolecta 10 tesoros esta semana', 'weekly', 400, '{"action": "collect_treasure", "count": 10}'::jsonb, true),
('Cazador Activo', 'Recolecta tesoros en 5 días diferentes esta semana', 'weekly', 500, '{"action": "collect_treasure_different_days", "count": 5}'::jsonb, true)
ON CONFLICT DO NOTHING;

-- Comentario
COMMENT ON TABLE missions IS 'Misiones incluyen ahora logros y desafíos de exploración de tesoros';
