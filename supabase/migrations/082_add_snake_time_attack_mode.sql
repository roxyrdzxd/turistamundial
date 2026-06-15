-- Permite rankings independientes para el modo Contra Reloj.
-- Los puntajes historicos sin metadata.gameMode siguen contando como arcade.

CREATE OR REPLACE FUNCTION get_snake_leaderboard_by_mode(
  mode_filter TEXT DEFAULT 'arcade',
  limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
  rank BIGINT,
  user_id UUID,
  username TEXT,
  avatar_url TEXT,
  best_score INTEGER,
  games_played INTEGER,
  longest_snake INTEGER,
  best_level INTEGER,
  last_played_at TIMESTAMPTZ
) AS $$
DECLARE
  v_mode TEXT;
BEGIN
  v_mode := CASE
    WHEN mode_filter IN ('classic', 'arcade', 'timeAttack') THEN mode_filter
    ELSE 'arcade'
  END;

  RETURN QUERY
  WITH mode_scores AS (
    SELECT
      s.user_id,
      s.score,
      s.max_length,
      s.level_reached,
      s.created_at
    FROM snake_scores s
    WHERE COALESCE(NULLIF(s.metadata->>'gameMode', ''), 'arcade') = v_mode
      AND COALESCE((s.metadata->>'ranked')::BOOLEAN, TRUE) = TRUE
      AND s.score > 0
  ),
  player_best AS (
    SELECT
      ms.user_id,
      MAX(ms.score) AS best_score,
      COUNT(*)::INTEGER AS games_played,
      MAX(ms.max_length) AS longest_snake,
      MAX(ms.level_reached) AS best_level,
      MAX(ms.created_at) AS last_played_at
    FROM mode_scores ms
    GROUP BY ms.user_id
  )
  SELECT
    RANK() OVER (ORDER BY pb.best_score DESC, pb.last_played_at ASC) AS rank,
    pb.user_id,
    COALESCE(p.username, 'Usuario') AS username,
    p.avatar_url,
    pb.best_score,
    pb.games_played,
    pb.longest_snake,
    pb.best_level,
    pb.last_played_at
  FROM player_best pb
  LEFT JOIN profiles p ON p.id = pb.user_id
  ORDER BY pb.best_score DESC, pb.last_played_at ASC
  LIMIT LEAST(GREATEST(limit_count, 1), 100);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION get_current_snake_season_leaderboard_by_mode(
  mode_filter TEXT DEFAULT 'arcade',
  limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
  rank BIGINT,
  user_id UUID,
  username TEXT,
  avatar_url TEXT,
  best_score INTEGER,
  games_played INTEGER,
  longest_snake INTEGER,
  best_level INTEGER,
  last_played_at TIMESTAMPTZ
) AS $$
DECLARE
  v_season_id UUID;
  v_mode TEXT;
BEGIN
  v_season_id := ensure_current_snake_season();
  v_mode := CASE
    WHEN mode_filter IN ('classic', 'arcade', 'timeAttack') THEN mode_filter
    ELSE 'arcade'
  END;

  RETURN QUERY
  WITH mode_scores AS (
    SELECT
      s.user_id,
      s.score,
      s.max_length,
      s.level_reached,
      s.created_at
    FROM snake_scores s
    WHERE s.season_id = v_season_id
      AND COALESCE(NULLIF(s.metadata->>'gameMode', ''), 'arcade') = v_mode
      AND COALESCE((s.metadata->>'ranked')::BOOLEAN, TRUE) = TRUE
      AND s.score > 0
  ),
  player_best AS (
    SELECT
      ms.user_id,
      MAX(ms.score) AS best_score,
      COUNT(*)::INTEGER AS games_played,
      MAX(ms.max_length) AS longest_snake,
      MAX(ms.level_reached) AS best_level,
      MAX(ms.created_at) AS last_played_at
    FROM mode_scores ms
    GROUP BY ms.user_id
  )
  SELECT
    RANK() OVER (ORDER BY pb.best_score DESC, pb.last_played_at ASC) AS rank,
    pb.user_id,
    COALESCE(p.username, 'Usuario') AS username,
    p.avatar_url,
    pb.best_score,
    pb.games_played,
    pb.longest_snake,
    pb.best_level,
    pb.last_played_at
  FROM player_best pb
  LEFT JOIN profiles p ON p.id = pb.user_id
  ORDER BY pb.best_score DESC, pb.last_played_at ASC
  LIMIT LEAST(GREATEST(limit_count, 1), 100);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION get_snake_leaderboard_by_mode(TEXT, INTEGER) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_current_snake_season_leaderboard_by_mode(TEXT, INTEGER) TO authenticated, anon;
