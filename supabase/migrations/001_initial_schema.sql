-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Countries table (static data)
CREATE TABLE IF NOT EXISTS countries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  continent TEXT NOT NULL, -- color/continent group
  price INTEGER NOT NULL,
  base_rent INTEGER NOT NULL,
  house_price INTEGER NOT NULL,
  hotel_price INTEGER NOT NULL,
  position INTEGER NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Game sessions table
CREATE TABLE IF NOT EXISTS game_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  host_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'finished')),
  max_players INTEGER NOT NULL DEFAULT 8 CHECK (max_players >= 4 AND max_players <= 8),
  current_players INTEGER NOT NULL DEFAULT 0,
  current_turn INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE,
  finished_at TIMESTAMP WITH TIME ZONE
);

-- Session players table
CREATE TABLE IF NOT EXISTS session_players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0 CHECK (position >= 0 AND position < 40),
  money INTEGER NOT NULL DEFAULT 1500,
  color TEXT NOT NULL,
  turn_order INTEGER NOT NULL,
  is_bankrupt BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(session_id, user_id),
  UNIQUE(session_id, turn_order)
);

-- Player countries (properties owned by players)
CREATE TABLE IF NOT EXISTS player_countries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES session_players(id) ON DELETE CASCADE,
  country_id UUID NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
  houses INTEGER NOT NULL DEFAULT 0 CHECK (houses >= 0 AND houses <= 4),
  hotels INTEGER NOT NULL DEFAULT 0 CHECK (hotels >= 0 AND hotels <= 1),
  is_mortgaged BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(session_id, country_id)
);

-- Game moves (history of all moves)
CREATE TABLE IF NOT EXISTS game_moves (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES session_players(id) ON DELETE CASCADE,
  move_type TEXT NOT NULL,
  move_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Chance cards (Suerte/Destino)
CREATE TABLE IF NOT EXISTS chance_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL CHECK (type IN ('suerte', 'destino')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  action_type TEXT NOT NULL,
  action_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_game_sessions_status ON game_sessions(status);
CREATE INDEX IF NOT EXISTS idx_game_sessions_host ON game_sessions(host_id);
CREATE INDEX IF NOT EXISTS idx_session_players_session ON session_players(session_id);
CREATE INDEX IF NOT EXISTS idx_session_players_user ON session_players(user_id);
CREATE INDEX IF NOT EXISTS idx_player_countries_session ON player_countries(session_id);
CREATE INDEX IF NOT EXISTS idx_player_countries_player ON player_countries(player_id);
CREATE INDEX IF NOT EXISTS idx_game_moves_session ON game_moves(session_id);
CREATE INDEX IF NOT EXISTS idx_game_moves_player ON game_moves(player_id);

-- Row Level Security (RLS) Policies

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_moves ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Game sessions policies
CREATE POLICY "Users can view all game sessions"
  ON game_sessions FOR SELECT
  USING (true);

CREATE POLICY "Users can create game sessions"
  ON game_sessions FOR INSERT
  WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Users can update own game sessions"
  ON game_sessions FOR UPDATE
  USING (auth.uid() = host_id OR auth.uid() IN (
    SELECT user_id FROM session_players WHERE session_id = game_sessions.id
  ));

-- Session players policies
CREATE POLICY "Users can view session players"
  ON session_players FOR SELECT
  USING (true);

CREATE POLICY "Users can join sessions"
  ON session_players FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own player data"
  ON session_players FOR UPDATE
  USING (auth.uid() = user_id);

-- Player countries policies
CREATE POLICY "Users can view player countries"
  ON player_countries FOR SELECT
  USING (true);

CREATE POLICY "Users can manage own countries"
  ON player_countries FOR ALL
  USING (
    auth.uid() IN (
      SELECT user_id FROM session_players WHERE id = player_countries.player_id
    )
  );

-- Game moves policies
CREATE POLICY "Users can view game moves"
  ON game_moves FOR SELECT
  USING (true);

CREATE POLICY "Users can create game moves"
  ON game_moves FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM session_players WHERE id = game_moves.player_id
    )
  );

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_referral_code TEXT;
BEGIN
  -- Crear perfil
  INSERT INTO public.profiles (id, username)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'username', 'Usuario' || substr(NEW.id::text, 1, 8)));
  
  -- Procesar referido si existe código en metadata
  v_referral_code := NEW.raw_user_meta_data->>'referral_code';
  IF v_referral_code IS NOT NULL AND v_referral_code != '' THEN
    -- Llamar a la función de procesamiento de referidos
    PERFORM process_referral(NEW.id, v_referral_code);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

