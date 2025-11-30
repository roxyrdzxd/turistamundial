import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { calculateToll, isGameOver } from '@/lib/game/gameEngine'

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

    if (!currentPlayer || currentPlayer.user_id !== user.id) {
      return NextResponse.json({ error: 'No es tu turno' }, { status: 403 })
    }

    // Obtener país en la posición actual (filtrar por board_id de la sesión)
    const { data: countries } = await supabase
      .from('countries')
      .select('*')
      .eq('position', currentPlayer.position)
      .eq('board_id', session.board_id)

    if (!countries || countries.length === 0) {
      return NextResponse.json({ error: 'No hay país en esta posición' }, { status: 400 })
    }

    const country = countries[0]

    // Obtener países comprados
    const { data: playerCountries } = await supabase
      .from('player_countries')
      .select('*')
      .eq('session_id', sessionId)

    // Buscar dueño del país
    const ownerCountry = playerCountries?.find(
      pc => pc.country_id === country.id && !pc.is_mortgaged
    )

    if (!ownerCountry) {
      return NextResponse.json({ error: 'Este país no tiene dueño' }, { status: 400 })
    }

    const owner = players?.find(p => p.id === ownerCountry.player_id)

    if (!owner) {
      return NextResponse.json({ error: 'Dueño no encontrado' }, { status: 404 })
    }

    // No pagar si eres el dueño
    if (owner.id === currentPlayer.id) {
      return NextResponse.json({ error: 'Eres el dueño de este país' }, { status: 400 })
    }

    // Calcular peaje
    const gameState = {
      sessionId,
      players: players || [],
      playerCountries: playerCountries || [],
      countries: countries,
      currentTurn: session.current_turn,
    }

    const toll = calculateToll(country, owner.id, gameState)

    if (!toll) {
      return NextResponse.json({ error: 'No se puede calcular el peaje' }, { status: 400 })
    }

    // Verificar si puede pagar
    if (currentPlayer.money < toll.amount) {
      // El jugador no puede pagar - bancarrota
      const { error: bankruptError } = await supabase
        .from('session_players')
        .update({ is_bankrupt: true, money: 0 })
        .eq('id', currentPlayer.id)

      if (bankruptError) {
        return NextResponse.json({ error: bankruptError.message }, { status: 500 })
      }

      // Transferir todas las propiedades al dueño
      const { data: playerOwnedCountries } = await supabase
        .from('player_countries')
        .select('*')
        .eq('session_id', sessionId)
        .eq('player_id', currentPlayer.id)

      if (playerOwnedCountries && playerOwnedCountries.length > 0) {
        for (const ownedCountry of playerOwnedCountries) {
          await supabase
            .from('player_countries')
            .update({ player_id: owner.id })
            .eq('id', ownedCountry.id)
        }
      }

      // Verificar si el juego terminó (solo queda un jugador activo)
      const { data: allPlayersAfterBankruptcy } = await supabase
        .from('session_players')
        .select('*')
        .eq('session_id', sessionId)
        .order('turn_order')

      const { data: allCountries } = await supabase
        .from('countries')
        .select('*')
        .eq('board_id', session.board_id)

      const { data: allPlayerCountries } = await supabase
        .from('player_countries')
        .select('*')
        .eq('session_id', sessionId)

      const gameState = {
        sessionId,
        players: allPlayersAfterBankruptcy || [],
        playerCountries: allPlayerCountries || [],
        countries: allCountries || [],
        currentTurn: session.current_turn,
      }

      const gameOver = isGameOver(gameState)

      if (gameOver.isOver && gameOver.winner) {
        // Obtener el user_id del ganador
        const winnerPlayer = allPlayersAfterBankruptcy?.find(p => p.id === gameOver.winner?.id)
        if (winnerPlayer && winnerPlayer.user_id) {
          // Actualizar misión de victoria
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

          // Cerrar la sesión
          await supabase
            .from('game_sessions')
            .update({
              status: 'finished',
              finished_at: new Date().toISOString(),
            })
            .eq('id', sessionId)

          // Obtener perfil del ganador para el mensaje
          const { data: winnerProfile } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', winnerPlayer.user_id)
            .single()

          return NextResponse.json({
            success: true,
            bankrupt: true,
            gameOver: true,
            winner: {
              id: winnerPlayer.id,
              username: winnerProfile?.username || 'Jugador',
            },
            message: 'Has quedado en bancarrota. La partida ha terminado.',
          })
        }
      }

      return NextResponse.json({
        success: true,
        bankrupt: true,
        message: 'Has quedado en bancarrota',
      })
    }

    // Obtener el dinero actualizado del dueño antes de actualizar (evita condiciones de carrera)
    const { data: updatedOwner, error: ownerFetchError } = await supabase
      .from('session_players')
      .select('money')
      .eq('id', owner.id)
      .single()

    if (ownerFetchError || !updatedOwner) {
      return NextResponse.json({ error: 'Error al obtener datos del dueño' }, { status: 500 })
    }

    // Pagar peaje (descontar del jugador actual)
    const { error: payError } = await supabase
      .from('session_players')
      .update({ money: currentPlayer.money - toll.amount })
      .eq('id', currentPlayer.id)

    if (payError) {
      return NextResponse.json({ error: payError.message }, { status: 500 })
    }

    // Recibir pago el dueño (usar el dinero actualizado de la base de datos)
    const { error: receiveError } = await supabase
      .from('session_players')
      .update({ money: updatedOwner.money + toll.amount })
      .eq('id', owner.id)

    if (receiveError) {
      // Si falla recibir el pago, revertir el descuento del jugador
      await supabase
        .from('session_players')
        .update({ money: currentPlayer.money })
        .eq('id', currentPlayer.id)
      
      return NextResponse.json({ error: receiveError.message }, { status: 500 })
    }

    // Registrar movimiento
    await supabase
      .from('game_moves')
      .insert({
        session_id: sessionId,
        player_id: currentPlayer.id,
        move_type: 'pay_toll',
        move_data: {
          country_id: country.id,
          country_name: country.name,
          amount: toll.amount,
          owner_id: owner.id,
          owner_username: owner.user_id,
        },
      })

    // Avanzar al siguiente turno después de pagar
    const { data: allPlayers } = await supabase
      .from('session_players')
      .select('*')
      .eq('session_id', sessionId)
      .order('turn_order')

    const activePlayers = allPlayers?.filter(p => !p.is_bankrupt) || []
    const nextTurn = (session.current_turn + 1) % activePlayers.length
    await supabase
      .from('game_sessions')
      .update({ current_turn: nextTurn })
      .eq('id', sessionId)

    return NextResponse.json({
      success: true,
      amount: toll.amount,
      message: `Has pagado $${toll.amount} de peaje`,
    })
  } catch (error: any) {
    console.error('[Pay Toll] Error:', error)
    return NextResponse.json({
      error: error.message || 'Error al pagar peaje',
    }, { status: 500 })
  }
}

