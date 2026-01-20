-- Migración para agregar bonus de 50 TC cuando alguien se registra desde un link de medalla compartida
-- Esto se integra con el sistema de referidos existente

-- Agregar columna para trackear si el referido vino de un link de medalla compartida
ALTER TABLE referrals 
ADD COLUMN IF NOT EXISTS from_badge_share BOOLEAN DEFAULT false;

-- Agregar columna para el treasure_id si vino de un badge share
ALTER TABLE referrals 
ADD COLUMN IF NOT EXISTS badge_treasure_id UUID REFERENCES treasures(id) ON DELETE SET NULL;

-- Actualizar la función process_referral para aceptar parámetros opcionales de badge share
CREATE OR REPLACE FUNCTION process_referral(
  p_referred_user_id UUID,
  p_referral_code TEXT,
  p_from_badge_share BOOLEAN DEFAULT false,
  p_badge_treasure_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_referrer_id UUID;
  v_reward_coins INTEGER := 200; -- Coins base por referido
  v_badge_bonus INTEGER := 50; -- Bonus adicional por compartir medalla
  v_total_reward INTEGER;
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
  
  -- Calcular recompensa total
  v_total_reward := v_reward_coins;
  IF p_from_badge_share THEN
    v_total_reward := v_total_reward + v_badge_bonus;
  END IF;
  
  -- Crear registro de referido
  INSERT INTO referrals (
    referrer_id, 
    referred_id, 
    referral_code, 
    reward_coins,
    from_badge_share,
    badge_treasure_id
  )
  VALUES (
    v_referrer_id, 
    p_referred_user_id, 
    p_referral_code, 
    v_total_reward,
    p_from_badge_share,
    p_badge_treasure_id
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'referrer_id', v_referrer_id,
    'reward_coins', v_total_reward,
    'base_reward', v_reward_coins,
    'badge_bonus', CASE WHEN p_from_badge_share THEN v_badge_bonus ELSE 0 END,
    'message', CASE 
      WHEN p_from_badge_share THEN 
        format('Referido registrado exitosamente. Recompensa: %s TC (200 TC base + 50 TC bonus por medalla compartida).', v_total_reward)
      ELSE 
        format('Referido registrado exitosamente. Recompensa: %s TC.', v_total_reward)
    END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Índice para búsquedas por badge share
CREATE INDEX IF NOT EXISTS idx_referrals_from_badge_share ON referrals(from_badge_share) WHERE from_badge_share = true;
CREATE INDEX IF NOT EXISTS idx_referrals_badge_treasure ON referrals(badge_treasure_id) WHERE badge_treasure_id IS NOT NULL;

-- Comentarios
COMMENT ON COLUMN referrals.from_badge_share IS 'Indica si el referido vino de un link de medalla compartida';
COMMENT ON COLUMN referrals.badge_treasure_id IS 'ID del tesoro/medalla que fue compartida, si aplica';
COMMENT ON FUNCTION process_referral IS 'Procesa un referido, con soporte para bonus por compartir medallas. Bonus: 50 TC adicionales si viene de badge share.';
