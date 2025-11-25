-- Funciones para calcular rankings de jugadores

-- Función para obtener top jugadores por número de partidas
CREATE OR REPLACE FUNCTION get_top_players_by_games(limit_count INTEGER DEFAULT 5)
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  avatar_url TEXT,
  games_played BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id AS user_id,
    p.username,
    p.avatar_url,
    COUNT(DISTINCT sp.session_id) AS games_played
  FROM profiles p
  INNER JOIN session_players sp ON sp.user_id = p.id
  WHERE NOT sp.user_id::TEXT LIKE 'npc-%'
  GROUP BY p.id, p.username, p.avatar_url
  ORDER BY games_played DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener top jugadores por victorias
CREATE OR REPLACE FUNCTION get_top_players_by_wins(limit_count INTEGER DEFAULT 5)
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  avatar_url TEXT,
  wins BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id AS user_id,
    p.username,
    p.avatar_url,
    COUNT(*) AS wins
  FROM profiles p
  INNER JOIN user_missions um ON um.user_id = p.id
  INNER JOIN missions m ON m.id = um.mission_id
  WHERE m.requirement->>'action' = 'win_game'
    AND um.completed_at IS NOT NULL
  GROUP BY p.id, p.username, p.avatar_url
  ORDER BY wins DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener top jugadores por número de amigos
CREATE OR REPLACE FUNCTION get_top_players_by_friends(limit_count INTEGER DEFAULT 5)
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  avatar_url TEXT,
  friends_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id AS user_id,
    p.username,
    p.avatar_url,
    COUNT(*) AS friends_count
  FROM profiles p
  LEFT JOIN friendships f ON (f.user1_id = p.id OR f.user2_id = p.id)
  GROUP BY p.id, p.username, p.avatar_url
  HAVING COUNT(*) > 0
  ORDER BY friends_count DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener top jugadores por ratio de victorias
CREATE OR REPLACE FUNCTION get_top_players_by_win_rate(limit_count INTEGER DEFAULT 5, min_games INTEGER DEFAULT 5)
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  avatar_url TEXT,
  win_rate NUMERIC,
  total_games BIGINT,
  total_wins BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH player_stats AS (
    SELECT 
      p.id AS user_id,
      p.username,
      p.avatar_url,
      COUNT(DISTINCT sp.session_id) AS total_games,
      COALESCE(win_counts.wins, 0) AS total_wins
    FROM profiles p
    INNER JOIN session_players sp ON sp.user_id = p.id
    LEFT JOIN (
      SELECT 
        um.user_id,
        COUNT(*) AS wins
      FROM user_missions um
      INNER JOIN missions m ON m.id = um.mission_id
      WHERE m.requirement->>'action' = 'win_game'
        AND um.completed_at IS NOT NULL
      GROUP BY um.user_id
    ) win_counts ON win_counts.user_id = p.id
    WHERE NOT sp.user_id::TEXT LIKE 'npc-%'
    GROUP BY p.id, p.username, p.avatar_url, win_counts.wins
    HAVING COUNT(DISTINCT sp.session_id) >= min_games
  )
  SELECT 
    ps.user_id,
    ps.username,
    ps.avatar_url,
    CASE 
      WHEN ps.total_games > 0 THEN (ps.total_wins::NUMERIC / ps.total_games::NUMERIC)
      ELSE 0
    END AS win_rate,
    ps.total_games,
    ps.total_wins
  FROM player_stats ps
  ORDER BY win_rate DESC, ps.total_wins DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

