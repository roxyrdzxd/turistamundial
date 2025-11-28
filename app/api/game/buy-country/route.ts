import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { canBuyCountry, hasMonopoly } from '@/lib/game/gameEngine'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { sessionId, countryId } = await request.json()

    if (!sessionId || !countryId) {
      return NextResponse.json({ error: 'sessionId y countryId requeridos' }, { status: 400 })
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

    // Obtener sesión para board_id
    const { data: session } = await supabase
      .from('game_sessions')
      .select('board_id')
      .eq('id', sessionId)
      .single()

    if (!session) {
      return NextResponse.json({ error: 'Sesión no encontrada' }, { status: 404 })
    }

    // Obtener país (filtrar por board_id)
    const { data: country, error: countryError } = await supabase
      .from('countries')
      .select('*')
      .eq('id', countryId)
      .eq('board_id', session.board_id)
      .single()

    if (countryError || !country) {
      return NextResponse.json({ error: 'País no encontrado' }, { status: 404 })
    }

    // Verificar que el jugador está en esa posición
    if (currentPlayer.position !== country.position) {
      return NextResponse.json({ error: 'No estás en ese país' }, { status: 400 })
    }

    // Obtener países comprados
    const { data: playerCountries } = await supabase
      .from('player_countries')
      .select('*')
      .eq('session_id', sessionId)

    // Verificar si puede comprar
    const gameState = {
      sessionId,
      players: players || [],
      playerCountries: playerCountries || [],
      countries: [country],
      currentTurn: session.current_turn,
    }

    const canBuy = canBuyCountry(country, currentPlayer, gameState)

    if (!canBuy.canBuy) {
      return NextResponse.json({ error: canBuy.reason || 'No puedes comprar este país' }, { status: 400 })
    }

    // Realizar la compra
    const { error: purchaseError } = await supabase
      .from('player_countries')
      .insert({
        session_id: sessionId,
        player_id: currentPlayer.id,
        country_id: countryId,
        houses: 0,
        hotels: 0,
        is_mortgaged: false,
      })

    if (purchaseError) {
      return NextResponse.json({ error: purchaseError.message }, { status: 500 })
    }

    // Descontar dinero
    const { error: moneyError } = await supabase
      .from('session_players')
      .update({ money: currentPlayer.money - country.price })
      .eq('id', currentPlayer.id)

    if (moneyError) {
      return NextResponse.json({ error: moneyError.message }, { status: 500 })
    }

    // Registrar movimiento
    await supabase
      .from('game_moves')
      .insert({
        session_id: sessionId,
        player_id: currentPlayer.id,
        move_type: 'buy_country',
        move_data: {
          country_id: countryId,
          country_name: country.name,
          price: country.price,
        },
      })

    // Actualizar progreso de misiones - comprar propiedad
    try {
      await supabase.rpc('update_mission_progress', {
        p_user_id: currentPlayer.user_id,
        p_action: 'buy_property',
        p_count: 1,
        p_session_id: sessionId
      })
    } catch (missionError) {
      console.error('Error actualizando misión de compra:', missionError)
    }

    // Verificar si ahora tiene monopolio en el continente del país comprado
    // Obtener todos los países del tablero para verificar monopolio
    const { data: allCountries } = await supabase
      .from('countries')
      .select('*')
      .eq('board_id', session.board_id)

    // Obtener países del jugador después de la compra
    const { data: updatedPlayerCountries } = await supabase
      .from('player_countries')
      .select('*')
      .eq('session_id', sessionId)
      .eq('player_id', currentPlayer.id)

    if (allCountries && updatedPlayerCountries) {
      // Verificar si tiene monopolio en el continente del país comprado
      const hasMonopolyNow = hasMonopoly(
        country.continent,
        currentPlayer.id,
        allCountries,
        updatedPlayerCountries
      )

      if (hasMonopolyNow) {
        // Verificar si antes no tenía monopolio (para evitar contar múltiples veces)
        // Obtener países antes de la compra
        const countriesBeforePurchase = (playerCountries || []).filter(
          pc => pc.player_id === currentPlayer.id
        )
        const hadMonopolyBefore = hasMonopoly(
          country.continent,
          currentPlayer.id,
          allCountries,
          countriesBeforePurchase
        )

        // Si no tenía monopolio antes y ahora sí, es un nuevo monopolio
        if (!hadMonopolyBefore) {
          try {
            await supabase.rpc('update_mission_progress', {
              p_user_id: currentPlayer.user_id,
              p_action: 'get_monopoly',
              p_count: 1,
              p_session_id: sessionId
            })
          } catch (missionError) {
            console.error('Error actualizando misión de monopolio:', missionError)
          }
        }
      }
    }

    // Avanzar al siguiente turno después de comprar
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
      message: `Has comprado ${country.name} por $${country.price}`,
    })
  } catch (error: any) {
    console.error('[Buy Country] Error:', error)
    return NextResponse.json({
      error: error.message || 'Error al comprar país',
    }, { status: 500 })
  }
}

