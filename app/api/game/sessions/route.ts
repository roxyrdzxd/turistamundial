import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  
  // Obtener usuario actual
  const { data: { user } } = await supabase.auth.getUser()
  
  // Obtener todas las sesiones waiting y active
  // Si el usuario está autenticado, también mostrar sus sesiones activas como host
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
    .in('status', ['waiting', 'active'])
    .order('created_at', { ascending: false })

  const { data: sessions, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ sessions: sessions || [] })
}

