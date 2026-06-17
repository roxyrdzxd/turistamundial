-- Pais de apoyo del usuario para mostrar bandera en rankings de Snake Mundial.

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS world_cup_country_code TEXT;

ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS profiles_world_cup_country_code_check;

ALTER TABLE profiles
ADD CONSTRAINT profiles_world_cup_country_code_check
CHECK (
  world_cup_country_code IS NULL OR
  world_cup_country_code IN (
    'MEX', 'RSA', 'KOR', 'CZE',
    'CAN', 'BIH', 'QAT', 'SUI',
    'BRA', 'MAR', 'HAI', 'SCO',
    'USA', 'PAR', 'AUS', 'TUR',
    'GER', 'CUW', 'CIV', 'ECU',
    'NED', 'JPN', 'SWE', 'TUN',
    'BEL', 'EGY', 'IRN', 'NZL',
    'ESP', 'CPV', 'KSA', 'URU',
    'FRA', 'SEN', 'IRQ', 'NOR',
    'ARG', 'ALG', 'AUT', 'JOR',
    'POR', 'COD', 'UZB', 'COL',
    'ENG', 'CRO', 'GHA', 'PAN'
  )
);

CREATE INDEX IF NOT EXISTS idx_profiles_world_cup_country_code
ON profiles(world_cup_country_code);

DROP FUNCTION IF EXISTS get_snake_leaderboard_by_mode(TEXT, INTEGER);

CREATE FUNCTION get_snake_leaderboard_by_mode(
  mode_filter TEXT DEFAULT 'arcade',
  limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
  rank BIGINT,
  user_id UUID,
  username TEXT,
  avatar_url TEXT,
  world_cup_country_code TEXT,
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
    p.world_cup_country_code,
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

DROP FUNCTION IF EXISTS get_current_snake_season_leaderboard_by_mode(TEXT, INTEGER);

CREATE FUNCTION get_current_snake_season_leaderboard_by_mode(
  mode_filter TEXT DEFAULT 'arcade',
  limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
  rank BIGINT,
  user_id UUID,
  username TEXT,
  avatar_url TEXT,
  world_cup_country_code TEXT,
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
    p.world_cup_country_code,
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
