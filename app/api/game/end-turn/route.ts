import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getNextPlayer, isGameOver } from '@/lib/game/gameEngine'

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

    // Verificar si el jugador tiene un turno extra del aeropuerto
    if (currentPlayer.extra_turn) {
      // Usar el turno extra - resetear el flag pero mantener el turno
      const { error: extraTurnError } = await supabase
        .from('session_players')
        .update({ extra_turn: false })
        .eq('id', currentPlayer.id)

      if (extraTurnError) {
        return NextResponse.json({ error: extraTurnError.message }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: 'Has usado tu turno extra. Puedes tirar dados de nuevo.',
        nextTurn: session.current_turn, // Mantener el mismo turno
        usedExtraTurn: true,
      })
    }

    const nextTurn = getNextPlayer(session.current_turn, players || [])

    // Obtener países y player_countries para verificar si el juego terminó
    const { data: countries } = await supabase
      .from('countries')
      .select('*')
      .eq('board_id', session.board_id)

    const { data: playerCountries } = await supabase
      .from('player_countries')
      .select('*')
      .eq('session_id', sessionId)

    // Verificar si el juego terminó
    const gameState = {
      sessionId,
      players: players || [],
      playerCountries: playerCountries || [],
      countries: countries || [],
      currentTurn: nextTurn,
    }

    const gameOver = isGameOver(gameState)

    // Si el juego terminó, actualizar misiones para el ganador
    if (gameOver.isOver && gameOver.winner) {
      // Obtener el user_id del ganador
      const winnerPlayer = players?.find(p => p.id === gameOver.winner?.id)
      if (winnerPlayer && winnerPlayer.user_id && !winnerPlayer.user_id.startsWith('npc-')) {
        try {
          await supabase.rpc('update_mission_progress', {
            p_user_id: winnerPlayer.user_id,
            p_action: 'win_game',
            p_count: 1,
            p_session_id: sessionId
          })
        } catch (missionError) {
          console.error('Error actualizando misión de victoria:', missionError)
        }
      }

      // Cerrar la sesión automáticamente
      await supabase
        .from('game_sessions')
        .update({
          status: 'finished',
          finished_at: new Date().toISOString(),
        })
        .eq('id', sessionId)
    }

    const { error: turnError } = await supabase
      .from('game_sessions')
      .update({ current_turn: nextTurn })
      .eq('id', sessionId)

    if (turnError) {
      return NextResponse.json({ error: turnError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: gameOver.isOver ? '¡Juego terminado!' : 'Turno finalizado',
      nextTurn,
      gameOver: gameOver.isOver,
      winner: gameOver.winner ? {
        id: gameOver.winner.id,
        playerId: gameOver.winner.id
      } : null,
    })
  } catch (error: any) {
    console.error('[End Turn] Error:', error)
    return NextResponse.json({
      error: error.message || 'Error al finalizar turno',
    }, { status: 500 })
  }
}

