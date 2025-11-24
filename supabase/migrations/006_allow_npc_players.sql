-- Permitir que los hosts agreguen NPCs a sus sesiones
-- Esta política permite que el host de una sesión inserte jugadores NPCs

-- Política que permite al host agregar cualquier jugador (incluyendo NPCs) 
-- a su sesión cuando está en estado 'waiting'
-- Usamos la función para acceder a los valores de la fila que se está insertando
DROP POLICY IF EXISTS "Hosts can add players to waiting sessions" ON session_players;
CREATE POLICY "Hosts can add players to waiting sessions"
  ON session_players FOR INSERT
  WITH CHECK (
    -- El usuario autenticado es el host de la sesión
    -- Y la sesión está en estado 'waiting'
    EXISTS (
      SELECT 1 FROM game_sessions 
      WHERE id = session_players.session_id 
      AND host_id = auth.uid()
      AND status = 'waiting'
    )
  );

