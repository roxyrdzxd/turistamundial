-- Temporadas semanales para Snake Mundial

CREATE TABLE IF NOT EXISTS snake_seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  champion_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  champion_score INTEGER
);

CREATE INDEX IF NOT EXISTS idx_snake_seasons_status_dates
  ON snake_seasons (status, starts_at DESC, ends_at DESC);

ALTER TABLE snake_scores
  ADD COLUMN IF NOT EXISTS season_id UUID REFERENCES snake_seasons(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_snake_scores_season_score
  ON snake_scores (season_id, score DESC, created_at ASC);

CREATE TABLE IF NOT EXISTS snake_season_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES snake_seasons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  best_score INTEGER NOT NULL DEFAULT 0,
  best_score_id UUID REFERENCES snake_scores(id) ON DELETE SET NULL,
  games_played INTEGER NOT NULL DEFAULT 0,
  total_score BIGINT NOT NULL DEFAULT 0,
  total_food INTEGER NOT NULL DEFAULT 0,
  longest_snake INTEGER NOT NULL DEFAULT 3,
  best_level INTEGER NOT NULL DEFAULT 1,
  last_played_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (season_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_snake_season_entries_rank
  ON snake_season_entries (season_id, best_score DESC, last_played_at ASC);

ALTER TABLE snake_seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE snake_season_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Snake seasons are public readable" ON snake_seasons;
CREATE POLICY "Snake seasons are public readable"
  ON snake_seasons FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Snake season entries are public readable" ON snake_season_entries;
CREATE POLICY "Snake season entries are public readable"
  ON snake_season_entries FOR SELECT
  USING (true);

CREATE OR REPLACE FUNCTION ensure_current_snake_season()
RETURNS UUID AS $$
DECLARE
  v_start TIMESTAMPTZ;
  v_end TIMESTAMPTZ;
  v_slug TEXT;
  v_title TEXT;
  v_season_id UUID;
BEGIN
  v_start := date_trunc('week', NOW() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
  v_end := v_start + INTERVAL '7 days';
  v_slug := 'snake-' || to_char(v_start, 'IYYY-"w"IW');
  v_title := 'Temporada ' || to_char(v_start, 'IYYY-"W"IW');

  UPDATE snake_seasons
  SET
    status = 'closed',
    closed_at = COALESCE(closed_at, NOW())
  WHERE status = 'active'
    AND ends_at <= NOW();

  INSERT INTO snake_seasons (slug, title, status, starts_at, ends_at)
  VALUES (v_slug, v_title, 'active', v_start, v_end)
  ON CONFLICT (slug) DO UPDATE SET
    status = CASE
      WHEN snake_seasons.ends_at <= NOW() THEN 'closed'
      ELSE 'active'
    END
  RETURNING id INTO v_season_id;

  RETURN v_season_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION refresh_snake_season_champions()
RETURNS VOID AS $$
BEGIN
  WITH winners AS (
    SELECT DISTINCT ON (sse.season_id)
      sse.season_id,
      sse.user_id,
      sse.best_score
    FROM snake_season_entries sse
    INNER JOIN snake_seasons ss ON ss.id = sse.season_id
    WHERE ss.status = 'closed'
    ORDER BY sse.season_id, sse.best_score DESC, sse.last_played_at ASC
  )
  UPDATE snake_seasons ss
  SET
    champion_user_id = winners.user_id,
    champion_score = winners.best_score
  FROM winners
  WHERE ss.id = winners.season_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION record_snake_score(
  p_score INTEGER,
  p_duration_ms INTEGER,
  p_food_count INTEGER,
  p_max_length INTEGER,
  p_level_reached INTEGER,
  p_client_seed TEXT DEFAULT NULL,
  p_integrity_hash TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  score_id UUID,
  rank BIGINT,
  personal_best INTEGER,
  is_personal_best BOOLEAN
) AS $$
DECLARE
  v_user_id UUID;
  v_score_id UUID;
  v_previous_best INTEGER;
  v_is_personal_best BOOLEAN;
  v_season_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  IF p_score IS NULL OR p_score < 0 OR p_score > 100000 THEN
    RAISE EXCEPTION 'Puntaje invalido';
  END IF;

  IF p_duration_ms IS NULL OR p_duration_ms < 0 OR p_duration_ms > 1800000 THEN
    RAISE EXCEPTION 'Duracion invalida';
  END IF;

  IF p_food_count IS NULL OR p_food_count < 0 OR p_food_count > 1000 THEN
    RAISE EXCEPTION 'Comida invalida';
  END IF;

  IF p_max_length IS NULL OR p_max_length < 3 OR p_max_length > 1003 THEN
    RAISE EXCEPTION 'Longitud invalida';
  END IF;

  IF p_level_reached IS NULL OR p_level_reached < 1 OR p_level_reached > 50 THEN
    RAISE EXCEPTION 'Nivel invalido';
  END IF;

  IF p_max_length > p_food_count + 3 THEN
    RAISE EXCEPTION 'Longitud no coincide con la partida';
  END IF;

  IF p_score > p_food_count * 100 THEN
    RAISE EXCEPTION 'Puntaje demasiado alto para la comida recolectada';
  END IF;

  IF p_score > 0 AND p_duration_ms < GREATEST(1500, p_food_count * 250) THEN
    RAISE EXCEPTION 'Puntaje demasiado rapido para ser valido';
  END IF;

  v_season_id := ensure_current_snake_season();

  SELECT best_score
  INTO v_previous_best
  FROM snake_player_stats
  WHERE user_id = v_user_id;

  v_previous_best := COALESCE(v_previous_best, 0);

  INSERT INTO snake_scores (
    user_id,
    season_id,
    score,
    duration_ms,
    food_count,
    max_length,
    level_reached,
    client_seed,
    integrity_hash,
    metadata
  )
  VALUES (
    v_user_id,
    v_season_id,
    p_score,
    p_duration_ms,
    p_food_count,
    p_max_length,
    p_level_reached,
    p_client_seed,
    p_integrity_hash,
    COALESCE(p_metadata, '{}'::jsonb)
  )
  RETURNING id INTO v_score_id;

  v_is_personal_best := p_score > v_previous_best;

  INSERT INTO snake_player_stats (
    user_id,
    best_score,
    best_score_id,
    games_played,
    total_score,
    total_food,
    longest_snake,
    best_level,
    average_score,
    last_played_at,
    updated_at
  )
  VALUES (
    v_user_id,
    p_score,
    v_score_id,
    1,
    p_score,
    p_food_count,
    p_max_length,
    p_level_reached,
    p_score,
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    best_score = GREATEST(snake_player_stats.best_score, EXCLUDED.best_score),
    best_score_id = CASE
      WHEN EXCLUDED.best_score > snake_player_stats.best_score THEN EXCLUDED.best_score_id
      ELSE snake_player_stats.best_score_id
    END,
    games_played = snake_player_stats.games_played + 1,
    total_score = snake_player_stats.total_score + EXCLUDED.total_score,
    total_food = snake_player_stats.total_food + EXCLUDED.total_food,
    longest_snake = GREATEST(snake_player_stats.longest_snake, EXCLUDED.longest_snake),
    best_level = GREATEST(snake_player_stats.best_level, EXCLUDED.best_level),
    average_score = ROUND(
      ((snake_player_stats.total_score + EXCLUDED.total_score)::NUMERIC /
       (snake_player_stats.games_played + 1)::NUMERIC),
      2
    ),
    last_played_at = NOW(),
    updated_at = NOW();

  INSERT INTO snake_season_entries (
    season_id,
    user_id,
    best_score,
    best_score_id,
    games_played,
    total_score,
    total_food,
    longest_snake,
    best_level,
    last_played_at,
    updated_at
  )
  VALUES (
    v_season_id,
    v_user_id,
    p_score,
    v_score_id,
    1,
    p_score,
    p_food_count,
    p_max_length,
    p_level_reached,
    NOW(),
    NOW()
  )
  ON CONFLICT (season_id, user_id) DO UPDATE SET
    best_score = GREATEST(snake_season_entries.best_score, EXCLUDED.best_score),
    best_score_id = CASE
      WHEN EXCLUDED.best_score > snake_season_entries.best_score THEN EXCLUDED.best_score_id
      ELSE snake_season_entries.best_score_id
    END,
    games_played = snake_season_entries.games_played + 1,
    total_score = snake_season_entries.total_score + EXCLUDED.total_score,
    total_food = snake_season_entries.total_food + EXCLUDED.total_food,
    longest_snake = GREATEST(snake_season_entries.longest_snake, EXCLUDED.longest_snake),
    best_level = GREATEST(snake_season_entries.best_level, EXCLUDED.best_level),
    last_played_at = NOW(),
    updated_at = NOW();

  RETURN QUERY
  WITH ranked AS (
    SELECT
      sps.user_id,
      RANK() OVER (ORDER BY sps.best_score DESC, sps.last_played_at ASC) AS player_rank
    FROM snake_player_stats sps
  )
  SELECT
    v_score_id AS score_id,
    COALESCE(r.player_rank, 1) AS rank,
    GREATEST(v_previous_best, p_score) AS personal_best,
    v_is_personal_best AS is_personal_best
  FROM ranked r
  WHERE r.user_id = v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION get_current_snake_season()
RETURNS TABLE (
  id UUID,
  slug TEXT,
  title TEXT,
  status TEXT,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ
) AS $$
DECLARE
  v_season_id UUID;
BEGIN
  v_season_id := ensure_current_snake_season();

  RETURN QUERY
  SELECT
    ss.id,
    ss.slug,
    ss.title,
    ss.status,
    ss.starts_at,
    ss.ends_at
  FROM snake_seasons ss
  WHERE ss.id = v_season_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION get_current_snake_season_leaderboard(limit_count INTEGER DEFAULT 10)
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
BEGIN
  v_season_id := ensure_current_snake_season();

  RETURN QUERY
  SELECT
    RANK() OVER (ORDER BY sse.best_score DESC, sse.last_played_at ASC) AS rank,
    sse.user_id,
    COALESCE(p.username, 'Usuario') AS username,
    p.avatar_url,
    sse.best_score,
    sse.games_played,
    sse.longest_snake,
    sse.best_level,
    sse.last_played_at
  FROM snake_season_entries sse
  LEFT JOIN profiles p ON p.id = sse.user_id
  WHERE sse.season_id = v_season_id
    AND sse.best_score > 0
  ORDER BY sse.best_score DESC, sse.last_played_at ASC
  LIMIT LEAST(GREATEST(limit_count, 1), 100);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION get_snake_season_history(limit_count INTEGER DEFAULT 5)
RETURNS TABLE (
  id UUID,
  slug TEXT,
  title TEXT,
  status TEXT,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  champion_user_id UUID,
  champion_username TEXT,
  champion_avatar_url TEXT,
  champion_score INTEGER
) AS $$
BEGIN
  PERFORM ensure_current_snake_season();
  PERFORM refresh_snake_season_champions();

  RETURN QUERY
  SELECT
    ss.id,
    ss.slug,
    ss.title,
    ss.status,
    ss.starts_at,
    ss.ends_at,
    ss.champion_user_id,
    COALESCE(p.username, 'Sin campeon') AS champion_username,
    p.avatar_url AS champion_avatar_url,
    ss.champion_score
  FROM snake_seasons ss
  LEFT JOIN profiles p ON p.id = ss.champion_user_id
  ORDER BY ss.starts_at DESC
  LIMIT LEAST(GREATEST(limit_count, 1), 20);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION ensure_current_snake_season() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION refresh_snake_season_champions() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_current_snake_season() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_current_snake_season_leaderboard(INTEGER) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_snake_season_history(INTEGER) TO authenticated, anon;
