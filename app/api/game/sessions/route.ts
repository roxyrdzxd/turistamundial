import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  
  // Obtener usuario actual
  const { data: { user } } = await supabase.auth.getUser()
  
  // Obtener solo sesiones en estado 'waiting' (esperando jugadores)
  // Las sesiones 'active' ya están en curso y no se pueden unir
  let query = supabase
    .from('game_sessions')
    .select(`
      *,
      host:profiles!game_sessions_host_id_fkey(username),
      players:session_players(
        id,
        user_id,
        color,
        turn_order,
        profile:profiles!session_players_user_id_fkey(username)
      )
    `)
    .eq('status', 'waiting')
    .order('created_at', { ascending: false })

  const { data: sessions, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ sessions: sessions || [] })
}

