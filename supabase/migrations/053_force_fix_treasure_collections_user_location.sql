-- Script directo para forzar el cambio de tipo de POINT a GEOMETRY
-- Ejecuta este script directamente en Supabase SQL Editor si la migración 052 no funcionó

-- Habilitar PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- Método directo: Cambio forzado de tipo
ALTER TABLE treasure_collections 
  ALTER COLUMN user_location TYPE GEOMETRY(POINT, 4326) 
  USING CASE 
    WHEN user_location IS NULL THEN NULL
    ELSE ST_SetSRID(
      ST_MakePoint(
        (user_location::point)[0],  -- longitude (x)
        (user_location::point)[1]   -- latitude (y)
      ),
      4326
    )
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
