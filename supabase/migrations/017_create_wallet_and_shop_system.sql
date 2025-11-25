-- Migración para crear sistema de wallet, misiones y tienda

-- Tabla de wallet de usuario
CREATE TABLE IF NOT EXISTS user_wallet (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  coins INTEGER NOT NULL DEFAULT 0 CHECK (coins >= 0),
  total_earned INTEGER NOT NULL DEFAULT 0,
  total_spent INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Tabla de transacciones de coins
CREATE TABLE IF NOT EXISTS coin_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL, -- Positivo para ganancias, negativo para gastos
  type TEXT NOT NULL CHECK (type IN ('purchase', 'mission', 'achievement', 'reward', 'referral', 'purchase_item', 'refund')),
  description TEXT NOT NULL,
  reference_id UUID, -- ID de la misión/logro/compra relacionada
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Tabla de misiones
CREATE TABLE IF NOT EXISTS missions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('daily', 'weekly', 'achievement', 'special')),
  reward_coins INTEGER NOT NULL DEFAULT 0 CHECK (reward_coins >= 0),
  requirement JSONB NOT NULL DEFAULT '{}'::jsonb, -- Condiciones específicas
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Tabla de progreso de misiones de usuario
CREATE TABLE IF NOT EXISTS user_missions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  mission_id UUID NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0),
  target INTEGER NOT NULL CHECK (target > 0),
  completed_at TIMESTAMP WITH TIME ZONE,
  claimed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, mission_id)
);

-- Tabla de items de la tienda
CREATE TABLE IF NOT EXISTS shop_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('avatar', 'color', 'effect', 'boost', 'cosmetic', 'theme')),
  price_coins INTEGER NOT NULL CHECK (price_coins >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_premium BOOLEAN NOT NULL DEFAULT false, -- Solo comprable con dinero real
  image_url TEXT,
  data JSONB NOT NULL DEFAULT '{}'::jsonb, -- Datos específicos del item
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Tabla de inventario de usuario
CREATE TABLE IF NOT EXISTS user_inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES shop_items(id) ON DELETE CASCADE,
  purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  is_equipped BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE, -- Para items temporales
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_coin_transactions_user ON coin_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_coin_transactions_created_at ON coin_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_coin_transactions_type ON coin_transactions(type);

CREATE INDEX IF NOT EXISTS idx_missions_type ON missions(type);
CREATE INDEX IF NOT EXISTS idx_missions_active ON missions(is_active);

CREATE INDEX IF NOT EXISTS idx_user_missions_user ON user_missions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_missions_mission ON user_missions(mission_id);
CREATE INDEX IF NOT EXISTS idx_user_missions_completed ON user_missions(completed_at);

CREATE INDEX IF NOT EXISTS idx_shop_items_category ON shop_items(category);
CREATE INDEX IF NOT EXISTS idx_shop_items_active ON shop_items(is_active);

CREATE INDEX IF NOT EXISTS idx_user_inventory_user ON user_inventory(user_id);
CREATE INDEX IF NOT EXISTS idx_user_inventory_item ON user_inventory(item_id);

-- Función para otorgar coins
CREATE OR REPLACE FUNCTION grant_coins(
  p_user_id UUID,
  p_amount INTEGER,
  p_type TEXT,
  p_description TEXT,
  p_reference_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_new_balance INTEGER;
BEGIN
  -- Validar que el monto sea positivo
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'El monto debe ser positivo');
  END IF;

  -- Actualizar o crear wallet
  INSERT INTO user_wallet (user_id, coins, total_earned, updated_at)
  VALUES (p_user_id, p_amount, p_amount, NOW())
  ON CONFLICT (user_id) DO UPDATE
  SET
    coins = user_wallet.coins + p_amount,
    total_earned = user_wallet.total_earned + p_amount,
    updated_at = NOW();

  -- Obtener nuevo balance
  SELECT coins INTO v_new_balance FROM user_wallet WHERE user_id = p_user_id;

  -- Crear transacción
  INSERT INTO coin_transactions (user_id, amount, type, description, reference_id)
  VALUES (p_user_id, p_amount, p_type, p_description, p_reference_id);

  RETURN jsonb_build_object(
    'success', true,
    'new_balance', v_new_balance,
    'amount_added', p_amount
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para gastar coins
CREATE OR REPLACE FUNCTION spend_coins(
  p_user_id UUID,
  p_amount INTEGER,
  p_type TEXT,
  p_description TEXT,
  p_reference_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_current_balance INTEGER;
  v_new_balance INTEGER;
BEGIN
  -- Validar que el monto sea positivo
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'El monto debe ser positivo');
  END IF;

  -- Obtener balance actual
  SELECT COALESCE(coins, 0) INTO v_current_balance
  FROM user_wallet
  WHERE user_id = p_user_id;

  -- Verificar que tenga suficientes coins
  IF v_current_balance < p_amount THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No tienes suficientes TuristaCoins',
      'current_balance', v_current_balance,
      'required', p_amount
    );
  END IF;

  -- Actualizar wallet
  UPDATE user_wallet
  SET
    coins = coins - p_amount,
    total_spent = total_spent + p_amount,
    updated_at = NOW()
  WHERE user_id = p_user_id;

  -- Obtener nuevo balance
  SELECT coins INTO v_new_balance FROM user_wallet WHERE user_id = p_user_id;

  -- Crear transacción (negativa)
  INSERT INTO coin_transactions (user_id, amount, type, description, reference_id)
  VALUES (p_user_id, -p_amount, p_type, p_description, p_reference_id);

  RETURN jsonb_build_object(
    'success', true,
    'new_balance', v_new_balance,
    'amount_spent', p_amount
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies
ALTER TABLE user_wallet ENABLE ROW LEVEL SECURITY;
ALTER TABLE coin_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_inventory ENABLE ROW LEVEL SECURITY;

-- Wallet policies
CREATE POLICY "Users can view own wallet" ON user_wallet
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own wallet" ON user_wallet
  FOR UPDATE
  USING (user_id = auth.uid());

-- Transactions policies
CREATE POLICY "Users can view own transactions" ON coin_transactions
  FOR SELECT
  USING (user_id = auth.uid());

-- Missions policies
CREATE POLICY "Anyone can view active missions" ON missions
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Users can view own mission progress" ON user_missions
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own mission progress" ON user_missions
  FOR ALL
  USING (user_id = auth.uid());

-- Shop items policies
CREATE POLICY "Anyone can view active shop items" ON shop_items
  FOR SELECT
  USING (is_active = true);

-- Inventory policies
CREATE POLICY "Users can view own inventory" ON user_inventory
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage own inventory" ON user_inventory
  FOR ALL
  USING (user_id = auth.uid());

-- Insertar misiones iniciales
INSERT INTO missions (title, description, type, reward_coins, requirement, is_active) VALUES
-- Misiones diarias
('Primera Partida del Día', 'Juega 1 partida hoy', 'daily', 50, '{"action": "play_game", "count": 1}'::jsonb, true),
('Ganador del Día', 'Gana 1 partida hoy', 'daily', 100, '{"action": "win_game", "count": 1}'::jsonb, true),
('Constructor', 'Compra 3 propiedades en una partida', 'daily', 75, '{"action": "buy_property", "count": 3}'::jsonb, true),
('Viajero', 'Completa una vuelta al tablero', 'daily', 50, '{"action": "complete_lap", "count": 1}'::jsonb, true),
('Social', 'Envía 10 mensajes en el chat', 'daily', 25, '{"action": "send_message", "count": 10}'::jsonb, true),
-- Misiones semanales
('Campeón Semanal', 'Gana 5 partidas esta semana', 'weekly', 500, '{"action": "win_game", "count": 5}'::jsonb, true),
('Jugador Activo', 'Juega 10 partidas esta semana', 'weekly', 300, '{"action": "play_game", "count": 10}'::jsonb, true),
('Magnate', 'Consigue 3 monopolios esta semana', 'weekly', 400, '{"action": "get_monopoly", "count": 3}'::jsonb, true),
-- Logros
('Primer Paso', 'Juega tu primera partida', 'achievement', 100, '{"action": "play_game", "count": 1, "lifetime": true}'::jsonb, true),
('Campeón', 'Gana 10 partidas', 'achievement', 1000, '{"action": "win_game", "count": 10, "lifetime": true}'::jsonb, true),
('Magnate Global', 'Consigue 10 monopolios', 'achievement', 1500, '{"action": "get_monopoly", "count": 10, "lifetime": true}'::jsonb, true),
('Social', 'Agrega 10 amigos', 'achievement', 200, '{"action": "add_friend", "count": 10, "lifetime": true}'::jsonb, true),
('Veterano', 'Juega 100 partidas', 'achievement', 2000, '{"action": "play_game", "count": 100, "lifetime": true}'::jsonb, true)
ON CONFLICT DO NOTHING;

-- Insertar items iniciales de la tienda
INSERT INTO shop_items (name, description, category, price_coins, is_active, data) VALUES
-- Avatares
('Avatar Estrella', 'Avatar exclusivo con efecto de estrella', 'avatar', 500, true, '{"avatar_type": "star", "rarity": "common"}'::jsonb),
('Avatar Dorado', 'Avatar premium dorado', 'avatar', 2000, true, '{"avatar_type": "gold", "rarity": "rare"}'::jsonb),
-- Colores
('Color Arcoíris', 'Color especial con efecto arcoíris', 'color', 800, true, '{"color": "rainbow", "effect": "gradient"}'::jsonb),
('Color Neón', 'Color neón brillante', 'color', 600, true, '{"color": "neon", "effect": "glow"}'::jsonb),
-- Boosts temporales
('Doble Renta', 'Doble renta en tu próximo turno (1 partida)', 'boost', 300, true, '{"effect": "double_rent", "duration": 1, "type": "temporary"}'::jsonb),
('Protección', 'Protección de bancarrota (1 partida)', 'boost', 500, true, '{"effect": "bankruptcy_protection", "duration": 1, "type": "temporary"}'::jsonb),
('Turno Extra', 'Turno extra (1 partida)', 'boost', 400, true, '{"effect": "extra_turn", "duration": 1, "type": "temporary"}'::jsonb),
-- Efectos visuales
('Dados Dorados', 'Animación especial de dados dorados', 'effect', 800, true, '{"effect": "golden_dice", "type": "visual"}'::jsonb),
('Efecto Construcción', 'Efecto visual al construir', 'effect', 600, true, '{"effect": "build_animation", "type": "visual"}'::jsonb)
ON CONFLICT DO NOTHING;

