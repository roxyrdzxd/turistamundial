-- Align game session capacity with the lobby flow, which supports 2 to 8 players.
ALTER TABLE game_sessions
DROP CONSTRAINT IF EXISTS game_sessions_max_players_check;

ALTER TABLE game_sessions
ADD CONSTRAINT game_sessions_max_players_check
CHECK (max_players >= 2 AND max_players <= 8);
