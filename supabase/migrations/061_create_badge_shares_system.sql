-- Migración para crear sistema de tracking de compartidos de medallas
-- Permite rastrear cuántas veces se comparten las medallas y en qué plataformas

-- Tabla para trackear compartidos de medallas
CREATE TABLE IF NOT EXISTS badge_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  treasure_id UUID NOT NULL REFERENCES treasures(id) ON DELETE CASCADE,
  share_platform TEXT NOT NULL CHECK (share_platform IN ('facebook', 'twitter', 'whatsapp', 'telegram', 'copy', 'other')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, treasure_id, share_platform) -- Un share por plataforma por usuario
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_badge_shares_user ON badge_shares(user_id);
CREATE INDEX IF NOT EXISTS idx_badge_shares_treasure ON badge_shares(treasure_id);
CREATE INDEX IF NOT EXISTS idx_badge_shares_platform ON badge_shares(share_platform);
CREATE INDEX IF NOT EXISTS idx_badge_shares_created_at ON badge_shares(created_at DESC);

-- RLS Policies
ALTER TABLE badge_shares ENABLE ROW LEVEL SECURITY;

-- Política para que usuarios vean sus propios shares
CREATE POLICY "Users can view own badge shares" ON badge_shares
  FOR SELECT
  USING (user_id = auth.uid());

-- Política para que usuarios puedan insertar sus propios shares
CREATE POLICY "Users can insert own badge shares" ON badge_shares
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Política pública para ver estadísticas agregadas (sin datos personales)
-- Esto permite mostrar "X personas han compartido esta medalla" sin exponer quién

-- Función para obtener estadísticas de shares de una medalla
CREATE OR REPLACE FUNCTION get_badge_share_stats(p_treasure_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_total_shares INTEGER;
  v_platform_stats JSONB;
BEGIN
  -- Contar total de shares
  SELECT COUNT(*) INTO v_total_shares
  FROM badge_shares
  WHERE treasure_id = p_treasure_id;
  
  -- Obtener estadísticas por plataforma
  SELECT jsonb_object_agg(share_platform, share_count) INTO v_platform_stats
  FROM (
    SELECT share_platform, COUNT(*) as share_count
    FROM badge_shares
    WHERE treasure_id = p_treasure_id
    GROUP BY share_platform
  ) platform_counts;
  
  RETURN jsonb_build_object(
    'total_shares', v_total_shares,
    'platform_stats', COALESCE(v_platform_stats, '{}'::jsonb)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentarios
COMMENT ON TABLE badge_shares IS 'Registro de compartidos de medallas en redes sociales. Permite tracking de viralización.';
COMMENT ON FUNCTION get_badge_share_stats IS 'Obtiene estadísticas agregadas de shares de una medalla sin exponer datos personales.';
