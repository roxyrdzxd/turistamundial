-- Agregar campo extra_turn para rastrear turnos extra del aeropuerto
ALTER TABLE session_players 
ADD COLUMN IF NOT EXISTS extra_turn BOOLEAN NOT NULL DEFAULT false;

-- Comentario para documentar el campo
COMMENT ON COLUMN session_players.extra_turn IS 
'Indica si el jugador tiene un turno extra por haber caído en el aeropuerto. Se resetea después de usar el turno extra.';

