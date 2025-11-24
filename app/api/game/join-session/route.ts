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

  // Verificar que la sesión existe y está esperando jugadores
  const { data: session, error: sessionError } = await supabase
    .from('game_sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('status', 'waiting')
    .single()

  if (sessionError || !session) {
    return NextResponse.json({ error: 'Sesión no encontrada o no disponible' }, { status: 404 })
  }

  // Verificar que no esté llena
  if (session.current_players >= session.max_players) {
    return NextResponse.json({ error: 'La sesión está llena' }, { status: 400 })
  }

  // Verificar que el usuario no esté ya en la sesión
  const { data: existingPlayer } = await supabase
    .from('session_players')
    .select('id')
    .eq('session_id', sessionId)
    .eq('user_id', user.id)
    .single()

  if (existingPlayer) {
    return NextResponse.json({ error: 'Ya estás en esta sesión' }, { status: 400 })
  }

  // Obtener colores ya usados
  const { data: existingPlayers } = await supabase
    .from('session_players')
    .select('color')
    .eq('session_id', sessionId)

  const usedColors = existingPlayers?.map(p => p.color) || []
  const availableColors = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'cyan']
  const availableColor = availableColors.find(c => !usedColors.includes(c)) || availableColors[0]

  // Agregar jugador a la sesión
  const { data: player, error: playerError } = await supabase
    .from('session_players')
    .insert({
      session_id: sessionId,
      user_id: user.id,
      position: 0,
      money: 1500,
      color: availableColor,
      turn_order: session.current_players,
      is_bankrupt: false,
    })
    .select()
    .single()

  if (playerError) {
    return NextResponse.json({ error: playerError.message }, { status: 500 })
  }

  // Actualizar contador de jugadores
  const { error: updateError } = await supabase
    .from('game_sessions')
    .update({ current_players: session.current_players + 1 })
    .eq('id', sessionId)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ 
    session: {
      ...session,
      current_players: session.current_players + 1,
    },
    player,
  })
}

