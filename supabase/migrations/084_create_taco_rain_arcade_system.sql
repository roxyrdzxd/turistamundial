-- Ranking online y temporadas semanales para Lluvia de Tacos.

CREATE TABLE IF NOT EXISTS taco_rain_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  season_id UUID,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 250000),
  duration_ms INTEGER NOT NULL CHECK (duration_ms >= 0 AND duration_ms <= 1800000),
  tacos_caught INTEGER NOT NULL CHECK (tacos_caught >= 0 AND tacos_caught <= 2000),
  best_combo INTEGER NOT NULL CHECK (best_combo >= 0 AND best_combo <= 2000),
  client_seed TEXT,
  integrity_hash TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_taco_rain_scores_score_created
  ON taco_rain_scores (score DESC, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_taco_rain_scores_user_created
  ON taco_rain_scores (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS taco_rain_player_stats (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  best_score INTEGER NOT NULL DEFAULT 0,
  best_score_id UUID REFERENCES taco_rain_scores(id) ON DELETE SET NULL,
  games_played INTEGER NOT NULL DEFAULT 0,
  total_score BIGINT NOT NULL DEFAULT 0,
  total_tacos INTEGER NOT NULL DEFAULT 0,
  best_combo INTEGER NOT NULL DEFAULT 0,
  average_score NUMERIC(10, 2) NOT NULL DEFAULT 0,
  last_played_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS taco_rain_seasons (
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

CREATE INDEX IF NOT EXISTS idx_taco_rain_seasons_status_dates
  ON taco_rain_seasons (status, starts_at DESC, ends_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'taco_rain_scores_season_id_fkey'
  ) THEN
    ALTER TABLE taco_rain_scores
      ADD CONSTRAINT taco_rain_scores_season_id_fkey
      FOREIGN KEY (season_id) REFERENCES taco_rain_seasons(id) ON DELETE SET NULL;
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_taco_rain_scores_season_score
  ON taco_rain_scores (season_id, score DESC, created_at ASC);

CREATE TABLE IF NOT EXISTS taco_rain_season_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES taco_rain_seasons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  best_score INTEGER NOT NULL DEFAULT 0,
  best_score_id UUID REFERENCES taco_rain_scores(id) ON DELETE SET NULL,
  games_played INTEGER NOT NULL DEFAULT 0,
  total_score BIGINT NOT NULL DEFAULT 0,
  total_tacos INTEGER NOT NULL DEFAULT 0,
  best_combo INTEGER NOT NULL DEFAULT 0,
  last_played_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (season_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_taco_rain_season_entries_rank
  ON taco_rain_season_entries (season_id, best_score DESC, last_played_at ASC);

ALTER TABLE taco_rain_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE taco_rain_player_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE taco_rain_seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE taco_rain_season_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Taco rain scores are public readable" ON taco_rain_scores;
CREATE POLICY "Taco rain scores are public readable"
  ON taco_rain_scores FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can insert own taco rain scores" ON taco_rain_scores;
CREATE POLICY "Users can insert own taco rain scores"
  ON taco_rain_scores FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Taco rain stats are public readable" ON taco_rain_player_stats;
CREATE POLICY "Taco rain stats are public readable"
  ON taco_rain_player_stats FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Taco rain seasons are public readable" ON taco_rain_seasons;
CREATE POLICY "Taco rain seasons are public readable"
  ON taco_rain_seasons FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Taco rain season entries are public readable" ON taco_rain_season_entries;
CREATE POLICY "Taco rain season entries are public readable"
  ON taco_rain_season_entries FOR SELECT
  USING (true);

CREATE OR REPLACE FUNCTION ensure_current_taco_rain_season()
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
  v_slug := 'taco-rain-' || to_char(v_start, 'IYYY-"w"IW');
  v_title := 'Taquiza ' || to_char(v_start, 'IYYY-"W"IW');

  UPDATE taco_rain_seasons
  SET
    status = 'closed',
    closed_at = COALESCE(closed_at, NOW())
  WHERE status = 'active'
    AND ends_at <= NOW();

  INSERT INTO taco_rain_seasons (slug, title, status, starts_at, ends_at)
  VALUES (v_slug, v_title, 'active', v_start, v_end)
  ON CONFLICT (slug) DO UPDATE SET
    status = CASE
      WHEN taco_rain_seasons.ends_at <= NOW() THEN 'closed'
      ELSE 'active'
    END
  RETURNING id INTO v_season_id;

  RETURN v_season_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION refresh_taco_rain_season_champions()
RETURNS VOID AS $$
BEGIN
  WITH winners AS (
    SELECT DISTINCT ON (tre.season_id)
      tre.season_id,
      tre.user_id,
      tre.best_score
    FROM taco_rain_season_entries tre
    INNER JOIN taco_rain_seasons trs ON trs.id = tre.season_id
    WHERE trs.status = 'closed'
    ORDER BY tre.season_id, tre.best_score DESC, tre.last_played_at ASC
  )
  UPDATE taco_rain_seasons trs
  SET
    champion_user_id = winners.user_id,
    champion_score = winners.best_score
  FROM winners
  WHERE trs.id = winners.season_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION record_taco_rain_score(
  p_score INTEGER,
  p_duration_ms INTEGER,
  p_tacos_caught INTEGER,
  p_best_combo INTEGER,
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

  IF p_score IS NULL OR p_score < 0 OR p_score > 250000 THEN
    RAISE EXCEPTION 'Puntaje invalido';
  END IF;

  IF p_duration_ms IS NULL OR p_duration_ms < 0 OR p_duration_ms > 1800000 THEN
    RAISE EXCEPTION 'Duracion invalida';
  END IF;

  IF p_tacos_caught IS NULL OR p_tacos_caught < 0 OR p_tacos_caught > 2000 THEN
    RAISE EXCEPTION 'Tacos invalidos';
  END IF;

  IF p_best_combo IS NULL OR p_best_combo < 0 OR p_best_combo > 2000 THEN
    RAISE EXCEPTION 'Combo invalido';
  END IF;

  IF p_best_combo > p_tacos_caught THEN
    RAISE EXCEPTION 'Combo no coincide con la partida';
  END IF;

  IF p_score > GREATEST(p_tacos_caught * 250, 0) THEN
    RAISE EXCEPTION 'Puntaje demasiado alto para los tacos atrapados';
  END IF;

  IF p_score > 0 AND p_duration_ms < GREATEST(1500, p_tacos_caught * 150) THEN
    RAISE EXCEPTION 'Puntaje demasiado rapido para ser valido';
  END IF;

  v_season_id := ensure_current_taco_rain_season();

  SELECT best_score
  INTO v_previous_best
  FROM taco_rain_player_stats
  WHERE user_id = v_user_id;

  v_previous_best := COALESCE(v_previous_best, 0);

  INSERT INTO taco_rain_scores (
    user_id,
    season_id,
    score,
    duration_ms,
    tacos_caught,
    best_combo,
    client_seed,
    integrity_hash,
    metadata
  )
  VALUES (
    v_user_id,
    v_season_id,
    p_score,
    p_duration_ms,
    p_tacos_caught,
    p_best_combo,
    p_client_seed,
    p_integrity_hash,
    COALESCE(p_metadata, '{}'::jsonb)
  )
  RETURNING id INTO v_score_id;

  v_is_personal_best := p_score > v_previous_best;

  INSERT INTO taco_rain_player_stats (
    user_id,
    best_score,
    best_score_id,
    games_played,
    total_score,
    total_tacos,
    best_combo,
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
    p_tacos_caught,
    p_best_combo,
    p_score,
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    best_score = GREATEST(taco_rain_player_stats.best_score, EXCLUDED.best_score),
    best_score_id = CASE
      WHEN EXCLUDED.best_score > taco_rain_player_stats.best_score THEN EXCLUDED.best_score_id
      ELSE taco_rain_player_stats.best_score_id
    END,
    games_played = taco_rain_player_stats.games_played + 1,
    total_score = taco_rain_player_stats.total_score + EXCLUDED.total_score,
    total_tacos = taco_rain_player_stats.total_tacos + EXCLUDED.total_tacos,
    best_combo = GREATEST(taco_rain_player_stats.best_combo, EXCLUDED.best_combo),
    average_score = ROUND(
      ((taco_rain_player_stats.total_score + EXCLUDED.total_score)::NUMERIC /
       (taco_rain_player_stats.games_played + 1)::NUMERIC),
      2
    ),
    last_played_at = NOW(),
    updated_at = NOW();

  INSERT INTO taco_rain_season_entries (
    season_id,
    user_id,
    best_score,
    best_score_id,
    games_played,
    total_score,
    total_tacos,
    best_combo,
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
    p_tacos_caught,
    p_best_combo,
    NOW(),
    NOW()
  )
  ON CONFLICT (season_id, user_id) DO UPDATE SET
    best_score = GREATEST(taco_rain_season_entries.best_score, EXCLUDED.best_score),
    best_score_id = CASE
      WHEN EXCLUDED.best_score > taco_rain_season_entries.best_score THEN EXCLUDED.best_score_id
      ELSE taco_rain_season_entries.best_score_id
    END,
    games_played = taco_rain_season_entries.games_played + 1,
    total_score = taco_rain_season_entries.total_score + EXCLUDED.total_score,
    total_tacos = taco_rain_season_entries.total_tacos + EXCLUDED.total_tacos,
    best_combo = GREATEST(taco_rain_season_entries.best_combo, EXCLUDED.best_combo),
    last_played_at = NOW(),
    updated_at = NOW();

  RETURN QUERY
  WITH ranked AS (
    SELECT
      trps.user_id,
      RANK() OVER (ORDER BY trps.best_score DESC, trps.last_played_at ASC) AS player_rank
    FROM taco_rain_player_stats trps
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

CREATE OR REPLACE FUNCTION get_taco_rain_leaderboard(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
  rank BIGINT,
  user_id UUID,
  username TEXT,
  avatar_url TEXT,
  world_cup_country_code TEXT,
  best_score INTEGER,
  games_played INTEGER,
  total_tacos INTEGER,
  best_combo INTEGER,
  last_played_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    RANK() OVER (ORDER BY trps.best_score DESC, trps.last_played_at ASC) AS rank,
    trps.user_id,
    COALESCE(p.username, 'Usuario') AS username,
    p.avatar_url,
    p.world_cup_country_code,
    trps.best_score,
    trps.games_played,
    trps.total_tacos,
    trps.best_combo,
    trps.last_played_at
  FROM taco_rain_player_stats trps
  LEFT JOIN profiles p ON p.id = trps.user_id
  WHERE trps.best_score > 0
  ORDER BY trps.best_score DESC, trps.last_played_at ASC
  LIMIT LEAST(GREATEST(limit_count, 1), 100);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION get_current_taco_rain_season()
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
  v_season_id := ensure_current_taco_rain_season();

  RETURN QUERY
  SELECT
    trs.id,
    trs.slug,
    trs.title,
    trs.status,
    trs.starts_at,
    trs.ends_at
  FROM taco_rain_seasons trs
  WHERE trs.id = v_season_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION get_current_taco_rain_season_leaderboard(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
  rank BIGINT,
  user_id UUID,
  username TEXT,
  avatar_url TEXT,
  world_cup_country_code TEXT,
  best_score INTEGER,
  games_played INTEGER,
  total_tacos INTEGER,
  best_combo INTEGER,
  last_played_at TIMESTAMPTZ
) AS $$
DECLARE
  v_season_id UUID;
BEGIN
  v_season_id := ensure_current_taco_rain_season();

  RETURN QUERY
  SELECT
    RANK() OVER (ORDER BY tre.best_score DESC, tre.last_played_at ASC) AS rank,
    tre.user_id,
    COALESCE(p.username, 'Usuario') AS username,
    p.avatar_url,
    p.world_cup_country_code,
    tre.best_score,
    tre.games_played,
    tre.total_tacos,
    tre.best_combo,
    tre.last_played_at
  FROM taco_rain_season_entries tre
  LEFT JOIN profiles p ON p.id = tre.user_id
  WHERE tre.season_id = v_season_id
    AND tre.best_score > 0
  ORDER BY tre.best_score DESC, tre.last_played_at ASC
  LIMIT LEAST(GREATEST(limit_count, 1), 100);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION get_taco_rain_season_history(limit_count INTEGER DEFAULT 5)
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
  PERFORM ensure_current_taco_rain_season();
  PERFORM refresh_taco_rain_season_champions();

  RETURN QUERY
  SELECT
    trs.id,
    trs.slug,
    trs.title,
    trs.status,
    trs.starts_at,
    trs.ends_at,
    trs.champion_user_id,
    COALESCE(p.username, 'Sin campeon') AS champion_username,
    p.avatar_url AS champion_avatar_url,
    trs.champion_score
  FROM taco_rain_seasons trs
  LEFT JOIN profiles p ON p.id = trs.champion_user_id
  ORDER BY trs.starts_at DESC
  LIMIT LEAST(GREATEST(limit_count, 1), 20);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION ensure_current_taco_rain_season() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION refresh_taco_rain_season_champions() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION record_taco_rain_score(INTEGER, INTEGER, INTEGER, INTEGER, TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION get_taco_rain_leaderboard(INTEGER) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_current_taco_rain_season() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_current_taco_rain_season_leaderboard(INTEGER) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_taco_rain_season_history(INTEGER) TO authenticated, anon;
