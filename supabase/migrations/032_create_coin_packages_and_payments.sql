-- Tabla de paquetes de TuristaCoins
CREATE TABLE IF NOT EXISTS coin_packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  coins INTEGER NOT NULL CHECK (coins > 0),
  price_mxn DECIMAL(10, 2) NOT NULL CHECK (price_mxn > 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  bonus_coins INTEGER NOT NULL DEFAULT 0, -- Coins de bonificación
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(name)
);

-- Tabla de transacciones de pago
CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  package_id UUID NOT NULL REFERENCES coin_packages(id) ON DELETE RESTRICT,
  mercadopago_payment_id TEXT, -- ID de pago de Mercado Pago
  mercadopago_preference_id TEXT, -- ID de preferencia de Mercado Pago
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled', 'refunded')),
  amount_mxn DECIMAL(10, 2) NOT NULL,
  coins_amount INTEGER NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb, -- Datos adicionales de Mercado Pago
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user ON payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_mp_payment_id ON payment_transactions(mercadopago_payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_mp_preference_id ON payment_transactions(mercadopago_preference_id);
CREATE INDEX IF NOT EXISTS idx_coin_packages_active ON coin_packages(is_active);

-- Insertar paquetes de coins
INSERT INTO coin_packages (name, description, coins, price_mxn, display_order, bonus_coins) VALUES
('Paquete Básico', '1000 TuristaCoins', 1000, 50.00, 1, 0),
('Paquete Popular', '2500 TuristaCoins', 2500, 100.00, 2, 0),
('Paquete Premium', '6000 TuristaCoins', 6000, 200.00, 3, 0),
('Paquete Épico', '16000 TuristaCoins', 16000, 500.00, 4, 0)
ON CONFLICT (name) DO UPDATE SET
  coins = EXCLUDED.coins,
  price_mxn = EXCLUDED.price_mxn,
  display_order = EXCLUDED.display_order;

-- Función para procesar pago aprobado
CREATE OR REPLACE FUNCTION process_payment_approval(
  p_payment_id TEXT,
  p_status TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB AS $$
DECLARE
  v_transaction payment_transactions%ROWTYPE;
  v_user_id UUID;
  v_coins_amount INTEGER;
BEGIN
  -- Buscar transacción por ID de pago de Mercado Pago
  SELECT * INTO v_transaction
  FROM payment_transactions
  WHERE mercadopago_payment_id = p_payment_id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transacción no encontrada');
  END IF;

  -- Si ya está aprobada, no hacer nada
  IF v_transaction.status = 'approved' THEN
    RETURN jsonb_build_object('success', true, 'message', 'Pago ya procesado');
  END IF;

  -- Actualizar estado de la transacción
  UPDATE payment_transactions
  SET
    status = p_status,
    metadata = p_metadata,
    updated_at = NOW()
  WHERE id = v_transaction.id;

  -- Si el pago fue aprobado, otorgar coins
  IF p_status = 'approved' THEN
    v_user_id := v_transaction.user_id;
    v_coins_amount := v_transaction.coins_amount;

    -- Otorgar coins usando la función existente
    PERFORM grant_coins(
      v_user_id,
      v_coins_amount,
      'purchase',
      'Compra de paquete de TuristaCoins',
      v_transaction.package_id
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_transaction.id,
    'status', p_status
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies
ALTER TABLE coin_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

-- Políticas para coin_packages (todos pueden ver paquetes activos)
CREATE POLICY "Anyone can view active coin packages" ON coin_packages
  FOR SELECT
  USING (is_active = true);

-- Políticas para payment_transactions (usuarios solo ven sus propias transacciones)
CREATE POLICY "Users can view own payment transactions" ON payment_transactions
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own payment transactions" ON payment_transactions
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

