-- Completa el sistema de insignias Snake: mas logros, progreso visible y recompensas.

DROP FUNCTION IF EXISTS evaluate_snake_achievements(UUID, UUID, BOOLEAN);
DROP FUNCTION IF EXISTS get_snake_achievements_for_user(UUID);

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
) VALUES
  ('snake_first_game', 'Primera Serpiente', 'Juega tu primera partida de Snake Mundial.', '/snake-badges/snake-first-game.png', 'common', 'games_played', 1, 25, 10),
  ('snake_rookie_100', 'Instinto Arcade', 'Alcanza 100 puntos en Snake Mundial.', '/snake-badges/snake-rookie.png', 'common', 'best_score', 100, 35, 20),
  ('snake_level_3', 'Ritmo de Jungla', 'Alcanza el nivel 3 en una partida.', '/snake-badges/snake-level-3.png', 'rare', 'best_level', 3, 60, 30),
  ('snake_record_breaker', 'Rompe Records', 'Supera tu marca personal.', '/snake-badges/snake-record-breaker.png', 'rare', 'record_breaker', 1, 75, 40),
  ('snake_weekly_top_10', 'Top Semanal', 'Entra al top 10 de la temporada semanal.', '/snake-badges/snake-weekly-top-10.png', 'epic', 'weekly_rank', 10, 120, 50),
  ('snake_combo_10', 'Combo Electrico', 'Logra un combo x10 en una partida.', '/snake-badges/snake-combo-10.png', 'rare', 'best_combo', 10, 80, 60),
  ('snake_10_games', 'Veterano Arcade', 'Juega 10 partidas rankeadas de Snake Mundial.', '/snake-badges/snake-10-games.png', 'rare', 'games_played', 10, 90, 70),
  ('snake_100_fruits', 'Recolector Salvaje', 'Recolecta 100 frutas en total.', '/snake-badges/snake-100-fruits.png', 'rare', 'total_food', 100, 100, 80),
  ('snake_first_chest', 'Cazador de Cofres', 'Abre tu primer cofre diario de Snake.', '/snake-badges/snake-first-chest.png', 'rare', 'chests_opened', 1, 90, 90),
  ('snake_streak_3', 'Racha Encendida', 'Mantén una racha diaria de 3 días.', '/snake-badges/snake-streak-3.png', 'rare', 'best_streak', 3, 120, 100),
  ('snake_streak_7', 'Semana Serpiente', 'Mantén una racha diaria de 7 días.', '/snake-badges/snake-streak-7.png', 'epic', 'best_streak', 7, 250, 110),
  ('snake_score_1000', 'Mil Voltios', 'Alcanza 1,000 puntos en Snake Mundial.', '/snake-badges/snake-score-1000.png', 'epic', 'best_score', 1000, 150, 120),
  ('snake_score_5000', 'Leyenda Neon', 'Alcanza 5,000 puntos en Snake Mundial.', '/snake-badges/snake-score-5000.png', 'legendary', 'best_score', 5000, 500, 130),
  ('snake_rainbow_3', 'Arcoiris Dominado', 'Recolecta 3 frutas arcoiris en total.', '/snake-badges/snake-rainbow-3.png', 'epic', 'rainbow_fruits', 3, 180, 140),
  ('snake_10_daily_challenges', 'Disciplina Diaria', 'Completa 10 retos diarios de Snake.', '/snake-badges/snake-10-daily-challenges.png', 'epic', 'completed_daily_challenges', 10, 220, 150)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  badge_url = EXCLUDED.badge_url,
  rarity = EXCLUDED.rarity,
  requirement_type = EXCLUDED.requirement_type,
  requirement_value = EXCLUDED.requirement_value,
  coins_reward = EXCLUDED.coins_reward,
  sort_order = EXCLUDED.sort_order,
  is_active = TRUE;

CREATE OR REPLACE FUNCTION evaluate_snake_achievements(
  p_user_id UUID,
  p_score_id UUID,
  p_is_personal_best BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  id TEXT,
  name TEXT,
  description TEXT,
  badge_url TEXT,
  rarity TEXT,
  coins_reward INTEGER,
  unlocked_at TIMESTAMPTZ
) AS $$
DECLARE
  v_user_id UUID;
  v_stats snake_player_stats%ROWTYPE;
  v_weekly_rank BIGINT;
  v_best_combo INTEGER := 0;
  v_rainbow_fruits INTEGER := 0;
  v_chests_opened INTEGER := 0;
  v_best_streak INTEGER := 0;
  v_completed_daily_challenges INTEGER := 0;
BEGIN
  v_user_id := COALESCE(p_user_id, auth.uid());

  IF v_user_id IS NULL OR v_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Usuario no autorizado';
  END IF;

  SELECT *
  INTO v_stats
  FROM snake_player_stats
  WHERE user_id = v_user_id;

  WITH ranked AS (
    SELECT
      sse.user_id,
      RANK() OVER (ORDER BY sse.best_score DESC, sse.last_played_at ASC) AS player_rank
    FROM snake_season_entries sse
    INNER JOIN snake_seasons ss ON ss.id = sse.season_id
    WHERE ss.status = 'active'
  )
  SELECT ranked.player_rank
  INTO v_weekly_rank
  FROM ranked
  WHERE ranked.user_id = v_user_id;

  SELECT COALESCE(MAX(NULLIF(s.metadata #>> '{combo,best}', '')::INTEGER), 0)
  INTO v_best_combo
  FROM snake_scores s
  WHERE s.user_id = v_user_id;

  SELECT COALESCE(SUM(COALESCE(NULLIF(s.metadata #>> '{fruitCounts,rainbow}', '')::INTEGER, 0)), 0)::INTEGER
  INTO v_rainbow_fruits
  FROM snake_scores s
  WHERE s.user_id = v_user_id;

  SELECT
    COALESCE(sds.chests_opened, 0),
    COALESCE(sds.best_streak, 0)
  INTO v_chests_opened, v_best_streak
  FROM snake_daily_streaks sds
  WHERE sds.user_id = v_user_id;

  v_chests_opened := COALESCE(v_chests_opened, 0);
  v_best_streak := COALESCE(v_best_streak, 0);

  SELECT COUNT(*)::INTEGER
  INTO v_completed_daily_challenges
  FROM user_snake_daily_challenges usdc
  WHERE usdc.user_id = v_user_id
    AND usdc.completed_at IS NOT NULL;

  WITH unlocked AS (
    INSERT INTO user_snake_achievements (user_id, achievement_id, source_score_id, metadata)
    SELECT
      v_user_id,
      sa.id,
      p_score_id,
      jsonb_build_object(
        'best_score', COALESCE(v_stats.best_score, 0),
        'games_played', COALESCE(v_stats.games_played, 0),
        'total_food', COALESCE(v_stats.total_food, 0),
        'best_level', COALESCE(v_stats.best_level, 1),
        'weekly_rank', v_weekly_rank,
        'best_combo', v_best_combo,
        'rainbow_fruits', v_rainbow_fruits,
        'chests_opened', v_chests_opened,
        'best_streak', v_best_streak,
        'completed_daily_challenges', v_completed_daily_challenges
      )
    FROM snake_achievements sa
    WHERE sa.is_active = TRUE
      AND (
        (sa.requirement_type = 'games_played' AND COALESCE(v_stats.games_played, 0) >= sa.requirement_value)
        OR (sa.requirement_type = 'best_score' AND COALESCE(v_stats.best_score, 0) >= sa.requirement_value)
        OR (sa.requirement_type = 'best_level' AND COALESCE(v_stats.best_level, 1) >= sa.requirement_value)
        OR (sa.requirement_type = 'total_food' AND COALESCE(v_stats.total_food, 0) >= sa.requirement_value)
        OR (sa.requirement_type = 'record_breaker' AND p_is_personal_best = TRUE)
        OR (sa.requirement_type = 'weekly_rank' AND v_weekly_rank IS NOT NULL AND v_weekly_rank <= sa.requirement_value)
        OR (sa.requirement_type = 'best_combo' AND v_best_combo >= sa.requirement_value)
        OR (sa.requirement_type = 'rainbow_fruits' AND v_rainbow_fruits >= sa.requirement_value)
        OR (sa.requirement_type = 'chests_opened' AND v_chests_opened >= sa.requirement_value)
        OR (sa.requirement_type = 'best_streak' AND v_best_streak >= sa.requirement_value)
        OR (sa.requirement_type = 'completed_daily_challenges' AND v_completed_daily_challenges >= sa.requirement_value)
      )
    ON CONFLICT (user_id, achievement_id) DO NOTHING
    RETURNING achievement_id, unlocked_at
  ),
  granted AS (
    SELECT
      u.achievement_id,
      grant_coins(
        v_user_id,
        sa.coins_reward,
        'achievement',
        'Insignia Snake: ' || sa.name,
        p_score_id
      ) AS grant_result
    FROM unlocked u
    INNER JOIN snake_achievements sa ON sa.id = u.achievement_id
    WHERE sa.coins_reward > 0
  )
  SELECT
    sa.id,
    sa.name,
    sa.description,
    sa.badge_url,
    sa.rarity,
    sa.coins_reward,
    u.unlocked_at
  FROM unlocked u
  INNER JOIN snake_achievements sa ON sa.id = u.achievement_id
  LEFT JOIN granted g ON g.achievement_id = u.achievement_id
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
  unlocked_at TIMESTAMPTZ,
  progress_value INTEGER,
  target_value INTEGER,
  progress_label TEXT
) AS $$
DECLARE
  v_user_id UUID;
  v_stats snake_player_stats%ROWTYPE;
  v_weekly_rank BIGINT;
  v_best_combo INTEGER := 0;
  v_rainbow_fruits INTEGER := 0;
  v_chests_opened INTEGER := 0;
  v_best_streak INTEGER := 0;
  v_completed_daily_challenges INTEGER := 0;
BEGIN
  v_user_id := COALESCE(p_user_id, auth.uid());

  IF v_user_id IS NULL OR v_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Usuario no autorizado';
  END IF;

  SELECT *
  INTO v_stats
  FROM snake_player_stats
  WHERE user_id = v_user_id;

  WITH ranked AS (
    SELECT
      sse.user_id,
      RANK() OVER (ORDER BY sse.best_score DESC, sse.last_played_at ASC) AS player_rank
    FROM snake_season_entries sse
    INNER JOIN snake_seasons ss ON ss.id = sse.season_id
    WHERE ss.status = 'active'
  )
  SELECT ranked.player_rank
  INTO v_weekly_rank
  FROM ranked
  WHERE ranked.user_id = v_user_id;

  SELECT COALESCE(MAX(NULLIF(s.metadata #>> '{combo,best}', '')::INTEGER), 0)
  INTO v_best_combo
  FROM snake_scores s
  WHERE s.user_id = v_user_id;

  SELECT COALESCE(SUM(COALESCE(NULLIF(s.metadata #>> '{fruitCounts,rainbow}', '')::INTEGER, 0)), 0)::INTEGER
  INTO v_rainbow_fruits
  FROM snake_scores s
  WHERE s.user_id = v_user_id;

  SELECT
    COALESCE(sds.chests_opened, 0),
    COALESCE(sds.best_streak, 0)
  INTO v_chests_opened, v_best_streak
  FROM snake_daily_streaks sds
  WHERE sds.user_id = v_user_id;

  v_chests_opened := COALESCE(v_chests_opened, 0);
  v_best_streak := COALESCE(v_best_streak, 0);

  SELECT COUNT(*)::INTEGER
  INTO v_completed_daily_challenges
  FROM user_snake_daily_challenges usdc
  WHERE usdc.user_id = v_user_id
    AND usdc.completed_at IS NOT NULL;

  RETURN QUERY
  WITH progress AS (
    SELECT
      sa.id AS achievement_id,
      CASE sa.requirement_type
        WHEN 'games_played' THEN COALESCE(v_stats.games_played, 0)
        WHEN 'best_score' THEN COALESCE(v_stats.best_score, 0)
        WHEN 'best_level' THEN COALESCE(v_stats.best_level, 1)
        WHEN 'total_food' THEN COALESCE(v_stats.total_food, 0)
        WHEN 'record_breaker' THEN CASE WHEN usa.id IS NOT NULL THEN 1 ELSE 0 END
        WHEN 'weekly_rank' THEN CASE WHEN v_weekly_rank IS NOT NULL AND v_weekly_rank <= sa.requirement_value THEN sa.requirement_value ELSE 0 END
        WHEN 'best_combo' THEN v_best_combo
        WHEN 'rainbow_fruits' THEN v_rainbow_fruits
        WHEN 'chests_opened' THEN v_chests_opened
        WHEN 'best_streak' THEN v_best_streak
        WHEN 'completed_daily_challenges' THEN v_completed_daily_challenges
        ELSE 0
      END AS value
    FROM snake_achievements sa
    LEFT JOIN user_snake_achievements usa
      ON usa.achievement_id = sa.id
     AND usa.user_id = v_user_id
    WHERE sa.is_active = TRUE
  )
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
    usa.unlocked_at,
    LEAST(progress.value, sa.requirement_value) AS progress_value,
    sa.requirement_value AS target_value,
    CASE
      WHEN sa.requirement_type = 'weekly_rank' AND v_weekly_rank IS NOT NULL THEN '#' || v_weekly_rank || ' / Top ' || sa.requirement_value
      WHEN sa.requirement_type = 'record_breaker' AND usa.id IS NULL THEN 'Pendiente'
      ELSE LEAST(progress.value, sa.requirement_value)::TEXT || '/' || sa.requirement_value::TEXT
    END AS progress_label
  FROM snake_achievements sa
  INNER JOIN progress ON progress.achievement_id = sa.id
  LEFT JOIN user_snake_achievements usa
    ON usa.achievement_id = sa.id
   AND usa.user_id = v_user_id
  WHERE sa.is_active = TRUE
  ORDER BY sa.sort_order ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION evaluate_snake_achievements(UUID, UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION get_snake_achievements_for_user(UUID) TO authenticated;
