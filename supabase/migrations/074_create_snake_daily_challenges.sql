-- Retos diarios de Snake Mundial: progreso diario, recompensas y base para rotacion futura.

CREATE TABLE IF NOT EXISTS snake_daily_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  metric_type TEXT NOT NULL CHECK (metric_type IN (
    'games_played',
    'arcade_games',
    'classic_games',
    'food_total',
    'best_combo',
    'best_level',
    'gold_fruits',
    'rainbow_fruits',
    'boost_fruits',
    'best_score'
  )),
  target INTEGER NOT NULL CHECK (target > 0),
  reward_coins INTEGER NOT NULL DEFAULT 0 CHECK (reward_coins >= 0),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_snake_daily_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES snake_daily_challenges(id) ON DELETE CASCADE,
  challenge_date DATE NOT NULL DEFAULT CURRENT_DATE,
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0),
  target INTEGER NOT NULL CHECK (target > 0),
  completed_at TIMESTAMPTZ,
  claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, challenge_id, challenge_date)
);

CREATE INDEX IF NOT EXISTS idx_user_snake_daily_challenges_user_date
  ON user_snake_daily_challenges (user_id, challenge_date DESC, completed_at, claimed_at);

ALTER TABLE snake_daily_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_snake_daily_challenges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Snake daily challenges are readable" ON snake_daily_challenges;
CREATE POLICY "Snake daily challenges are readable"
  ON snake_daily_challenges FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS "Users can view own snake daily challenges" ON user_snake_daily_challenges;
CREATE POLICY "Users can view own snake daily challenges"
  ON user_snake_daily_challenges FOR SELECT
  USING (auth.uid() = user_id);

INSERT INTO snake_daily_challenges (
  challenge_key,
  title,
  description,
  metric_type,
  target,
  reward_coins,
  sort_order
) VALUES
  ('daily_warmup', 'Calentamiento Relampago', 'Juega 1 partida rankeada de Snake Mundial.', 'games_played', 1, 25, 10),
  ('arcade_double', 'Doble Arcade', 'Juega 2 partidas en modo Arcade.', 'arcade_games', 2, 40, 20),
  ('classic_focus', 'Purista Clasico', 'Juega 1 partida en modo Clasico.', 'classic_games', 1, 35, 30),
  ('fruit_collector', 'Cosecha Salvaje', 'Recolecta 30 frutas durante el dia.', 'food_total', 30, 60, 40),
  ('combo_spark', 'Chispa de Combo', 'Logra un combo x5 o superior.', 'best_combo', 5, 55, 50),
  ('jungle_level', 'Escalada de Jungla', 'Alcanza el nivel 4 en una partida.', 'best_level', 4, 70, 60),
  ('gold_rush', 'Fiebre Dorada', 'Recolecta 3 frutas doradas.', 'gold_fruits', 3, 50, 70),
  ('rainbow_signal', 'Senal Arcoiris', 'Recolecta 1 fruta arcoiris.', 'rainbow_fruits', 1, 45, 80),
  ('boost_party', 'Sobrecarga Turbo', 'Recolecta 3 frutas de poder: turbo, hielo o arcoiris.', 'boost_fruits', 3, 55, 90),
  ('score_burst', 'Golpe de Velocidad', 'Consigue 300 puntos en una sola partida.', 'best_score', 300, 80, 100)
ON CONFLICT (challenge_key) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  metric_type = EXCLUDED.metric_type,
  target = EXCLUDED.target,
  reward_coins = EXCLUDED.reward_coins,
  sort_order = EXCLUDED.sort_order,
  is_active = TRUE;

CREATE OR REPLACE FUNCTION ensure_snake_daily_challenges(p_user_id UUID DEFAULT auth.uid())
RETURNS TABLE (
  id UUID,
  challenge_id UUID,
  challenge_key TEXT,
  title TEXT,
  description TEXT,
  metric_type TEXT,
  progress INTEGER,
  target INTEGER,
  reward_coins INTEGER,
  completed_at TIMESTAMPTZ,
  claimed_at TIMESTAMPTZ,
  challenge_date DATE
) AS $$
DECLARE
  v_user_id UUID;
  v_today DATE := CURRENT_DATE;
BEGIN
  v_user_id := COALESCE(p_user_id, auth.uid());

  IF v_user_id IS NULL OR v_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Usuario no autorizado';
  END IF;

  INSERT INTO user_snake_daily_challenges (
    user_id,
    challenge_id,
    challenge_date,
    target
  )
  SELECT
    v_user_id,
    sdc.id,
    v_today,
    sdc.target
  FROM snake_daily_challenges sdc
  WHERE sdc.is_active = TRUE
  ON CONFLICT ON CONSTRAINT user_snake_daily_challenges_user_id_challenge_id_challenge_date_key DO NOTHING;

  RETURN QUERY
  SELECT
    usdc.id,
    sdc.id AS challenge_id,
    sdc.challenge_key,
    sdc.title,
    sdc.description,
    sdc.metric_type,
    LEAST(usdc.progress, usdc.target) AS progress,
    usdc.target,
    sdc.reward_coins,
    usdc.completed_at,
    usdc.claimed_at,
    usdc.challenge_date
  FROM user_snake_daily_challenges usdc
  INNER JOIN snake_daily_challenges sdc ON sdc.id = usdc.challenge_id
  WHERE usdc.user_id = v_user_id
    AND usdc.challenge_date = v_today
    AND sdc.is_active = TRUE
  ORDER BY sdc.sort_order ASC, sdc.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION evaluate_snake_daily_challenges(
  p_user_id UUID,
  p_score_id UUID,
  p_score INTEGER,
  p_duration_ms INTEGER,
  p_food_count INTEGER,
  p_level_reached INTEGER,
  p_game_mode TEXT,
  p_fruit_counts JSONB DEFAULT '{}'::jsonb,
  p_best_combo INTEGER DEFAULT 0,
  p_is_personal_best BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  id UUID,
  challenge_key TEXT,
  title TEXT,
  description TEXT,
  progress INTEGER,
  target INTEGER,
  reward_coins INTEGER,
  completed_now BOOLEAN,
  claimed_at TIMESTAMPTZ
) AS $$
DECLARE
  v_user_id UUID;
  v_today DATE := CURRENT_DATE;
  v_gold_count INTEGER;
  v_rainbow_count INTEGER;
  v_boost_count INTEGER;
BEGIN
  v_user_id := COALESCE(p_user_id, auth.uid());

  IF v_user_id IS NULL OR v_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Usuario no autorizado';
  END IF;

  PERFORM ensure_snake_daily_challenges(v_user_id);

  v_gold_count := COALESCE((p_fruit_counts->>'gold')::INTEGER, 0);
  v_rainbow_count := COALESCE((p_fruit_counts->>'rainbow')::INTEGER, 0);
  v_boost_count :=
    COALESCE((p_fruit_counts->>'turbo')::INTEGER, 0) +
    COALESCE((p_fruit_counts->>'frost')::INTEGER, 0) +
    COALESCE((p_fruit_counts->>'rainbow')::INTEGER, 0);

  RETURN QUERY
  WITH deltas AS (
    SELECT
      usdc.id,
      usdc.progress AS old_progress,
      usdc.target,
      usdc.completed_at AS old_completed_at,
      usdc.claimed_at,
      sdc.challenge_key,
      sdc.title,
      sdc.description,
      sdc.reward_coins,
      CASE sdc.metric_type
        WHEN 'games_played' THEN 1
        WHEN 'arcade_games' THEN CASE WHEN p_game_mode = 'arcade' THEN 1 ELSE 0 END
        WHEN 'classic_games' THEN CASE WHEN p_game_mode = 'classic' THEN 1 ELSE 0 END
        WHEN 'food_total' THEN GREATEST(COALESCE(p_food_count, 0), 0)
        WHEN 'best_combo' THEN GREATEST(COALESCE(p_best_combo, 0), 0)
        WHEN 'best_level' THEN GREATEST(COALESCE(p_level_reached, 0), 0)
        WHEN 'gold_fruits' THEN GREATEST(v_gold_count, 0)
        WHEN 'rainbow_fruits' THEN GREATEST(v_rainbow_count, 0)
        WHEN 'boost_fruits' THEN GREATEST(v_boost_count, 0)
        WHEN 'best_score' THEN GREATEST(COALESCE(p_score, 0), 0)
        ELSE 0
      END AS metric_value,
      CASE sdc.metric_type
        WHEN 'best_combo' THEN TRUE
        WHEN 'best_level' THEN TRUE
        WHEN 'best_score' THEN TRUE
        ELSE FALSE
      END AS use_max
    FROM user_snake_daily_challenges usdc
    INNER JOIN snake_daily_challenges sdc ON sdc.id = usdc.challenge_id
    WHERE usdc.user_id = v_user_id
      AND usdc.challenge_date = v_today
      AND sdc.is_active = TRUE
  ),
  updated AS (
    UPDATE user_snake_daily_challenges usdc
    SET
      progress = LEAST(
        d.target,
        CASE
          WHEN d.use_max THEN GREATEST(d.old_progress, d.metric_value)
          ELSE d.old_progress + d.metric_value
        END
      ),
      completed_at = CASE
        WHEN d.old_completed_at IS NULL AND
          LEAST(
            d.target,
            CASE
              WHEN d.use_max THEN GREATEST(d.old_progress, d.metric_value)
              ELSE d.old_progress + d.metric_value
            END
          ) >= d.target THEN NOW()
        ELSE d.old_completed_at
      END,
      updated_at = NOW()
    FROM deltas d
    WHERE usdc.id = d.id
      AND d.metric_value > 0
      AND usdc.claimed_at IS NULL
    RETURNING
      usdc.id,
      d.challenge_key,
      d.title,
      d.description,
      usdc.progress,
      usdc.target,
      d.reward_coins,
      (d.old_completed_at IS NULL AND usdc.completed_at IS NOT NULL) AS completed_now,
      usdc.claimed_at
  )
  SELECT
    u.id,
    u.challenge_key,
    u.title,
    u.description,
    u.progress,
    u.target,
    u.reward_coins,
    u.completed_now,
    u.claimed_at
  FROM updated u
  WHERE u.completed_now = TRUE
  ORDER BY u.reward_coins DESC, u.title ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION claim_snake_daily_challenge(
  p_user_challenge_id UUID
)
RETURNS TABLE (
  success BOOLEAN,
  reward_coins INTEGER,
  new_balance INTEGER,
  message TEXT
) AS $$
DECLARE
  v_user_id UUID;
  v_challenge RECORD;
  v_grant_result JSONB;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autorizado';
  END IF;

  SELECT
    usdc.id,
    usdc.user_id,
    usdc.completed_at,
    usdc.claimed_at,
    sdc.title,
    sdc.reward_coins
  INTO v_challenge
  FROM user_snake_daily_challenges usdc
  INNER JOIN snake_daily_challenges sdc ON sdc.id = usdc.challenge_id
  WHERE usdc.id = p_user_challenge_id
    AND usdc.user_id = v_user_id
    AND usdc.challenge_date = CURRENT_DATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 0, 0, 'Reto no encontrado';
    RETURN;
  END IF;

  IF v_challenge.completed_at IS NULL THEN
    RETURN QUERY SELECT FALSE, 0, 0, 'Reto incompleto';
    RETURN;
  END IF;

  IF v_challenge.claimed_at IS NOT NULL THEN
    RETURN QUERY SELECT FALSE, 0, 0, 'Recompensa ya reclamada';
    RETURN;
  END IF;

  SELECT grant_coins(
    v_user_id,
    v_challenge.reward_coins,
    'mission',
    'Reto diario Snake: ' || v_challenge.title,
    v_challenge.id
  ) INTO v_grant_result;

  IF COALESCE((v_grant_result->>'success')::BOOLEAN, FALSE) = FALSE THEN
    RETURN QUERY SELECT FALSE, 0, 0, COALESCE(v_grant_result->>'error', 'No se pudo otorgar recompensa');
    RETURN;
  END IF;

  UPDATE user_snake_daily_challenges
  SET claimed_at = NOW(), updated_at = NOW()
  WHERE id = v_challenge.id;

  RETURN QUERY SELECT
    TRUE,
    v_challenge.reward_coins,
    COALESCE((v_grant_result->>'new_balance')::INTEGER, 0),
    'Recompensa reclamada';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT SELECT ON snake_daily_challenges TO authenticated, anon;
GRANT SELECT ON user_snake_daily_challenges TO authenticated;
GRANT EXECUTE ON FUNCTION ensure_snake_daily_challenges(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION evaluate_snake_daily_challenges(UUID, UUID, INTEGER, INTEGER, INTEGER, INTEGER, TEXT, JSONB, INTEGER, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION claim_snake_daily_challenge(UUID) TO authenticated;
