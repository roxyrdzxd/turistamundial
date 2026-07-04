-- Logros para Lluvia de Tacos.

CREATE TABLE IF NOT EXISTS taco_rain_achievements (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  badge_url TEXT NOT NULL,
  rarity TEXT NOT NULL DEFAULT 'common' CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  requirement_type TEXT NOT NULL,
  requirement_value INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_taco_rain_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL REFERENCES taco_rain_achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source_score_id UUID REFERENCES taco_rain_scores(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (user_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_user_taco_rain_achievements_user
  ON user_taco_rain_achievements (user_id, unlocked_at DESC);

ALTER TABLE taco_rain_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_taco_rain_achievements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Taco rain achievements are public readable" ON taco_rain_achievements;
CREATE POLICY "Taco rain achievements are public readable"
  ON taco_rain_achievements FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Users can view own taco rain achievements" ON user_taco_rain_achievements;
CREATE POLICY "Users can view own taco rain achievements"
  ON user_taco_rain_achievements FOR SELECT
  USING (auth.uid() = user_id);

INSERT INTO taco_rain_achievements (
  id,
  name,
  description,
  badge_url,
  rarity,
  requirement_type,
  requirement_value,
  sort_order
)
VALUES
  ('taco_first_game', 'Primera Taquiza', 'Juega tu primera partida de Lluvia de Tacos.', '/taco-badges/first-game.png', 'common', 'games_played', 1, 10),
  ('taco_score_500', 'Taquero en Forma', 'Alcanza 500 puntos en una partida.', '/taco-badges/score-500.png', 'common', 'best_score', 500, 20),
  ('taco_combo_10', 'Combo al Pastor', 'Logra un combo x10.', '/taco-badges/combo-10.png', 'rare', 'best_combo', 10, 30),
  ('taco_100_total', 'Cazador de Tacos', 'Atrapa 100 tacos en total.', '/taco-badges/total-100.png', 'rare', 'total_tacos', 100, 40),
  ('taco_first_power', 'Salsa Especial', 'Activa tu primer power-up.', '/taco-badges/first-power.png', 'rare', 'power_ups', 1, 50),
  ('taco_record_breaker', 'Nuevo Rey del Trompo', 'Supera tu marca personal.', '/taco-badges/record-breaker.png', 'epic', 'record_breaker', 1, 60),
  ('taco_weekly_top_10', 'Top Semanal Taquero', 'Entra al top 10 de la temporada semanal.', '/taco-badges/weekly-top-10.png', 'epic', 'weekly_rank', 10, 70),
  ('taco_score_2000', 'Taquero Legendario', 'Alcanza 2,000 puntos en una partida.', '/taco-badges/score-2000.png', 'legendary', 'best_score', 2000, 80)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  badge_url = EXCLUDED.badge_url,
  rarity = EXCLUDED.rarity,
  requirement_type = EXCLUDED.requirement_type,
  requirement_value = EXCLUDED.requirement_value,
  sort_order = EXCLUDED.sort_order,
  is_active = true;

CREATE OR REPLACE FUNCTION evaluate_taco_rain_achievements(
  p_user_id UUID,
  p_score_id UUID,
  p_is_personal_best BOOLEAN DEFAULT false
)
RETURNS TABLE (
  id TEXT,
  name TEXT,
  description TEXT,
  badge_url TEXT,
  rarity TEXT,
  unlocked_at TIMESTAMPTZ
) AS $$
DECLARE
  v_stats taco_rain_player_stats%ROWTYPE;
  v_score taco_rain_scores%ROWTYPE;
  v_weekly_rank BIGINT;
  v_power_ups INTEGER;
BEGIN
  SELECT *
  INTO v_stats
  FROM taco_rain_player_stats
  WHERE user_id = p_user_id;

  SELECT *
  INTO v_score
  FROM taco_rain_scores
  WHERE id = p_score_id
    AND user_id = p_user_id;

  v_power_ups := COALESCE((v_score.metadata->>'powerUps')::INTEGER, 0);

  WITH ranked AS (
    SELECT
      tre.user_id,
      RANK() OVER (ORDER BY tre.best_score DESC, tre.last_played_at ASC) AS rank
    FROM taco_rain_season_entries tre
    INNER JOIN taco_rain_seasons trs ON trs.id = tre.season_id
    WHERE trs.status = 'active'
  )
  SELECT rank
  INTO v_weekly_rank
  FROM ranked
  WHERE user_id = p_user_id;

  INSERT INTO user_taco_rain_achievements (user_id, achievement_id, source_score_id, metadata)
  SELECT
    p_user_id,
    tra.id,
    p_score_id,
    jsonb_build_object(
      'best_score', COALESCE(v_stats.best_score, 0),
      'games_played', COALESCE(v_stats.games_played, 0),
      'total_tacos', COALESCE(v_stats.total_tacos, 0),
      'best_combo', COALESCE(v_stats.best_combo, 0),
      'power_ups', v_power_ups,
      'weekly_rank', v_weekly_rank
    )
  FROM taco_rain_achievements tra
  WHERE tra.is_active = true
    AND (
      (tra.requirement_type = 'games_played' AND COALESCE(v_stats.games_played, 0) >= tra.requirement_value)
      OR (tra.requirement_type = 'best_score' AND COALESCE(v_stats.best_score, 0) >= tra.requirement_value)
      OR (tra.requirement_type = 'best_combo' AND COALESCE(v_stats.best_combo, 0) >= tra.requirement_value)
      OR (tra.requirement_type = 'total_tacos' AND COALESCE(v_stats.total_tacos, 0) >= tra.requirement_value)
      OR (tra.requirement_type = 'power_ups' AND v_power_ups >= tra.requirement_value)
      OR (tra.requirement_type = 'record_breaker' AND p_is_personal_best = true)
      OR (tra.requirement_type = 'weekly_rank' AND v_weekly_rank IS NOT NULL AND v_weekly_rank <= tra.requirement_value)
    )
  ON CONFLICT (user_id, achievement_id) DO NOTHING;

  RETURN QUERY
  SELECT
    tra.id,
    tra.name,
    tra.description,
    tra.badge_url,
    tra.rarity,
    utra.unlocked_at
  FROM user_taco_rain_achievements utra
  INNER JOIN taco_rain_achievements tra ON tra.id = utra.achievement_id
  WHERE utra.user_id = p_user_id
    AND utra.source_score_id = p_score_id
  ORDER BY tra.sort_order ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION get_taco_rain_achievements_for_user(p_user_id UUID DEFAULT auth.uid())
RETURNS TABLE (
  id TEXT,
  name TEXT,
  description TEXT,
  badge_url TEXT,
  rarity TEXT,
  requirement_type TEXT,
  requirement_value INTEGER,
  is_unlocked BOOLEAN,
  unlocked_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    tra.id,
    tra.name,
    tra.description,
    tra.badge_url,
    tra.rarity,
    tra.requirement_type,
    tra.requirement_value,
    utra.id IS NOT NULL AS is_unlocked,
    utra.unlocked_at
  FROM taco_rain_achievements tra
  LEFT JOIN user_taco_rain_achievements utra
    ON utra.achievement_id = tra.id
   AND utra.user_id = p_user_id
  WHERE tra.is_active = true
  ORDER BY tra.sort_order ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION evaluate_taco_rain_achievements(UUID, UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION get_taco_rain_achievements_for_user(UUID) TO authenticated;
