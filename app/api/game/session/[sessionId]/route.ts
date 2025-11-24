import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: { sessionId: string } }
) {
  const supabase = await createClient()
  
  const { sessionId } = params

  // Obtener sesión con todos los datos
  const { data: session, error: sessionError } = await supabase
    .from('game_sessions')
    .select(`
      *,
      host:profiles!game_sessions_host_id_fkey(id, username, avatar_url),
      players:session_players(
        id,
        user_id,
        position,
        money,
        color,
        turn_order,
        is_bankrupt,
        profile:profiles!session_players_user_id_fkey(id, username, avatar_url)
      )
    `)
    .eq('id', sessionId)
    .single()

  if (sessionError || !session) {
    return NextResponse.json({ error: 'Sesión no encontrada' }, { status: 404 })
  }

  // Obtener países comprados
  const { data: playerCountries } = await supabase
    .from('player_countries')
    .select('*')
    .eq('session_id', sessionId)

  return NextResponse.json({ 
    session,
    playerCountries: playerCountries || []
  })
}

