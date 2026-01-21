-- Actualizar función find_nearby_treasures para incluir is_dynamic
DROP FUNCTION IF EXISTS find_nearby_treasures(DOUBLE PRECISION, DOUBLE PRECISION, INTEGER, UUID);

CREATE FUNCTION find_nearby_treasures(
  p_latitude DOUBLE PRECISION,
  p_longitude DOUBLE PRECISION,
  p_radius_meters INTEGER DEFAULT 1000,
  p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  coins_reward INTEGER,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  radius_meters INTEGER,
  rarity TEXT,
  distance_meters DOUBLE PRECISION,
  can_collect BOOLEAN,
  already_collected BOOLEAN,
  badge_url TEXT,
  is_dynamic BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.name,
    t.description,
    t.coins_reward,
    ST_Y(t.location) AS latitude,
    ST_X(t.location) AS longitude,
    t.radius_meters,
    t.rarity,
    ST_Distance(
      t.location::geography,
      ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography
    )::DOUBLE PRECISION AS distance_meters,
    CASE 
      WHEN t.is_active = false THEN false
      WHEN t.despawn_time IS NOT NULL AND t.despawn_time < NOW() THEN false
      WHEN t.max_collections IS NOT NULL AND t.current_collections >= t.max_collections THEN false
      WHEN p_user_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM treasure_collections tc 
        WHERE tc.user_id = p_user_id AND tc.treasure_id = t.id
      ) THEN false
      ELSE true
    END AS can_collect,
    CASE 
      WHEN p_user_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM treasure_collections tc 
        WHERE tc.user_id = p_user_id AND tc.treasure_id = t.id
      ) THEN true
      ELSE false
    END AS already_collected,
    t.badge_url,
    COALESCE(t.is_dynamic, false) AS is_dynamic
  FROM treasures t
  WHERE 
    t.is_active = true
    AND (t.despawn_time IS NULL OR t.despawn_time > NOW())
    AND ST_DWithin(
      t.location::geography,
      ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography,
      p_radius_meters
    )
  ORDER BY 
    ST_Distance(
      t.location::geography,
      ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography
    )::DOUBLE PRECISION ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION find_nearby_treasures IS 'Encuentra tesoros cercanos a una ubicación geográfica. Incluye información sobre si el tesoro es dinámico (generado aleatoriamente).';
