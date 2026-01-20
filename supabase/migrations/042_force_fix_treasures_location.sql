-- Script directo para forzar el cambio de tipo de POINT a GEOMETRY
-- Ejecuta este script directamente en Supabase SQL Editor

-- Habilitar PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- Método 1: Cambio directo (funciona si no hay datos o si PostgreSQL permite la conversión)
ALTER TABLE treasures 
  ALTER COLUMN location TYPE GEOMETRY(POINT, 4326) 
  USING CASE 
    WHEN location IS NULL THEN NULL
    ELSE ST_SetSRID(
      ST_MakePoint(
        (location::point)[0],  -- longitude (x)
        (location::point)[1]   -- latitude (y)
      ),
      4326
    )
  END;

-- Método 2: Si el método 1 falla, usar este (comentar el método 1 y descomentar este)
/*
-- Crear columna temporal
ALTER TABLE treasures ADD COLUMN location_new GEOMETRY(POINT, 4326);

-- Copiar y convertir datos
UPDATE treasures 
SET location_new = ST_SetSRID(
  ST_MakePoint(
    (location::point)[0],
    (location::point)[1]
  ),
  4326
);

-- Eliminar columna antigua
ALTER TABLE treasures DROP COLUMN location;

-- Renombrar nueva columna
ALTER TABLE treasures RENAME COLUMN location_new TO location;

-- Restaurar NOT NULL si era necesario
ALTER TABLE treasures ALTER COLUMN location SET NOT NULL;
*/

-- Hacer lo mismo para treasure_collections
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
WHERE table_name IN ('treasures', 'treasure_collections') 
  AND column_name IN ('location', 'user_location');
