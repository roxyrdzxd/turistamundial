-- Migración para agregar sistema de medallas/insignias a tesoros
-- Permite que los tesoros tengan medallas que los usuarios pueden recolectar

-- Agregar columna de medalla a treasures
ALTER TABLE treasures 
ADD COLUMN IF NOT EXISTS badge_url TEXT;

-- Crear tabla de medallas recolectadas por usuario
CREATE TABLE IF NOT EXISTS user_treasure_badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  treasure_id UUID NOT NULL REFERENCES treasures(id) ON DELETE CASCADE,
  collected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, treasure_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_user_treasure_badges_user ON user_treasure_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_treasure_badges_treasure ON user_treasure_badges(treasure_id);
CREATE INDEX IF NOT EXISTS idx_user_treasure_badges_collected_at ON user_treasure_badges(collected_at DESC);

-- RLS Policies
ALTER TABLE user_treasure_badges ENABLE ROW LEVEL SECURITY;

-- Política para que usuarios vean sus propias medallas
CREATE POLICY "Users can view own badges" ON user_treasure_badges
  FOR SELECT
  USING (user_id = auth.uid());

-- Política para que usuarios puedan insertar sus propias medallas (usado por función)
CREATE POLICY "Users can insert own badges" ON user_treasure_badges
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Comentarios
COMMENT ON COLUMN treasures.badge_url IS 'URL de la medalla/insignia del tesoro. Se otorga al usuario cuando recolecta el tesoro.';
COMMENT ON TABLE user_treasure_badges IS 'Registro de medallas de tesoros recolectadas por usuarios. Cada usuario puede tener una medalla por tesoro.';
