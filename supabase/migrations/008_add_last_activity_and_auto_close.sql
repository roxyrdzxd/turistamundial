-- Agregar campo last_activity para rastrear la última actividad en la partida
ALTER TABLE game_sessions 
ADD COLUMN IF NOT EXISTS last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Actualizar last_activity cuando se crea una sesión
CREATE OR REPLACE FUNCTION update_session_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
BEGIN
  UPDATE game_sessions
  SET last_activity = NOW()
  WHERE id = NEW.session_id;
  RETURN NEW;
END;
$function$;

-- Trigger para actualizar last_activity cuando hay actividad en la partida
-- (se activa cuando hay cambios en session_players, player_countries, o game_moves)
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

-- Función para cerrar partidas abandonadas automáticamente
-- Cierra partidas que no han tenido actividad en las últimas 2 horas
CREATE OR REPLACE FUNCTION close_abandoned_sessions()
RETURNS INTEGER
LANGUAGE plpgsql
AS $function$
DECLARE
  closed_count INTEGER := 0;
  active_closed INTEGER := 0;
BEGIN
  -- Cerrar partidas 'waiting' sin actividad por más de 1 hora
  UPDATE game_sessions
  SET 
    status = 'finished',
    finished_at = NOW()
  WHERE status = 'waiting'
    AND last_activity < NOW() - INTERVAL '1 hour'
    AND finished_at IS NULL;
  
  GET DIAGNOSTICS closed_count = ROW_COUNT;
  
  -- Cerrar partidas 'active' sin actividad por más de 2 horas
  UPDATE game_sessions
  SET 
    status = 'finished',
    finished_at = NOW()
  WHERE status = 'active'
    AND last_activity < NOW() - INTERVAL '2 hours'
    AND finished_at IS NULL;
  
  GET DIAGNOSTICS active_closed = ROW_COUNT;
  closed_count := closed_count + active_closed;
  
  RETURN closed_count;
END;
$function$;

-- Comentario sobre cómo ejecutar automáticamente
COMMENT ON FUNCTION close_abandoned_sessions() IS 
'Cierra partidas abandonadas. Ejecutar con pg_cron o manualmente cada hora. 
Para configurar pg_cron: SELECT cron.schedule(''close-abandoned-sessions'', ''0 * * * *'', ''SELECT close_abandoned_sessions();'');';

