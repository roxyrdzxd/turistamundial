-- Migración para crear sistema de referidos

-- Agregar campo de código de referencia único a profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;

-- Generar códigos únicos para usuarios existentes
UPDATE profiles 
SET referral_code = 'REF' || UPPER(SUBSTRING(REPLACE(id::text, '-', ''), 1, 8))
WHERE referral_code IS NULL;

-- Crear índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON profiles(referral_code);

-- Función para generar código único de referencia
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT AS $$
DECLARE
  new_code TEXT;
  exists_check BOOLEAN;
BEGIN
  LOOP
    -- Generar código aleatorio de 8 caracteres
    new_code := 'REF' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NOW()::TEXT), 1, 8));
    
    -- Verificar si ya existe
    SELECT EXISTS(SELECT 1 FROM profiles WHERE referral_code = new_code) INTO exists_check;
    
    -- Si no existe, salir del loop
    EXIT WHEN NOT exists_check;
  END LOOP;
  
  RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Trigger para generar código automáticamente
CREATE OR REPLACE FUNCTION assign_referral_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := generate_referral_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_assign_referral_code ON profiles;
CREATE TRIGGER trigger_assign_referral_code
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  WHEN (NEW.referral_code IS NULL)
  EXECUTE FUNCTION assign_referral_code();

-- Tabla de referidos
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL,
  reward_coins INTEGER NOT NULL DEFAULT 200,
  reward_claimed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(referred_id) -- Un usuario solo puede ser referido una vez
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON referrals(referred_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_referrals_created_at ON referrals(created_at DESC);

-- Función para procesar referidos
CREATE OR REPLACE FUNCTION process_referral(
  p_referred_user_id UUID,
  p_referral_code TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_referrer_id UUID;
  v_reward_coins INTEGER := 200; -- Coins por referido
  v_result JSONB;
BEGIN
  -- Buscar el usuario que tiene este código
  SELECT id INTO v_referrer_id
  FROM profiles
  WHERE referral_code = p_referral_code;
  
  -- Si no se encuentra el código, retornar error
  IF v_referrer_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Código de referencia inválido');
  END IF;
  
  -- No permitir auto-referidos
  IF v_referrer_id = p_referred_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'No puedes referirte a ti mismo');
  END IF;
  
  -- Verificar que el usuario referido no haya sido referido antes
  IF EXISTS(SELECT 1 FROM referrals WHERE referred_id = p_referred_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Este usuario ya fue referido');
  END IF;
  
  -- Crear registro de referido
  INSERT INTO referrals (referrer_id, referred_id, referral_code, reward_coins)
  VALUES (v_referrer_id, p_referred_user_id, p_referral_code, v_reward_coins);
  
  RETURN jsonb_build_object(
    'success', true,
    'referrer_id', v_referrer_id,
    'reward_coins', v_reward_coins,
    'message', 'Referido registrado exitosamente. Las recompensas se otorgarán cuando se implemente el sistema de wallet.'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies para referrals
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own referrals" ON referrals
  FOR SELECT
  USING (referrer_id = auth.uid() OR referred_id = auth.uid());

CREATE POLICY "System can create referrals" ON referrals
  FOR INSERT
  WITH CHECK (true); -- Permitido a través de la función process_referral

-- Habilitar Realtime para referrals (opcional, para notificaciones)
ALTER PUBLICATION supabase_realtime ADD TABLE referrals;

