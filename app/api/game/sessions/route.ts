import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  
  // Obtener todas las sesiones en espera
  const { data: sessions, error } = await supabase
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

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ sessions: sessions || [] })
}

