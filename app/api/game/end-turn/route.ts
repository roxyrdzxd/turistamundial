import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getNextPlayer } from '@/lib/game/gameEngine'

export async function POST(request: Request) {
  try {
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

    // Obtener sesión
    const { data: session, error: sessionError } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('status', 'active')
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Sesión no encontrada' }, { status: 404 })
    }

    // Obtener jugador actual
    const { data: players } = await supabase
      .from('session_players')
      .select('*')
      .eq('session_id', sessionId)
      .order('turn_order')

    const currentPlayer = players?.find(p => p.turn_order === session.current_turn)

    if (!currentPlayer) {
      return NextResponse.json({ error: 'Jugador actual no encontrado' }, { status: 404 })
    }

    // Si el jugador actual está desconectado, saltarlo automáticamente
    if (currentPlayer.is_online === false && currentPlayer.user_id !== user.id) {
      // El jugador está desconectado, avanzar automáticamente
      const nextTurn = getNextPlayer(session.current_turn, players || [])
      
      const { error: turnError } = await supabase
        .from('game_sessions')
        .update({ current_turn: nextTurn })
        .eq('id', sessionId)

      if (turnError) {
        return NextResponse.json({ error: turnError.message }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: 'Turno saltado (jugador desconectado)',
        nextTurn,
        skipped: true,
      })
    }

    // Verificar que es el turno del usuario
    if (currentPlayer.user_id !== user.id) {
      return NextResponse.json({ error: 'No es tu turno' }, { status: 403 })
    }

    // Avanzar al siguiente turno
    const gameState = {
      sessionId,
      players: players || [],
      playerCountries: [],
      countries: [],
      currentTurn: session.current_turn,
    }

    const nextTurn = getNextPlayer(session.current_turn, players || [])

    const { error: turnError } = await supabase
      .from('game_sessions')
      .update({ current_turn: nextTurn })
      .eq('id', sessionId)

    if (turnError) {
      return NextResponse.json({ error: turnError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Turno finalizado',
      nextTurn,
    })
  } catch (error: any) {
    console.error('[End Turn] Error:', error)
    return NextResponse.json({
      error: error.message || 'Error al finalizar turno',
    }, { status: 500 })
  }
}

