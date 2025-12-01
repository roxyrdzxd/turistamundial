-- Habilitar RLS en la tabla chance_cards
-- Esta migración corrige el problema de seguridad donde la tabla chance_cards
-- está expuesta a PostgREST pero no tiene RLS habilitado

-- Habilitar Row Level Security en la tabla chance_cards
ALTER TABLE chance_cards ENABLE ROW LEVEL SECURITY;

-- Política: Cualquier usuario autenticado puede ver las tarjetas de suerte/destino
-- Las tarjetas son datos estáticos del juego que todos los jugadores necesitan ver
CREATE POLICY "Authenticated users can view chance cards" ON chance_cards
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Nota: No creamos políticas para INSERT, UPDATE o DELETE porque:
-- - Las tarjetas son datos estáticos que solo deben ser modificados por administradores
-- - Las modificaciones se hacen a través de migraciones SQL
-- - Si necesitas permitir modificaciones, puedes crear políticas adicionales con permisos de admin

-- Comentario para documentación
COMMENT ON TABLE chance_cards IS 'Tabla de tarjetas de suerte/destino del juego. RLS habilitado para seguridad. Solo lectura para usuarios autenticados.';

