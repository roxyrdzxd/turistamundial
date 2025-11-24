-- Tabla para mensajes del chat en las sesiones
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user ON chat_messages(user_id);

-- Habilitar RLS
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
-- Permitir a todos los jugadores de una sesión ver los mensajes
CREATE POLICY "Players can view session messages"
ON chat_messages FOR SELECT
USING (
  session_id IN (
    SELECT session_id FROM session_players 
    WHERE session_id = chat_messages.session_id
  )
);

-- Permitir a todos los jugadores de una sesión enviar mensajes
CREATE POLICY "Players can send messages"
ON chat_messages FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  session_id IN (
    SELECT session_id FROM session_players 
    WHERE user_id = auth.uid() 
    AND session_id = chat_messages.session_id
  )
);

-- Habilitar Realtime para la tabla de mensajes
-- Tabla para mensajes del chat en las sesiones
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user ON chat_messages(user_id);

-- Habilitar RLS
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
-- Permitir a todos los jugadores de una sesión ver los mensajes
CREATE POLICY "Players can view session messages"
ON chat_messages FOR SELECT
USING (
  session_id IN (
    SELECT session_id FROM session_players 
    WHERE session_id = chat_messages.session_id
  )
);

-- Permitir a todos los jugadores de una sesión enviar mensajes
CREATE POLICY "Players can send messages"
ON chat_messages FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  session_id IN (
    SELECT session_id FROM session_players 
    WHERE user_id = auth.uid() 
    AND session_id = chat_messages.session_id
  )
);

-- Habilitar Realtime para la tabla de mensajes
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;


-- Nota: Esto debe hacerse desde el dashboard de Supabase en Database > Replication
-- O ejecutar manualmente: ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
-- Si da error, verifica que la publicación exista y que Realtime esté habilitado en tu proyecto

