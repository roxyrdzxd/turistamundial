import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST() {
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  // Crear nueva sesión de juego
  const { data: session, error: sessionError } = await supabase
    .from('game_sessions')
    .insert({
      host_id: user.id,
      status: 'waiting',
      max_players: 8,
      current_players: 1,
      current_turn: 0,
    })
    .select()
    .single()

  if (sessionError) {
    return NextResponse.json({ error: sessionError.message }, { status: 500 })
  }

  // Colores disponibles para jugadores
  const colors = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'cyan']
  
  // Agregar el host como primer jugador
  const { data: player, error: playerError } = await supabase
    .from('session_players')
    .insert({
      session_id: session.id,
      user_id: user.id,
      position: 0,
      money: 1500,
      color: colors[0],
      turn_order: 0,
      is_bankrupt: false,
    })
    .select()
    .single()

  if (playerError) {
    // Si falla, eliminar la sesión creada
    await supabase.from('game_sessions').delete().eq('id', session.id)
    return NextResponse.json({ error: playerError.message }, { status: 500 })
  }

  return NextResponse.json({ 
    session: {
      ...session,
      player,
    },
  })
}

