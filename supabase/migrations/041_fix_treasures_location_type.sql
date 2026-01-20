-- Migración para cambiar el tipo de columna location de POINT a GEOMETRY(POINT, 4326)
-- Script más directo que fuerza el cambio

-- Habilitar extensión PostGIS si no está habilitada
CREATE EXTENSION IF NOT EXISTS postgis;

-- Cambiar tipo de columna location en treasures
-- Primero verificamos si hay datos y los convertimos
DO $$
DECLARE
  has_data BOOLEAN;
BEGIN
  -- Verificar si hay datos
  SELECT EXISTS(SELECT 1 FROM treasures LIMIT 1) INTO has_data;
  
  IF has_data THEN
    -- Si hay datos, necesitamos convertir de POINT a GEOMETRY
    -- Primero creamos una columna temporal
    ALTER TABLE treasures ADD COLUMN IF NOT EXISTS location_temp GEOMETRY(POINT, 4326);
    
    -- Copiamos y convertimos los datos
    UPDATE treasures 
    SET location_temp = ST_SetSRID(
      ST_MakePoint(
        (location::point)[0],  -- longitude (x)
        (location::point)[1]   -- latitude (y)
      ),
      4326
    );
    
    -- Eliminamos la columna antigua
    ALTER TABLE treasures DROP COLUMN location;
    
    -- Renombramos la nueva columna
    ALTER TABLE treasures RENAME COLUMN location_temp TO location;
    
    -- Hacemos NOT NULL si era NOT NULL antes
    ALTER TABLE treasures ALTER COLUMN location SET NOT NULL;
  ELSE
    -- Si no hay datos, simplemente cambiamos el tipo
    ALTER TABLE treasures 
      ALTER COLUMN location TYPE GEOMETRY(POINT, 4326) 
      USING ST_SetSRID(
        ST_MakePoint(
          (location::point)[0],
          (location::point)[1]
        ),
        4326
      );
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- Si falla, intentamos método alternativo
    BEGIN
      ALTER TABLE treasures 
        ALTER COLUMN location TYPE GEOMETRY(POINT, 4326) 
        USING ST_SetSRID(
          ST_MakePoint(
            (location::point)[0],
            (location::point)[1]
          ),
          4326
        );
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Error al cambiar tipo de location: %', SQLERRM;
    END;
END $$;

-- Cambiar tipo de columna user_location en treasure_collections
DO $$
DECLARE
  has_data BOOLEAN;
BEGIN
  -- Verificar si hay datos
  SELECT EXISTS(SELECT 1 FROM treasure_collections LIMIT 1) INTO has_data;
  
  IF has_data THEN
    -- Si hay datos, creamos columna temporal
    ALTER TABLE treasure_collections ADD COLUMN IF NOT EXISTS user_location_temp GEOMETRY(POINT, 4326);
    
    -- Copiamos y convertimos los datos
    UPDATE treasure_collections 
    SET user_location_temp = ST_SetSRID(
      ST_MakePoint(
        (user_location::point)[0],  -- longitude (x)
        (user_location::point)[1]   -- latitude (y)
      ),
      4326
    );
    
    -- Eliminamos la columna antigua
    ALTER TABLE treasure_collections DROP COLUMN user_location;
    
    -- Renombramos la nueva columna
    ALTER TABLE treasure_collections RENAME COLUMN user_location_temp TO user_location;
    
    -- Hacemos NOT NULL si era NOT NULL antes
    ALTER TABLE treasure_collections ALTER COLUMN user_location SET NOT NULL;
  ELSE
    -- Si no hay datos, simplemente cambiamos el tipo
    ALTER TABLE treasure_collections 
      ALTER COLUMN user_location TYPE GEOMETRY(POINT, 4326) 
      USING ST_SetSRID(
        ST_MakePoint(
          (user_location::point)[0],
          (user_location::point)[1]
        ),
        4326
      );
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- Si falla, intentamos método alternativo
    BEGIN
      ALTER TABLE treasure_collections 
        ALTER COLUMN user_location TYPE GEOMETRY(POINT, 4326) 
        USING ST_SetSRID(
          ST_MakePoint(
            (user_location::point)[0],
            (user_location::point)[1]
          ),
          4326
        );
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Error al cambiar tipo de user_location: %', SQLERRM;
    END;
END $$;

-- Verificar que el cambio se hizo correctamente
DO $$
BEGIN
  RAISE NOTICE 'Verificando tipos de columna...';
  RAISE NOTICE 'Si ves este mensaje, la migración se ejecutó. Verifica manualmente con:';
  RAISE NOTICE 'SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_name IN (''treasures'', ''treasure_collections'') AND column_name IN (''location'', ''user_location'');';
END $$;
