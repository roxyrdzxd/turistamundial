-- Sistema arcade Snake: puntajes globales, estadisticas y base para torneos futuros

CREATE TABLE IF NOT EXISTS snake_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score >= 0),
  duration_ms INTEGER NOT NULL CHECK (duration_ms >= 0),
  food_count INTEGER NOT NULL DEFAULT 0 CHECK (food_count >= 0),
  max_length INTEGER NOT NULL DEFAULT 3 CHECK (max_length >= 3),
  level_reached INTEGER NOT NULL DEFAULT 1 CHECK (level_reached >= 1),
  game_mode TEXT NOT NULL DEFAULT 'classic',
  client_seed TEXT,
  integrity_hash TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_snake_scores_score_created
  ON snake_scores (score DESC, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_snake_scores_user_created
  ON snake_scores (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS snake_player_stats (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  best_score INTEGER NOT NULL DEFAULT 0,
  best_score_id UUID REFERENCES snake_scores(id) ON DELETE SET NULL,
  games_played INTEGER NOT NULL DEFAULT 0,
  total_score BIGINT NOT NULL DEFAULT 0,
  total_food INTEGER NOT NULL DEFAULT 0,
  longest_snake INTEGER NOT NULL DEFAULT 3,
  best_level INTEGER NOT NULL DEFAULT 1,
  average_score NUMERIC(10, 2) NOT NULL DEFAULT 0,
  last_played_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE snake_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE snake_player_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Snake scores are public readable" ON snake_scores;
CREATE POLICY "Snake scores are public readable"
  ON snake_scores FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can insert own snake scores" ON snake_scores;
CREATE POLICY "Users can insert own snake scores"
  ON snake_scores FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Snake stats are public readable" ON snake_player_stats;
CREATE POLICY "Snake stats are public readable"
  ON snake_player_stats FOR SELECT
  USING (true);

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

  SELECT best_score
  INTO v_previous_best
  FROM snake_player_stats
  WHERE user_id = v_user_id;

  v_previous_best := COALESCE(v_previous_best, 0);

  INSERT INTO snake_scores (
    user_id,
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

CREATE OR REPLACE FUNCTION get_snake_leaderboard(limit_count INTEGER DEFAULT 10)
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
BEGIN
  RETURN QUERY
  SELECT
    RANK() OVER (ORDER BY sps.best_score DESC, sps.last_played_at ASC) AS rank,
    sps.user_id,
    COALESCE(p.username, 'Usuario') AS username,
    p.avatar_url,
    sps.best_score,
    sps.games_played,
    sps.longest_snake,
    sps.best_level,
    sps.last_played_at
  FROM snake_player_stats sps
  LEFT JOIN profiles p ON p.id = sps.user_id
  WHERE sps.best_score > 0
  ORDER BY sps.best_score DESC, sps.last_played_at ASC
  LIMIT LEAST(GREATEST(limit_count, 1), 100);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION record_snake_score(
  INTEGER,
  INTEGER,
  INTEGER,
  INTEGER,
  INTEGER,
  TEXT,
  TEXT,
  JSONB
) TO authenticated;

GRANT EXECUTE ON FUNCTION get_snake_leaderboard(INTEGER) TO authenticated, anon;
