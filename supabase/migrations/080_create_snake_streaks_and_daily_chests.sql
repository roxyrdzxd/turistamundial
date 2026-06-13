-- Rachas diarias y cofre diario para Snake Mundial.

CREATE TABLE IF NOT EXISTS snake_daily_streaks (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  current_streak INTEGER NOT NULL DEFAULT 0 CHECK (current_streak >= 0),
  best_streak INTEGER NOT NULL DEFAULT 0 CHECK (best_streak >= 0),
  last_played_date DATE,
  chests_opened INTEGER NOT NULL DEFAULT 0 CHECK (chests_opened >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS snake_daily_chests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  chest_date DATE NOT NULL DEFAULT CURRENT_DATE,
  required_completed_challenges INTEGER NOT NULL DEFAULT 3 CHECK (required_completed_challenges > 0),
  reward_coins INTEGER NOT NULL DEFAULT 0 CHECK (reward_coins >= 0),
  opened_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT snake_daily_chests_user_date_unique UNIQUE (user_id, chest_date)
);

CREATE INDEX IF NOT EXISTS idx_snake_daily_chests_user_date
  ON snake_daily_chests (user_id, chest_date DESC);

ALTER TABLE snake_daily_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE snake_daily_chests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own snake daily streak" ON snake_daily_streaks;
CREATE POLICY "Users can view own snake daily streak"
  ON snake_daily_streaks FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own snake daily chests" ON snake_daily_chests;
CREATE POLICY "Users can view own snake daily chests"
  ON snake_daily_chests FOR SELECT
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION get_snake_streak_reward(p_streak INTEGER)
RETURNS INTEGER AS $$
BEGIN
  RETURN CASE
    WHEN p_streak = 2 THEN 20
    WHEN p_streak = 3 THEN 35
    WHEN p_streak = 7 THEN 120
    WHEN p_streak = 14 THEN 250
    WHEN p_streak = 30 THEN 700
    WHEN p_streak > 0 AND p_streak % 30 = 0 THEN 700
    WHEN p_streak > 0 AND p_streak % 7 = 0 THEN 120
    ELSE 0
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public;

CREATE OR REPLACE FUNCTION ensure_snake_daily_chest(p_user_id UUID)
RETURNS UUID AS $$
DECLARE
  v_chest_id UUID;
  v_streak INTEGER;
  v_reward INTEGER;
BEGIN
  SELECT COALESCE(current_streak, 0)
  INTO v_streak
  FROM snake_daily_streaks
  WHERE user_id = p_user_id;

  v_streak := COALESCE(v_streak, 0);
  v_reward := LEAST(250, 75 + (v_streak * 10));

  INSERT INTO snake_daily_chests (
    user_id,
    chest_date,
    required_completed_challenges,
    reward_coins
  )
  VALUES (
    p_user_id,
    CURRENT_DATE,
    3,
    v_reward
  )
  ON CONFLICT ON CONSTRAINT snake_daily_chests_user_date_unique DO UPDATE SET
    reward_coins = GREATEST(snake_daily_chests.reward_coins, EXCLUDED.reward_coins),
    updated_at = NOW()
  RETURNING id INTO v_chest_id;

  RETURN v_chest_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION update_snake_daily_streak(p_user_id UUID DEFAULT auth.uid())
RETURNS TABLE (
  current_streak INTEGER,
  best_streak INTEGER,
  last_played_date DATE,
  reward_coins INTEGER,
  reward_claimed BOOLEAN,
  new_balance INTEGER
) AS $$
DECLARE
  v_user_id UUID;
  v_previous snake_daily_streaks%ROWTYPE;
  v_next_streak INTEGER;
  v_reward INTEGER;
  v_grant_result JSONB;
  v_new_balance INTEGER := 0;
BEGIN
  v_user_id := COALESCE(p_user_id, auth.uid());

  IF v_user_id IS NULL OR v_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Usuario no autorizado';
  END IF;

  SELECT *
  INTO v_previous
  FROM snake_daily_streaks
  WHERE user_id = v_user_id;

  IF NOT FOUND THEN
    v_next_streak := 1;
  ELSIF v_previous.last_played_date = CURRENT_DATE THEN
    v_next_streak := v_previous.current_streak;
  ELSIF v_previous.last_played_date = CURRENT_DATE - 1 THEN
    v_next_streak := v_previous.current_streak + 1;
  ELSE
    v_next_streak := 1;
  END IF;

  v_reward := CASE
    WHEN v_previous.last_played_date = CURRENT_DATE THEN 0
    ELSE get_snake_streak_reward(v_next_streak)
  END;

  INSERT INTO snake_daily_streaks (
    user_id,
    current_streak,
    best_streak,
    last_played_date,
    updated_at
  )
  VALUES (
    v_user_id,
    v_next_streak,
    GREATEST(v_next_streak, 0),
    CURRENT_DATE,
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    current_streak = v_next_streak,
    best_streak = GREATEST(snake_daily_streaks.best_streak, v_next_streak),
    last_played_date = CURRENT_DATE,
    updated_at = NOW();

  PERFORM ensure_snake_daily_chest(v_user_id);

  IF v_reward > 0 THEN
    SELECT grant_coins(
      v_user_id,
      v_reward,
      'reward',
      'Racha diaria Snake: dia ' || v_next_streak,
      NULL
    ) INTO v_grant_result;

    IF COALESCE((v_grant_result->>'success')::BOOLEAN, FALSE) THEN
      v_new_balance := COALESCE((v_grant_result->>'new_balance')::INTEGER, 0);
    ELSE
      v_reward := 0;
    END IF;
  END IF;

  RETURN QUERY
  SELECT
    sds.current_streak,
    sds.best_streak,
    sds.last_played_date,
    v_reward,
    v_reward > 0,
    v_new_balance
  FROM snake_daily_streaks sds
  WHERE sds.user_id = v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION get_snake_daily_rewards()
RETURNS TABLE (
  current_streak INTEGER,
  best_streak INTEGER,
  last_played_date DATE,
  chest_id UUID,
  chest_date DATE,
  completed_challenges INTEGER,
  required_completed_challenges INTEGER,
  reward_coins INTEGER,
  opened_at TIMESTAMPTZ,
  can_open BOOLEAN
) AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autorizado';
  END IF;

  INSERT INTO snake_daily_streaks (user_id, current_streak, best_streak, updated_at)
  VALUES (v_user_id, 0, 0, NOW())
  ON CONFLICT (user_id) DO NOTHING;

  PERFORM ensure_snake_daily_chest(v_user_id);

  RETURN QUERY
  WITH completed AS (
    SELECT COUNT(*)::INTEGER AS total
    FROM user_snake_daily_challenges usdc
    WHERE usdc.user_id = v_user_id
      AND usdc.challenge_date = CURRENT_DATE
      AND usdc.completed_at IS NOT NULL
  )
  SELECT
    sds.current_streak,
    sds.best_streak,
    sds.last_played_date,
    sdc.id AS chest_id,
    sdc.chest_date,
    completed.total AS completed_challenges,
    sdc.required_completed_challenges,
    sdc.reward_coins,
    sdc.opened_at,
    completed.total >= sdc.required_completed_challenges AND sdc.opened_at IS NULL AS can_open
  FROM snake_daily_streaks sds
  CROSS JOIN completed
  INNER JOIN snake_daily_chests sdc ON sdc.user_id = sds.user_id
    AND sdc.chest_date = CURRENT_DATE
  WHERE sds.user_id = v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION claim_snake_daily_chest(p_chest_id UUID)
RETURNS TABLE (
  success BOOLEAN,
  reward_coins INTEGER,
  new_balance INTEGER,
  message TEXT
) AS $$
DECLARE
  v_user_id UUID;
  v_chest snake_daily_chests%ROWTYPE;
  v_completed INTEGER;
  v_grant_result JSONB;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autorizado';
  END IF;

  SELECT *
  INTO v_chest
  FROM snake_daily_chests
  WHERE id = p_chest_id
    AND snake_daily_chests.user_id = v_user_id
    AND snake_daily_chests.chest_date = CURRENT_DATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 0, 0, 'Cofre no encontrado';
    RETURN;
  END IF;

  IF v_chest.opened_at IS NOT NULL THEN
    RETURN QUERY SELECT FALSE, 0, 0, 'Cofre ya abierto';
    RETURN;
  END IF;

  SELECT COUNT(*)::INTEGER
  INTO v_completed
  FROM user_snake_daily_challenges
  WHERE user_snake_daily_challenges.user_id = v_user_id
    AND user_snake_daily_challenges.challenge_date = CURRENT_DATE
    AND user_snake_daily_challenges.completed_at IS NOT NULL;

  IF v_completed < v_chest.required_completed_challenges THEN
    RETURN QUERY SELECT FALSE, 0, 0, 'Completa 3 retos diarios para abrir el cofre';
    RETURN;
  END IF;

  SELECT grant_coins(
    v_user_id,
    v_chest.reward_coins,
    'reward',
    'Cofre diario Snake',
    v_chest.id
  ) INTO v_grant_result;

  IF COALESCE((v_grant_result->>'success')::BOOLEAN, FALSE) = FALSE THEN
    RETURN QUERY SELECT FALSE, 0, 0, COALESCE(v_grant_result->>'error', 'No se pudo otorgar recompensa');
    RETURN;
  END IF;

  UPDATE snake_daily_chests
  SET opened_at = NOW(), updated_at = NOW()
  WHERE id = v_chest.id;

  UPDATE snake_daily_streaks
  SET chests_opened = chests_opened + 1, updated_at = NOW()
  WHERE snake_daily_streaks.user_id = v_user_id;

  RETURN QUERY SELECT
    TRUE,
    v_chest.reward_coins,
    COALESCE((v_grant_result->>'new_balance')::INTEGER, 0),
    'Cofre abierto';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT SELECT ON snake_daily_streaks TO authenticated;
GRANT SELECT ON snake_daily_chests TO authenticated;
GRANT EXECUTE ON FUNCTION get_snake_streak_reward(INTEGER) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION ensure_snake_daily_chest(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_snake_daily_streak(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_snake_daily_rewards() TO authenticated;
GRANT EXECUTE ON FUNCTION claim_snake_daily_chest(UUID) TO authenticated;
