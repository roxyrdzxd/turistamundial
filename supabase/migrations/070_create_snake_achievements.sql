-- Logros e insignias arcade para Snake Mundial

CREATE TABLE IF NOT EXISTS snake_achievements (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  badge_url TEXT NOT NULL,
  rarity TEXT NOT NULL DEFAULT 'common' CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  requirement_type TEXT NOT NULL,
  requirement_value INTEGER NOT NULL DEFAULT 1,
  coins_reward INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_snake_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL REFERENCES snake_achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source_score_id UUID REFERENCES snake_scores(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (user_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_user_snake_achievements_user
  ON user_snake_achievements (user_id, unlocked_at DESC);

ALTER TABLE snake_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_snake_achievements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Snake achievements are public readable" ON snake_achievements;
CREATE POLICY "Snake achievements are public readable"
  ON snake_achievements FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Users can view own snake achievements" ON user_snake_achievements;
CREATE POLICY "Users can view own snake achievements"
  ON user_snake_achievements FOR SELECT
  USING (auth.uid() = user_id);

INSERT INTO snake_achievements (
  id,
  name,
  description,
  badge_url,
  rarity,
  requirement_type,
  requirement_value,
  coins_reward,
  sort_order
)
VALUES
  (
    'snake_first_game',
    'Primera Serpiente',
    'Juega tu primera partida de Snake Mundial.',
    '/snake-badges/snake-first-game.png',
    'common',
    'games_played',
    1,
    0,
    10
  ),
  (
    'snake_rookie_100',
    'Instinto Arcade',
    'Alcanza 100 puntos en Snake Mundial.',
    '/snake-badges/snake-rookie.png',
    'common',
    'best_score',
    100,
    0,
    20
  ),
  (
    'snake_level_3',
    'Ritmo de Jungla',
    'Alcanza el nivel 3 en una partida.',
    '/snake-badges/snake-level-3.png',
    'rare',
    'best_level',
    3,
    0,
    30
  ),
  (
    'snake_record_breaker',
    'Rompe Records',
    'Supera tu marca personal.',
    '/snake-badges/snake-record-breaker.png',
    'rare',
    'record_breaker',
    1,
    0,
    40
  ),
  (
    'snake_weekly_top_10',
    'Top Semanal',
    'Entra al top 10 de la temporada semanal.',
    '/snake-badges/snake-weekly-top-10.png',
    'epic',
    'weekly_rank',
    10,
    0,
    50
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  badge_url = EXCLUDED.badge_url,
  rarity = EXCLUDED.rarity,
  requirement_type = EXCLUDED.requirement_type,
  requirement_value = EXCLUDED.requirement_value,
  coins_reward = EXCLUDED.coins_reward,
  sort_order = EXCLUDED.sort_order,
  is_active = true;

CREATE OR REPLACE FUNCTION evaluate_snake_achievements(
  p_user_id UUID,
  p_score_id UUID,
  p_is_personal_best BOOLEAN DEFAULT false
)
RETURNS TABLE (
  achievement_id TEXT,
  name TEXT,
  description TEXT,
  badge_url TEXT,
  rarity TEXT,
  unlocked_at TIMESTAMPTZ
) AS $$
DECLARE
  v_stats snake_player_stats%ROWTYPE;
  v_weekly_rank BIGINT;
BEGIN
  SELECT *
  INTO v_stats
  FROM snake_player_stats
  WHERE user_id = p_user_id;

  WITH ranked AS (
    SELECT
      sse.user_id,
      RANK() OVER (ORDER BY sse.best_score DESC, sse.last_played_at ASC) AS rank
    FROM snake_season_entries sse
    INNER JOIN snake_seasons ss ON ss.id = sse.season_id
    WHERE ss.status = 'active'
  )
  SELECT rank
  INTO v_weekly_rank
  FROM ranked
  WHERE user_id = p_user_id;

  INSERT INTO user_snake_achievements (user_id, achievement_id, source_score_id, metadata)
  SELECT
    p_user_id,
    sa.id,
    p_score_id,
    jsonb_build_object(
      'best_score', COALESCE(v_stats.best_score, 0),
      'games_played', COALESCE(v_stats.games_played, 0),
      'best_level', COALESCE(v_stats.best_level, 1),
      'weekly_rank', v_weekly_rank
    )
  FROM snake_achievements sa
  WHERE sa.is_active = true
    AND (
      (sa.requirement_type = 'games_played' AND COALESCE(v_stats.games_played, 0) >= sa.requirement_value)
      OR (sa.requirement_type = 'best_score' AND COALESCE(v_stats.best_score, 0) >= sa.requirement_value)
      OR (sa.requirement_type = 'best_level' AND COALESCE(v_stats.best_level, 1) >= sa.requirement_value)
      OR (sa.requirement_type = 'record_breaker' AND p_is_personal_best = true)
      OR (sa.requirement_type = 'weekly_rank' AND v_weekly_rank IS NOT NULL AND v_weekly_rank <= sa.requirement_value)
    )
  ON CONFLICT (user_id, achievement_id) DO NOTHING;

  RETURN QUERY
  SELECT
    sa.id,
    sa.name,
    sa.description,
    sa.badge_url,
    sa.rarity,
    usa.unlocked_at
  FROM user_snake_achievements usa
  INNER JOIN snake_achievements sa ON sa.id = usa.achievement_id
  WHERE usa.user_id = p_user_id
    AND usa.source_score_id = p_score_id
  ORDER BY sa.sort_order ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION get_snake_achievements_for_user(p_user_id UUID DEFAULT auth.uid())
RETURNS TABLE (
  id TEXT,
  name TEXT,
  description TEXT,
  badge_url TEXT,
  rarity TEXT,
  requirement_type TEXT,
  requirement_value INTEGER,
  coins_reward INTEGER,
  is_unlocked BOOLEAN,
  unlocked_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sa.id,
    sa.name,
    sa.description,
    sa.badge_url,
    sa.rarity,
    sa.requirement_type,
    sa.requirement_value,
    sa.coins_reward,
    usa.id IS NOT NULL AS is_unlocked,
    usa.unlocked_at
  FROM snake_achievements sa
  LEFT JOIN user_snake_achievements usa
    ON usa.achievement_id = sa.id
   AND usa.user_id = p_user_id
  WHERE sa.is_active = true
  ORDER BY sa.sort_order ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION evaluate_snake_achievements(UUID, UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION get_snake_achievements_for_user(UUID) TO authenticated;
