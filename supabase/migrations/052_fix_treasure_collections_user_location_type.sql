-- Fix: Cambiar tipo de columna user_location de POINT a GEOMETRY(POINT, 4326)
-- Esto corrige el error al insertar recolecciones de tesoros

-- Habilitar extensión PostGIS si no está habilitada
CREATE EXTENSION IF NOT EXISTS postgis;

-- Cambiar tipo de columna user_location en treasure_collections
-- Método directo que funciona mejor
ALTER TABLE treasure_collections 
  ALTER COLUMN user_location TYPE GEOMETRY(POINT, 4326) 
  USING CASE 
    WHEN user_location IS NULL THEN NULL
    WHEN pg_typeof(user_location)::text = 'point' THEN
      ST_SetSRID(
        ST_MakePoint(
          (user_location::point)[0],  -- longitude (x)
          (user_location::point)[1]   -- latitude (y)
        ),
        4326
      )
    ELSE
      user_location::geometry
  END;

-- Verificar el cambio
SELECT 
  table_name,
  column_name,
  data_type,
  udt_name
FROM information_schema.columns 
WHERE table_name = 'treasure_collections' 
  AND column_name = 'user_location';

-- Comentario
COMMENT ON COLUMN treasure_collections.user_location IS 'Ubicación del usuario al recolectar usando PostGIS GEOMETRY(POINT, 4326)';
