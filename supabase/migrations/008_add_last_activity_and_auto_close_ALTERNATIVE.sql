-- VERSIÓN ALTERNATIVA - Ejecutar paso por paso si la versión principal da error
-- 
-- PASO 1: Agregar campo last_activity
ALTER TABLE game_sessions 
ADD COLUMN IF NOT EXISTS last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- PASO 2: Crear función para actualizar actividad
CREATE OR REPLACE FUNCTION update_session_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $func$
BEGIN
  UPDATE game_sessions
  SET last_activity = NOW()
  WHERE id = NEW.session_id;
  RETURN NEW;
END;
$func$;

-- PASO 3: Crear triggers
DROP TRIGGER IF EXISTS update_activity_on_player_change ON session_players;
CREATE TRIGGER update_activity_on_player_change
  AFTER INSERT OR UPDATE OR DELETE ON session_players
  FOR EACH ROW
  EXECUTE FUNCTION update_session_activity();

DROP TRIGGER IF EXISTS update_activity_on_move ON game_moves;
CREATE TRIGGER update_activity_on_move
  AFTER INSERT ON game_moves
  FOR EACH ROW
  EXECUTE FUNCTION update_session_activity();

DROP TRIGGER IF EXISTS update_activity_on_country_change ON player_countries;
CREATE TRIGGER update_activity_on_country_change
  AFTER INSERT OR UPDATE OR DELETE ON player_countries
  FOR EACH ROW
  EXECUTE FUNCTION update_session_activity();

-- PASO 4: Crear función para cerrar partidas abandonadas
CREATE OR REPLACE FUNCTION close_abandoned_sessions()
RETURNS INTEGER
LANGUAGE plpgsql
AS $func$
DECLARE
  closed_count INTEGER := 0;
BEGIN
  -- Cerrar partidas waiting sin actividad por más de 1 hora
  UPDATE game_sessions
  SET status = 'finished', finished_at = NOW()
  WHERE status = 'waiting'
    AND last_activity < NOW() - INTERVAL '1 hour'
    AND finished_at IS NULL;
  
  GET DIAGNOSTICS closed_count = ROW_COUNT;
  
  -- Cerrar partidas active sin actividad por más de 2 horas
  UPDATE game_sessions
  SET status = 'finished', finished_at = NOW()
  WHERE status = 'active'
    AND last_activity < NOW() - INTERVAL '2 hours'
    AND finished_at IS NULL;
  
  GET DIAGNOSTICS closed_count = closed_count + ROW_COUNT;
  
  RETURN closed_count;
END;
$func$;

