import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { calculateToll } from '@/lib/game/gameEngine'

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

    // Obtener país en la posición actual
    const { data: countries } = await supabase
      .from('countries')
      .select('*')
      .eq('position', currentPlayer.position)

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

      return NextResponse.json({
        success: true,
        bankrupt: true,
        message: 'Has quedado en bancarrota',
      })
    }

    // Pagar peaje
    const { error: payError } = await supabase
      .from('session_players')
      .update({ money: currentPlayer.money - toll.amount })
      .eq('id', currentPlayer.id)

    if (payError) {
      return NextResponse.json({ error: payError.message }, { status: 500 })
    }

    // Recibir pago el dueño
    const { error: receiveError } = await supabase
      .from('session_players')
      .update({ money: owner.money + toll.amount })
      .eq('id', owner.id)

    if (receiveError) {
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

