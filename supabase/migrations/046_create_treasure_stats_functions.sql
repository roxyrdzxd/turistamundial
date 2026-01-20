-- Funciones para obtener estadísticas de exploración de tesoros

-- Función para obtener estadísticas generales de un usuario
CREATE OR REPLACE FUNCTION get_treasure_stats(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_stats JSONB;
  v_total_collected INTEGER;
  v_total_coins INTEGER;
  v_by_rarity JSONB;
  v_days_consecutive INTEGER;
  v_total_distance DOUBLE PRECISION;
  v_today_count INTEGER;
  v_week_count INTEGER;
  v_month_count INTEGER;
BEGIN
  -- Total de tesoros recolectados
  SELECT COUNT(*) INTO v_total_collected
  FROM treasure_collections
  WHERE user_id = p_user_id;

  -- Total de coins ganados
  SELECT COALESCE(SUM(coins_earned), 0) INTO v_total_coins
  FROM treasure_collections
  WHERE user_id = p_user_id;

  -- Desglose por rareza
  SELECT jsonb_build_object(
    'common', COALESCE(common_count, 0),
    'rare', COALESCE(rare_count, 0),
    'epic', COALESCE(epic_count, 0),
    'legendary', COALESCE(legendary_count, 0)
  ) INTO v_by_rarity
  FROM (
    SELECT 
      COUNT(*) FILTER (WHERE t.rarity = 'common') as common_count,
      COUNT(*) FILTER (WHERE t.rarity = 'rare') as rare_count,
      COUNT(*) FILTER (WHERE t.rarity = 'epic') as epic_count,
      COUNT(*) FILTER (WHERE t.rarity = 'legendary') as legendary_count
    FROM treasure_collections tc
    JOIN treasures t ON tc.treasure_id = t.id
    WHERE tc.user_id = p_user_id
  ) rarity_counts;

  -- Días consecutivos explorando (simplificado)
  WITH daily_collections AS (
    SELECT DISTINCT DATE(collected_at) as collection_date
    FROM treasure_collections
    WHERE user_id = p_user_id
      AND collected_at >= CURRENT_DATE - INTERVAL '30 days'
    ORDER BY collection_date DESC
  ),
  consecutive_groups AS (
    SELECT 
      collection_date,
      collection_date - (ROW_NUMBER() OVER (ORDER BY collection_date DESC))::INTEGER as grp
    FROM daily_collections
  )
  SELECT COALESCE(MAX(consecutive_count), 0) INTO v_days_consecutive
  FROM (
    SELECT COUNT(*) as consecutive_count
    FROM consecutive_groups
    GROUP BY grp
  ) group_counts;

  -- Distancia total recorrida (simplificado - aproximación basada en número de recolecciones)
  -- Estimación: promedio de 500m por recolección (si hay múltiples)
  IF v_total_collected > 1 THEN
    v_total_distance := (v_total_collected - 1) * 0.5; -- 0.5 km por recolección adicional
  ELSE
    v_total_distance := 0;
  END IF;

  -- Contadores por período
  SELECT COUNT(*) INTO v_today_count
  FROM treasure_collections
  WHERE user_id = p_user_id
    AND DATE(collected_at) = CURRENT_DATE;

  SELECT COUNT(*) INTO v_week_count
  FROM treasure_collections
  WHERE user_id = p_user_id
    AND collected_at >= DATE_TRUNC('week', CURRENT_DATE);

  SELECT COUNT(*) INTO v_month_count
  FROM treasure_collections
  WHERE user_id = p_user_id
    AND collected_at >= DATE_TRUNC('month', CURRENT_DATE);

  -- Construir objeto de respuesta
  v_stats := jsonb_build_object(
    'total_collected', v_total_collected,
    'total_coins', v_total_coins,
    'by_rarity', v_by_rarity,
    'days_consecutive', COALESCE(v_days_consecutive, 0),
    'total_distance_km', ROUND(COALESCE(v_total_distance, 0)::numeric, 2),
    'today_count', v_today_count,
    'week_count', v_week_count,
    'month_count', v_month_count
  );

  RETURN v_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener historial de recolecciones (últimos N días)
CREATE OR REPLACE FUNCTION get_treasure_history(p_user_id UUID, p_days INTEGER DEFAULT 30)
RETURNS TABLE (
  date DATE,
  count INTEGER,
  coins INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    DATE(tc.collected_at) as date,
    COUNT(*)::INTEGER as count,
    SUM(tc.coins_earned)::INTEGER as coins
  FROM treasure_collections tc
  WHERE tc.user_id = p_user_id
    AND tc.collected_at >= CURRENT_DATE - (p_days || ' days')::INTERVAL
  GROUP BY DATE(tc.collected_at)
  ORDER BY date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener ranking de exploradores
CREATE OR REPLACE FUNCTION get_treasure_leaderboard(p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  total_collected INTEGER,
  total_coins INTEGER,
  rank INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH user_stats AS (
    SELECT 
      tc.user_id,
      p.username,
      COUNT(*)::INTEGER as total_collected,
      SUM(tc.coins_earned)::INTEGER as total_coins
    FROM treasure_collections tc
    JOIN profiles p ON tc.user_id = p.id
    GROUP BY tc.user_id, p.username
  )
  SELECT 
    us.user_id,
    us.username,
    us.total_collected,
    us.total_coins,
    ROW_NUMBER() OVER (ORDER BY us.total_collected DESC, us.total_coins DESC)::INTEGER as rank
  FROM user_stats us
  ORDER BY us.total_collected DESC, us.total_coins DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentarios
COMMENT ON FUNCTION get_treasure_stats IS 'Obtiene estadísticas completas de exploración de tesoros para un usuario';
COMMENT ON FUNCTION get_treasure_history IS 'Obtiene historial de recolecciones de tesoros por día';
COMMENT ON FUNCTION get_treasure_leaderboard IS 'Obtiene ranking de exploradores de tesoros';
