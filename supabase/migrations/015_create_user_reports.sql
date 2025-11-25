-- Migración para crear sistema de reportes de usuarios (red flags)

-- Tabla de reportes de usuarios
CREATE TABLE IF NOT EXISTS user_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reported_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reporter_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (reason IN ('spam', 'harassment', 'inappropriate_content', 'cheating', 'other')),
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES profiles(id),
  UNIQUE (reported_user_id, reporter_user_id, reason, created_at)
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_user_reports_reported_user ON user_reports(reported_user_id);
CREATE INDEX IF NOT EXISTS idx_user_reports_reporter_user ON user_reports(reporter_user_id);
CREATE INDEX IF NOT EXISTS idx_user_reports_status ON user_reports(status);
CREATE INDEX IF NOT EXISTS idx_user_reports_created_at ON user_reports(created_at DESC);

-- Tabla para contar red flags por usuario
CREATE TABLE IF NOT EXISTS user_red_flags (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  report_count INTEGER NOT NULL DEFAULT 0,
  last_report_at TIMESTAMP WITH TIME ZONE,
  is_flagged BOOLEAN NOT NULL DEFAULT false,
  flagged_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Función para actualizar el contador de red flags
CREATE OR REPLACE FUNCTION update_user_red_flags()
RETURNS TRIGGER AS $$
BEGIN
  -- Actualizar o insertar el contador de reportes
  INSERT INTO user_red_flags (user_id, report_count, last_report_at, updated_at)
  VALUES (
    NEW.reported_user_id,
    1,
    NEW.created_at,
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE
  SET
    report_count = user_red_flags.report_count + 1,
    last_report_at = NEW.created_at,
    updated_at = NOW(),
    -- Marcar como flagged si tiene 3 o más reportes pendientes
    is_flagged = CASE
      WHEN (SELECT COUNT(*) FROM user_reports WHERE reported_user_id = NEW.reported_user_id AND status = 'pending') >= 3
      THEN true
      ELSE user_red_flags.is_flagged
    END,
    flagged_at = CASE
      WHEN (SELECT COUNT(*) FROM user_reports WHERE reported_user_id = NEW.reported_user_id AND status = 'pending') >= 3
        AND user_red_flags.flagged_at IS NULL
      THEN NOW()
      ELSE user_red_flags.flagged_at
    END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para actualizar red flags cuando se crea un reporte
DROP TRIGGER IF EXISTS trigger_update_red_flags ON user_reports;
CREATE TRIGGER trigger_update_red_flags
  AFTER INSERT ON user_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_user_red_flags();

-- RLS Policies para user_reports
ALTER TABLE user_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own reports" ON user_reports
  FOR SELECT
  USING (reporter_user_id = auth.uid() OR reported_user_id = auth.uid());

CREATE POLICY "Users can create reports" ON user_reports
  FOR INSERT
  WITH CHECK (reporter_user_id = auth.uid());

CREATE POLICY "Users cannot report themselves" ON user_reports
  FOR INSERT
  WITH CHECK (reporter_user_id != reported_user_id);

-- RLS Policies para user_red_flags
ALTER TABLE user_red_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view red flags count" ON user_red_flags
  FOR SELECT
  USING (true);

-- Habilitar Realtime para user_red_flags (para notificaciones)
ALTER PUBLICATION supabase_realtime ADD TABLE user_red_flags;

