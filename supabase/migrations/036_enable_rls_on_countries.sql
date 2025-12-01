-- Habilitar RLS en la tabla countries
-- Esta migración corrige el problema de seguridad donde la tabla countries
-- está expuesta a PostgREST pero no tiene RLS habilitado

-- Habilitar Row Level Security en la tabla countries
ALTER TABLE countries ENABLE ROW LEVEL SECURITY;

-- Política: Cualquier usuario autenticado puede ver los países
-- Los países son datos estáticos del juego que todos los jugadores necesitan ver
CREATE POLICY "Authenticated users can view countries" ON countries
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Nota: No creamos políticas para INSERT, UPDATE o DELETE porque:
-- - Los países son datos estáticos que solo deben ser modificados por administradores
-- - Las modificaciones se hacen a través de migraciones SQL
-- - Si necesitas permitir modificaciones, puedes crear políticas adicionales con permisos de admin

-- Comentario para documentación
COMMENT ON TABLE countries IS 'Tabla de países del juego. RLS habilitado para seguridad. Solo lectura para usuarios autenticados.';

