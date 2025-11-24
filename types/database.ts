export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string | null
          avatar_url: string | null
          created_at: string
        }
        Insert: {
          id: string
          username?: string | null
          avatar_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          username?: string | null
          avatar_url?: string | null
          created_at?: string
        }
      }
      game_sessions: {
        Row: {
          id: string
          host_id: string
          status: 'waiting' | 'active' | 'finished'
          max_players: number
          current_players: number
          current_turn: number
          created_at: string
          started_at: string | null
          finished_at: string | null
        }
        Insert: {
          id?: string
          host_id: string
          status?: 'waiting' | 'active' | 'finished'
          max_players?: number
          current_players?: number
          current_turn?: number
          created_at?: string
          started_at?: string | null
          finished_at?: string | null
        }
        Update: {
          id?: string
          host_id?: string
          status?: 'waiting' | 'active' | 'finished'
          max_players?: number
          current_players?: number
          current_turn?: number
          created_at?: string
          started_at?: string | null
          finished_at?: string | null
        }
      }
      session_players: {
        Row: {
          id: string
          session_id: string
          user_id: string
          position: number
          money: number
          color: string
          turn_order: number
          is_bankrupt: boolean
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          user_id: string
          position?: number
          money?: number
          color: string
          turn_order: number
          is_bankrupt?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          user_id?: string
          position?: number
          money?: number
          color?: string
          turn_order?: number
          is_bankrupt?: boolean
          created_at?: string
        }
      }
      countries: {
        Row: {
          id: string
          name: string
          continent: string
          price: number
          base_rent: number
          house_price: number
          hotel_price: number
          position: number
        }
        Insert: {
          id?: string
          name: string
          continent: string
          price: number
          base_rent: number
          house_price: number
          hotel_price: number
          position: number
        }
        Update: {
          id?: string
          name?: string
          continent?: string
          price?: number
          base_rent?: number
          house_price?: number
          hotel_price?: number
          position?: number
        }
      }
      player_countries: {
        Row: {
          id: string
          session_id: string
          player_id: string
          country_id: string
          houses: number
          hotels: number
          is_mortgaged: boolean
        }
        Insert: {
          id?: string
          session_id: string
          player_id: string
          country_id: string
          houses?: number
          hotels?: number
          is_mortgaged?: boolean
        }
        Update: {
          id?: string
          session_id?: string
          player_id?: string
          country_id?: string
          houses?: number
          hotels?: number
          is_mortgaged?: boolean
        }
      }
      game_moves: {
        Row: {
          id: string
          session_id: string
          player_id: string
          move_type: string
          move_data: Json
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          player_id: string
          move_type: string
          move_data: Json
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          player_id?: string
          move_type?: string
          move_data?: Json
          created_at?: string
        }
      }
      chance_cards: {
        Row: {
          id: string
          type: 'suerte' | 'destino'
          title: string
          description: string
          action_type: string
          action_data: Json
        }
        Insert: {
          id?: string
          type: 'suerte' | 'destino'
          title: string
          description: string
          action_type: string
          action_data: Json
        }
        Update: {
          id?: string
          type?: 'suerte' | 'destino'
          title?: string
          description?: string
          action_type?: string
          action_data?: Json
        }
      }
    }
  }
}

