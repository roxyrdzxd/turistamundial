-- Corrige la ambiguedad de challenge_id dentro de funciones RETURNS TABLE.
-- En PL/pgSQL los nombres retornados tambien son variables, asi que usamos la restriccion unica explicita.

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

CREATE OR REPLACE FUNCTION get_snake_daily_challenges()
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
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
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

GRANT EXECUTE ON FUNCTION ensure_snake_daily_challenges(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_snake_daily_challenges() TO authenticated;
