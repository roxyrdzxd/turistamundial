import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { sessionId } = await request.json()

  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId requerido' }, { status: 400 })
  }

  // Verificar que la sesión existe y el usuario es el host
  const { data: session, error: sessionError } = await supabase
    .from('game_sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('host_id', user.id)
    .eq('status', 'waiting')
    .single()

  if (sessionError || !session) {
    return NextResponse.json({ error: 'Sesión no encontrada o no eres el host' }, { status: 404 })
  }

  // Verificar que hay al menos 2 jugadores
  if (session.current_players < 2) {
    return NextResponse.json({ error: 'Se necesitan al menos 2 jugadores para iniciar' }, { status: 400 })
  }

  // Actualizar estado de la sesión
  const { error: updateError } = await supabase
    .from('game_sessions')
    .update({
      status: 'active',
      started_at: new Date().toISOString(),
      current_turn: 0,
    })
    .eq('id', sessionId)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Obtener todos los jugadores de la sesión para actualizar sus misiones
  const { data: players } = await supabase
    .from('session_players')
    .select('user_id')
    .eq('session_id', sessionId)

  // Actualizar progreso de misiones para todos los jugadores
  if (players) {
    for (const player of players) {
      // Solo actualizar para usuarios reales (no NPCs)
      if (player.user_id && !player.user_id.startsWith('npc-')) {
        try {
          await supabase.rpc('update_mission_progress', {
            p_user_id: player.user_id,
            p_action: 'play_game',
            p_count: 1,
            p_session_id: sessionId
          })
        } catch (missionError) {
          console.error(`Error actualizando misión para usuario ${player.user_id}:`, missionError)
        }
      }
    }
  }

  return NextResponse.json({ success: true, message: 'Partida iniciada' })
}

