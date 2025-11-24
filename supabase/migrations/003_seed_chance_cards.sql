-- Insert chance cards (Suerte/Destino)

-- Cartas de Suerte
INSERT INTO chance_cards (type, title, description, action_type, action_data) VALUES
('suerte', 'Ganaste un concurso', 'Has ganado $200 en un concurso de viajes', 'gain_money', '{"amount": 200}'),
('suerte', 'Herencia inesperada', 'Recibes $150 de una herencia', 'gain_money', '{"amount": 150}'),
('suerte', 'Reembolso de impuestos', 'El banco te devuelve $100', 'gain_money', '{"amount": 100}'),
('suerte', 'Cumpleaños', 'Recibe $50 de cada jugador', 'gain_from_players', '{"amount": 50}'),
('suerte', 'Viaje gratis', 'Avanza hasta el próximo aeropuerto', 'move_to_airport', '{}'),
('suerte', 'Sal de la cárcel', 'Puedes usar esta carta para salir de la cárcel', 'get_out_of_jail', '{}'),
('suerte', 'Multa de velocidad', 'Paga $50', 'lose_money', '{"amount": 50}'),
('suerte', 'Reparaciones', 'Paga $100 por reparaciones', 'lose_money', '{"amount": 100}'),
('suerte', 'Impuesto hospitalario', 'Paga $150', 'lose_money', '{"amount": 150}'),
('suerte', 'Ve a la cárcel', 'Ve directamente a la cárcel', 'go_to_jail', '{}'),

-- Cartas de Destino
('destino', 'Premio de lotería', 'Has ganado $300', 'gain_money', '{"amount": 300}'),
('destino', 'Inversión exitosa', 'Tu inversión te da $250', 'gain_money', '{"amount": 250}'),
('destino', 'Regalo de cumpleaños', 'Recibe $100 de cada jugador', 'gain_from_players', '{"amount": 100}'),
('destino', 'Avance rápido', 'Avanza 3 espacios', 'move', '{"spaces": 3}'),
('destino', 'Retroceso', 'Retrocede 2 espacios', 'move', '{"spaces": -2}'),
('destino', 'Viaje a cualquier país', 'Elige cualquier país para viajar', 'move_to_country', '{}'),
('destino', 'Multa por exceso de equipaje', 'Paga $75', 'lose_money', '{"amount": 75}'),
('destino', 'Gastos médicos', 'Paga $200', 'lose_money', '{"amount": 200}'),
('destino', 'Impuesto de lujo', 'Paga $100', 'lose_money', '{"amount": 100}'),
('destino', 'Ve a la cárcel', 'Ve directamente a la cárcel sin pasar por inicio', 'go_to_jail', '{}')
ON CONFLICT DO NOTHING;

