-- Migración para cambiar el tipo de columna location de POINT a GEOMETRY(POINT, 4326)
-- Esto corrige el error de compatibilidad con PostGIS

-- Habilitar extensión PostGIS si no está habilitada
CREATE EXTENSION IF NOT EXISTS postgis;

-- Cambiar tipo de columna location en treasures
-- Si la tabla ya tiene datos, los convertimos usando ST_SetSRID
DO $$
BEGIN
  -- Verificar si la columna existe y es de tipo POINT
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'treasures' 
    AND column_name = 'location' 
    AND data_type = 'USER-DEFINED'
    AND udt_name = 'point'
  ) THEN
    -- Si hay datos, convertir primero a geometry
    IF EXISTS (SELECT 1 FROM treasures LIMIT 1) THEN
      -- Convertir datos existentes
      ALTER TABLE treasures 
        ALTER COLUMN location TYPE GEOMETRY(POINT, 4326) 
        USING ST_SetSRID(
          ST_MakePoint(
            (location::point)[0],  -- longitude (x)
            (location::point)[1]   -- latitude (y)
          ),
          4326
        );
    ELSE
      -- Si no hay datos, solo cambiar el tipo
      ALTER TABLE treasures 
        ALTER COLUMN location TYPE GEOMETRY(POINT, 4326);
    END IF;
  END IF;
END $$;

-- Cambiar tipo de columna user_location en treasure_collections
DO $$
BEGIN
  -- Verificar si la columna existe y es de tipo POINT
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'treasure_collections' 
    AND column_name = 'user_location' 
    AND data_type = 'USER-DEFINED'
    AND udt_name = 'point'
  ) THEN
    -- Si hay datos, convertir primero a geometry
    IF EXISTS (SELECT 1 FROM treasure_collections LIMIT 1) THEN
      -- Convertir datos existentes
      ALTER TABLE treasure_collections 
        ALTER COLUMN user_location TYPE GEOMETRY(POINT, 4326) 
        USING ST_SetSRID(
          ST_MakePoint(
            (user_location::point)[0],  -- longitude (x)
            (user_location::point)[1]   -- latitude (y)
          ),
          4326
        );
    ELSE
      -- Si no hay datos, solo cambiar el tipo
      ALTER TABLE treasure_collections 
        ALTER COLUMN user_location TYPE GEOMETRY(POINT, 4326);
    END IF;
  END IF;
END $$;

-- Comentario para documentación
COMMENT ON COLUMN treasures.location IS 'Ubicación del tesoro usando PostGIS GEOMETRY(POINT, 4326) para compatibilidad con funciones PostGIS';
COMMENT ON COLUMN treasure_collections.user_location IS 'Ubicación del usuario al recolectar usando PostGIS GEOMETRY(POINT, 4326)';
