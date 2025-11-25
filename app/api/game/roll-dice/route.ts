import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

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

    // Verificar que la sesión existe y está activa
    const { data: session, error: sessionError } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('status', 'active')
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Sesión no encontrada o no está activa' }, { status: 404 })
    }

    // Verificar que es el turno del usuario
    const { data: players } = await supabase
      .from('session_players')
      .select('*')
      .eq('session_id', sessionId)
      .order('turn_order')

    const currentPlayer = players?.find(p => p.turn_order === session.current_turn)

    if (!currentPlayer || currentPlayer.user_id !== user.id) {
      return NextResponse.json({ error: 'No es tu turno' }, { status: 403 })
    }

    // Tirar dos dados (1-6 cada uno)
    const die1 = Math.floor(Math.random() * 6) + 1
    const die2 = Math.floor(Math.random() * 6) + 1
    const total = die1 + die2

    // Calcular nueva posición (tablero de 40 casillas)
    const newPosition = (currentPlayer.position + total) % 40
    
    // Verificar si completó una vuelta al tablero (cruzó la posición 0)
    const completedLap = currentPlayer.position + total >= 40

    // Actualizar posición del jugador
    const { error: updateError } = await supabase
      .from('session_players')
      .update({ position: newPosition })
      .eq('id', currentPlayer.id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // NO avanzar el turno automáticamente - se avanzará después de completar acciones
    // El turno se mantiene hasta que el jugador complete todas sus acciones

    // Obtener país en la nueva posición
    const { data: countryAtPosition } = await supabase
      .from('countries')
      .select('*')
      .eq('position', newPosition)
      .single()

    // Obtener países comprados para verificar acciones
    const { data: playerCountries } = await supabase
      .from('player_countries')
      .select('*')
      .eq('session_id', sessionId)

    let actionRequired = null
    let canBuy = false
    let needsToPayToll = false
    let tollAmount = 0
    let ownerId = null
    let propertyForSale = null

    if (countryAtPosition) {
      // Verificar si el país está comprado
      const ownerCountry = playerCountries?.find(
        pc => pc.country_id === countryAtPosition.id && !pc.is_mortgaged
      )

      if (ownerCountry) {
        // Verificar si la propiedad está en venta
        if (ownerCountry.is_for_sale && ownerCountry.sale_price) {
          const owner = players?.find(p => p.id === ownerCountry.player_id)
          if (owner && owner.id !== currentPlayer.id) {
            // Propiedad en venta - puede comprarla
            if (currentPlayer.money >= ownerCountry.sale_price) {
              canBuy = true
              actionRequired = 'can_buy_from_player'
              propertyForSale = {
                playerCountryId: ownerCountry.id,
                salePrice: ownerCountry.sale_price,
              }
            }
          }
        } else {
          // Hay que pagar peaje
          const owner = players?.find(p => p.id === ownerCountry.player_id)
          if (owner && owner.id !== currentPlayer.id) {
            needsToPayToll = true
            // Calcular peaje básico (simplificado)
            tollAmount = countryAtPosition.base_rent
            ownerId = owner.id
            actionRequired = 'pay_toll'
          }
        }
      } else {
        // El país está disponible para comprar
        if (currentPlayer.money >= countryAtPosition.price) {
          canBuy = true
          actionRequired = 'can_buy'
        }
      }

      // Verificar si es casilla especial
      if ([0, 10, 20, 30].includes(newPosition)) {
        if (newPosition === 0) {
          // Inicio - recibir dinero
          const startBonus = 100
          await supabase
            .from('session_players')
            .update({ money: currentPlayer.money + startBonus })
            .eq('id', currentPlayer.id)
          actionRequired = 'start_bonus'
        } else if (newPosition === 10) {
          // Cárcel - cobrar multa
          const jailFine = 150
          if (currentPlayer.money >= jailFine) {
            await supabase
              .from('session_players')
              .update({ money: currentPlayer.money - jailFine })
              .eq('id', currentPlayer.id)
            actionRequired = 'jail_fine'
          } else {
            // Bancarrota
            await supabase
              .from('session_players')
              .update({ is_bankrupt: true, money: 0 })
              .eq('id', currentPlayer.id)
            actionRequired = 'bankrupt'
          }
        } else if (newPosition === 20) {
          // Aeropuerto - dar turno extra
          await supabase
            .from('session_players')
            .update({ extra_turn: true })
            .eq('id', currentPlayer.id)
          actionRequired = 'airport_extra_turn'
        } else if (newPosition === 30) {
          // Banco - pagar bono
          const bankBonus = 300
          await supabase
            .from('session_players')
            .update({ money: currentPlayer.money + bankBonus })
            .eq('id', currentPlayer.id)
          actionRequired = 'bank_bonus'
        }
      }
    }

    // Registrar el movimiento
    await supabase
      .from('game_moves')
      .insert({
        session_id: sessionId,
        player_id: currentPlayer.id,
        move_type: 'roll_dice',
        move_data: {
          die1,
          die2,
          total,
          old_position: currentPlayer.position,
          new_position: newPosition,
          action_required: actionRequired,
        },
      })

    // Actualizar progreso de misiones
    // Completar vuelta al tablero (cuando cruza la posición 0)
    if (completedLap) {
      try {
        await supabase.rpc('update_mission_progress', {
          p_user_id: currentPlayer.user_id,
          p_action: 'complete_lap',
          p_count: 1,
          p_session_id: sessionId
        })
      } catch (missionError) {
        console.error('Error actualizando misión de vuelta:', missionError)
      }
    }

    return NextResponse.json({
      success: true,
      diceResult: total,
      die1,
      die2,
      newPosition,
      country: countryAtPosition,
      actionRequired,
      canBuy,
      needsToPayToll,
      tollAmount,
      ownerId,
      propertyForSale,
      message: `Avanzaste ${total} casillas`,
      completedLap,
    })
  } catch (error: any) {
    console.error('[Roll Dice] Error general:', error)
    return NextResponse.json({
      error: error.message || 'Error desconocido al tirar dados',
      details: error,
    }, { status: 500 })
  }
}

