-- Migración para agregar estadísticas de medallas recolectadas
-- Permite a los administradores ver cuántos usuarios han recolectado cada medalla

-- Función para obtener estadísticas de medallas recolectadas por tesoro
CREATE OR REPLACE FUNCTION get_treasure_badge_stats(p_treasure_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_total_collections INTEGER;
  v_recent_collections INTEGER; -- Últimas 24 horas
BEGIN
  -- Contar total de medallas recolectadas
  SELECT COUNT(*) INTO v_total_collections
  FROM user_treasure_badges
  WHERE treasure_id = p_treasure_id;
  
  -- Contar medallas recolectadas en las últimas 24 horas
  SELECT COUNT(*) INTO v_recent_collections
  FROM user_treasure_badges
  WHERE treasure_id = p_treasure_id
    AND collected_at >= NOW() - INTERVAL '24 hours';
  
  RETURN jsonb_build_object(
    'total_collections', v_total_collections,
    'recent_collections', v_recent_collections
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener estadísticas de todas las medallas (para admin)
CREATE OR REPLACE FUNCTION get_all_treasure_badge_stats()
RETURNS TABLE (
  treasure_id UUID,
  treasure_name TEXT,
  badge_url TEXT,
  total_collections BIGINT,
  recent_collections BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.name,
    t.badge_url,
    COALESCE(COUNT(utb.id), 0)::BIGINT as total_collections,
    COALESCE(COUNT(CASE WHEN utb.collected_at >= NOW() - INTERVAL '24 hours' THEN 1 END), 0)::BIGINT as recent_collections
  FROM treasures t
  LEFT JOIN user_treasure_badges utb ON t.id = utb.treasure_id
  WHERE t.badge_url IS NOT NULL AND t.badge_url != ''
  GROUP BY t.id, t.name, t.badge_url
  ORDER BY total_collections DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentarios
COMMENT ON FUNCTION get_treasure_badge_stats IS 'Obtiene estadísticas de medallas recolectadas para un tesoro específico. Retorna total y colecciones recientes (24h).';
COMMENT ON FUNCTION get_all_treasure_badge_stats IS 'Obtiene estadísticas de todas las medallas para el panel de administración. Solo incluye tesoros que tienen badge_url.';
