-- Habilitar RLS en la tabla missions
-- Esta migración corrige el problema de seguridad donde la tabla missions
-- tiene políticas RLS definidas pero RLS no está habilitado

-- Habilitar Row Level Security en la tabla missions
ALTER TABLE missions ENABLE ROW LEVEL SECURITY;

-- Verificar que la política existente sigue funcionando
-- La política "Anyone can view active missions" ya existe y permite
-- que cualquier usuario autenticado vea las misiones activas
-- No necesitamos recrearla, solo habilitar RLS

-- Comentario para documentación
COMMENT ON TABLE missions IS 'Tabla de misiones del juego. RLS habilitado para seguridad.';

