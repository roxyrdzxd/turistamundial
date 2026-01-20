-- Migración para agregar campos de ciudad/región a tesoros
-- Permite filtrar insignias por ubicación geográfica

-- Agregar columnas de ubicación geográfica
ALTER TABLE treasures 
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS region TEXT,
ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'México';

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_treasures_city ON treasures(city) WHERE city IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_treasures_region ON treasures(region) WHERE region IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_treasures_country ON treasures(country);

-- Función para obtener todas las insignias con filtros
CREATE OR REPLACE FUNCTION get_all_badges(
  p_search TEXT DEFAULT NULL,
  p_rarity TEXT[] DEFAULT NULL,
  p_city TEXT DEFAULT NULL,
  p_collected_by_user UUID DEFAULT NULL,
  p_sort_by TEXT DEFAULT 'name',
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  coins_reward INTEGER,
  rarity TEXT,
  badge_url TEXT,
  city TEXT,
  region TEXT,
  country TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  is_collected BOOLEAN,
  total_collections BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH badge_counts AS (
    SELECT 
      treasure_id,
      COUNT(*)::BIGINT AS total_collections
    FROM user_treasure_badges
    GROUP BY treasure_id
  )
  SELECT 
    t.id,
    t.name,
    t.description,
    t.coins_reward,
    t.rarity,
    t.badge_url,
    t.city,
    t.region,
    t.country,
    ST_Y(t.location) AS latitude,
    ST_X(t.location) AS longitude,
    CASE 
      WHEN p_collected_by_user IS NOT NULL AND EXISTS (
        SELECT 1 FROM user_treasure_badges utb 
        WHERE utb.treasure_id = t.id AND utb.user_id = p_collected_by_user
      ) THEN true
      ELSE false
    END AS is_collected,
    COALESCE(bc.total_collections, 0)::BIGINT AS total_collections
  FROM treasures t
  LEFT JOIN badge_counts bc ON t.id = bc.treasure_id
  WHERE 
    t.badge_url IS NOT NULL 
    AND t.badge_url != ''
    AND t.is_active = true
    AND (p_search IS NULL OR t.name ILIKE '%' || p_search || '%' OR t.description ILIKE '%' || p_search || '%')
    AND (p_rarity IS NULL OR t.rarity = ANY(p_rarity))
    AND (p_city IS NULL OR t.city = p_city)
  ORDER BY 
    CASE 
      WHEN p_sort_by = 'rarity' THEN 
        CASE t.rarity
          WHEN 'legendary' THEN 1
          WHEN 'epic' THEN 2
          WHEN 'rare' THEN 3
          WHEN 'common' THEN 4
        END
      WHEN p_sort_by = 'coins' THEN t.coins_reward
      WHEN p_sort_by = 'popularity' THEN COALESCE(bc.total_collections, 0)
      ELSE 0
    END,
    CASE WHEN p_sort_by = 'name' THEN t.name ELSE NULL END ASC,
    CASE WHEN p_sort_by = 'coins' OR p_sort_by = 'popularity' OR p_sort_by = 'rarity' THEN t.name ELSE NULL END ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener lista de ciudades disponibles
CREATE OR REPLACE FUNCTION get_available_cities()
RETURNS TABLE (
  city TEXT,
  region TEXT,
  country TEXT,
  badge_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.city,
    t.region,
    t.country,
    COUNT(DISTINCT t.id)::BIGINT AS badge_count
  FROM treasures t
  WHERE 
    t.badge_url IS NOT NULL 
    AND t.badge_url != ''
    AND t.is_active = true
    AND t.city IS NOT NULL
  GROUP BY t.city, t.region, t.country
  ORDER BY badge_count DESC, t.city ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para contar total de insignias (para paginación)
CREATE OR REPLACE FUNCTION count_all_badges(
  p_search TEXT DEFAULT NULL,
  p_rarity TEXT[] DEFAULT NULL,
  p_city TEXT DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(DISTINCT t.id) INTO v_count
  FROM treasures t
  WHERE 
    t.badge_url IS NOT NULL 
    AND t.badge_url != ''
    AND t.is_active = true
    AND (p_search IS NULL OR t.name ILIKE '%' || p_search || '%' OR t.description ILIKE '%' || p_search || '%')
    AND (p_rarity IS NULL OR t.rarity = ANY(p_rarity))
    AND (p_city IS NULL OR t.city = p_city);
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentarios
COMMENT ON COLUMN treasures.city IS 'Ciudad donde se encuentra el tesoro/insignia';
COMMENT ON COLUMN treasures.region IS 'Región o estado donde se encuentra el tesoro';
COMMENT ON COLUMN treasures.country IS 'País donde se encuentra el tesoro';
COMMENT ON FUNCTION get_all_badges IS 'Obtiene todas las insignias disponibles con filtros y ordenamiento. Incluye información de si el usuario las ha recolectado.';
COMMENT ON FUNCTION get_available_cities IS 'Obtiene lista de ciudades que tienen insignias disponibles, con conteo de insignias por ciudad.';
COMMENT ON FUNCTION count_all_badges IS 'Cuenta el total de insignias que coinciden con los filtros aplicados.';
