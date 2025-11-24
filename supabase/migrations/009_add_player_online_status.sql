-- Agregar campos para rastrear el estado de conexión de los jugadores
ALTER TABLE session_players 
ADD COLUMN IF NOT EXISTS is_online BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE session_players 
ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Crear índice para búsquedas rápidas de jugadores online
CREATE INDEX IF NOT EXISTS idx_session_players_online ON session_players(session_id, is_online);

-- Función para actualizar last_seen cuando un jugador hace ping
CREATE OR REPLACE FUNCTION update_player_last_seen()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $func$
BEGIN
  -- Actualizar last_seen cuando se actualiza is_online a true
  IF NEW.is_online = true AND (OLD.is_online IS NULL OR OLD.is_online = false) THEN
    NEW.last_seen = NOW();
  END IF;
  RETURN NEW;
END;
$func$;

-- Trigger para actualizar last_seen automáticamente
DROP TRIGGER IF EXISTS update_last_seen_on_online ON session_players;
CREATE TRIGGER update_last_seen_on_online
  BEFORE UPDATE ON session_players
  FOR EACH ROW
  WHEN (NEW.is_online IS DISTINCT FROM OLD.is_online)
  EXECUTE FUNCTION update_player_last_seen();

-- Función para marcar jugadores como desconectados si no han hecho ping en 2 minutos
CREATE OR REPLACE FUNCTION mark_disconnected_players()
RETURNS INTEGER
LANGUAGE plpgsql
AS $func$
DECLARE
  marked_count INTEGER := 0;
BEGIN
  -- Marcar como desconectados jugadores que no han hecho ping en 2 minutos
  -- Excluir NPCs verificando si el user_id convertido a texto empieza con 'npc-'
  UPDATE session_players
  SET is_online = false
  WHERE is_online = true
    AND last_seen < NOW() - INTERVAL '2 minutes'
    AND user_id::text NOT LIKE 'npc-%'; -- Convertir UUID a texto para comparar
  
  GET DIAGNOSTICS marked_count = ROW_COUNT;
  
  RETURN marked_count;
END;
$func$;

COMMENT ON FUNCTION mark_disconnected_players() IS 
'Marca jugadores como desconectados si no han hecho ping en 2 minutos. 
Ejecutar periódicamente (cada minuto) con pg_cron o manualmente.';

