-- Sistema de amigos y solicitudes de amistad
-- Permite a los usuarios enviar solicitudes de amistad y ver el estado de conexión de sus amigos

-- Tabla de solicitudes de amistad
CREATE TABLE IF NOT EXISTS friend_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'rejected'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(sender_id, receiver_id),
  CHECK (sender_id != receiver_id)
);

-- Tabla de amigos (relación bidireccional)
CREATE TABLE IF NOT EXISTS friendships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user1_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(user1_id, user2_id),
  CHECK (user1_id < user2_id) -- Asegurar que user1_id < user2_id para evitar duplicados
);

-- Tabla para rastrear usuarios en línea globalmente
CREATE TABLE IF NOT EXISTS user_online_status (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  is_online BOOLEAN NOT NULL DEFAULT true,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_friend_requests_sender ON friend_requests(sender_id, status);
CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver ON friend_requests(receiver_id, status);
CREATE INDEX IF NOT EXISTS idx_friendships_user1 ON friendships(user1_id);
CREATE INDEX IF NOT EXISTS idx_friendships_user2 ON friendships(user2_id);
CREATE INDEX IF NOT EXISTS idx_user_online_status_online ON user_online_status(is_online, last_seen);

-- Habilitar RLS
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_online_status ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para friend_requests
-- Los usuarios pueden ver sus propias solicitudes (enviadas o recibidas)
CREATE POLICY "Users can view own friend requests"
ON friend_requests FOR SELECT
USING (
  auth.uid() = sender_id OR 
  auth.uid() = receiver_id
);

-- Los usuarios pueden crear solicitudes
CREATE POLICY "Users can create friend requests"
ON friend_requests FOR INSERT
WITH CHECK (auth.uid() = sender_id);

-- Los usuarios pueden actualizar solicitudes que recibieron
CREATE POLICY "Users can update received friend requests"
ON friend_requests FOR UPDATE
USING (auth.uid() = receiver_id)
WITH CHECK (auth.uid() = receiver_id);

-- Políticas RLS para friendships
-- Los usuarios pueden ver sus amistades
CREATE POLICY "Users can view own friendships"
ON friendships FOR SELECT
USING (
  auth.uid() = user1_id OR 
  auth.uid() = user2_id
);

-- Los usuarios pueden crear amistades (solo a través de aceptar solicitudes)
CREATE POLICY "Users can create friendships"
ON friendships FOR INSERT
WITH CHECK (
  auth.uid() = user1_id OR 
  auth.uid() = user2_id
);

-- Políticas RLS para user_online_status
-- Todos pueden ver el estado online de otros usuarios
CREATE POLICY "Anyone can view online status"
ON user_online_status FOR SELECT
TO public
USING (true);

-- Los usuarios pueden actualizar su propio estado
CREATE POLICY "Users can update own online status"
ON user_online_status FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Los usuarios pueden insertar su propio estado
CREATE POLICY "Users can insert own online status"
ON user_online_status FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para actualizar updated_at
CREATE TRIGGER update_friend_requests_updated_at
  BEFORE UPDATE ON friend_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_online_status_updated_at
  BEFORE UPDATE ON user_online_status
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Función para crear amistad automáticamente cuando se acepta una solicitud
CREATE OR REPLACE FUNCTION create_friendship_on_accept()
RETURNS TRIGGER AS $$
DECLARE
  user1 UUID;
  user2 UUID;
BEGIN
  -- Solo cuando se acepta una solicitud
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    -- Asegurar que user1_id < user2_id
    IF NEW.sender_id < NEW.receiver_id THEN
      user1 := NEW.sender_id;
      user2 := NEW.receiver_id;
    ELSE
      user1 := NEW.receiver_id;
      user2 := NEW.sender_id;
    END IF;
    
    -- Crear amistad si no existe
    INSERT INTO friendships (user1_id, user2_id)
    VALUES (user1, user2)
    ON CONFLICT (user1_id, user2_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para crear amistad automáticamente
CREATE TRIGGER create_friendship_on_accept_trigger
  AFTER UPDATE ON friend_requests
  FOR EACH ROW
  WHEN (NEW.status = 'accepted' AND OLD.status = 'pending')
  EXECUTE FUNCTION create_friendship_on_accept();

-- Función para marcar usuarios como desconectados si no han hecho ping en 5 minutos
CREATE OR REPLACE FUNCTION mark_offline_users()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  marked_count INTEGER := 0;
BEGIN
  UPDATE user_online_status
  SET is_online = false
  WHERE is_online = true
    AND last_seen < NOW() - INTERVAL '5 minutes';
  
  GET DIAGNOSTICS marked_count = ROW_COUNT;
  
  RETURN marked_count;
END;
$$;

COMMENT ON FUNCTION mark_offline_users() IS
'Marca usuarios como desconectados si no han hecho ping en 5 minutos.
Ejecutar periódicamente (cada minuto) con pg_cron.';

