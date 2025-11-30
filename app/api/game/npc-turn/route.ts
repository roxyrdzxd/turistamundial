import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    
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

    // Obtener jugadores
    const { data: players } = await supabase
      .from('session_players')
      .select('*')
      .eq('session_id', sessionId)
      .order('turn_order')

    const currentPlayer = players?.find(p => p.turn_order === session.current_turn)

    if (!currentPlayer) {
      return NextResponse.json({ error: 'Jugador actual no encontrado' }, { status: 404 })
    }

    // Verificar si es un NPC (solo por user_id, no por nombre)
    const isNPC = currentPlayer.user_id.startsWith('npc-')

    if (!isNPC) {
      return NextResponse.json({ error: 'No es un NPC' }, { status: 400 })
    }

    // Obtener perfil para el mensaje
    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', currentPlayer.user_id)
      .single()

    // Lógica de IA simple para NPCs
    // 1. Tirar dados
    const die1 = Math.floor(Math.random() * 6) + 1
    const die2 = Math.floor(Math.random() * 6) + 1
    const total = die1 + die2
    const newPosition = (currentPlayer.position + total) % 40

    // Actualizar posición
    await supabase
      .from('session_players')
      .update({ position: newPosition })
      .eq('id', currentPlayer.id)

    // Obtener país en la nueva posición (filtrar por board_id de la sesión)
    const { data: countryAtPosition } = await supabase
      .from('countries')
      .select('*')
      .eq('position', newPosition)
      .eq('board_id', session.board_id)
      .single()

    // Obtener países comprados
    const { data: playerCountries } = await supabase
      .from('player_countries')
      .select('*')
      .eq('session_id', sessionId)

    let actionTaken = 'moved'

    if (countryAtPosition) {
      // Verificar si el país está comprado
      const ownerCountry = playerCountries?.find(
        pc => pc.country_id === countryAtPosition.id && !pc.is_mortgaged
      )

      if (ownerCountry) {
        // Hay que pagar peaje
        const owner = players?.find(p => p.id === ownerCountry.player_id)
        if (owner && owner.id !== currentPlayer.id) {
          const tollAmount = countryAtPosition.base_rent
          
          if (currentPlayer.money >= tollAmount) {
            // Pagar peaje
            await supabase
              .from('session_players')
              .update({ money: currentPlayer.money - tollAmount })
              .eq('id', currentPlayer.id)

            await supabase
              .from('session_players')
              .update({ money: owner.money + tollAmount })
              .eq('id', owner.id)

            actionTaken = 'paid_toll'
          } else {
            // Bancarrota
            await supabase
              .from('session_players')
              .update({ is_bankrupt: true, money: 0 })
              .eq('id', currentPlayer.id)

            // Transferir propiedades
            const { data: npcOwnedCountries } = await supabase
              .from('player_countries')
              .select('*')
              .eq('session_id', sessionId)
              .eq('player_id', currentPlayer.id)

            if (npcOwnedCountries && npcOwnedCountries.length > 0) {
              for (const ownedCountry of npcOwnedCountries) {
                await supabase
                  .from('player_countries')
                  .update({ player_id: owner.id })
                  .eq('id', ownedCountry.id)
              }
            }

            actionTaken = 'bankrupt'
          }
        }
      } else {
        // País disponible - NPC decide si comprar (70% probabilidad si tiene dinero)
        if (currentPlayer.money >= countryAtPosition.price && Math.random() > 0.3) {
          await supabase
            .from('player_countries')
            .insert({
              session_id: sessionId,
              player_id: currentPlayer.id,
              country_id: countryAtPosition.id,
              houses: 0,
              hotels: 0,
              is_mortgaged: false,
            })

          await supabase
            .from('session_players')
            .update({ money: currentPlayer.money - countryAtPosition.price })
            .eq('id', currentPlayer.id)

          actionTaken = 'bought_country'
          // Guardar información de la compra para el historial
          const boughtCountryName = countryAtPosition.name
          const boughtCountryPrice = countryAtPosition.price
          
          // Registrar movimiento de compra
          await supabase
            .from('game_moves')
            .insert({
              session_id: sessionId,
              player_id: currentPlayer.id,
              move_type: 'buy_country',
              move_data: {
                country_id: countryAtPosition.id,
                country_name: boughtCountryName,
                price: boughtCountryPrice,
              },
            })
        }
      }

      // Casillas especiales
      if (newPosition === 0) {
        // Inicio - recibir dinero
        await supabase
          .from('session_players')
          .update({ money: currentPlayer.money + 100 })
          .eq('id', currentPlayer.id)
        actionTaken = 'start_bonus'
      } else if (newPosition === 30) {
        // Banco - impuesto
        const tax = 200
        if (currentPlayer.money >= tax) {
          await supabase
            .from('session_players')
            .update({ money: currentPlayer.money - tax })
            .eq('id', currentPlayer.id)
          actionTaken = 'bank_tax'
        }
      }
    }

    // Registrar movimiento
    await supabase
      .from('game_moves')
      .insert({
        session_id: sessionId,
        player_id: currentPlayer.id,
        move_type: 'npc_turn',
        move_data: {
          die1,
          die2,
          total,
          old_position: currentPlayer.position,
          new_position: newPosition,
          action_taken: actionTaken,
        },
      })

    // Avanzar al siguiente turno usando la función del motor del juego
    const { getNextPlayer } = await import('@/lib/game/gameEngine')
    const nextTurn = getNextPlayer(session.current_turn, players || [])

    await supabase
      .from('game_sessions')
      .update({ current_turn: nextTurn })
      .eq('id', sessionId)

    return NextResponse.json({
      success: true,
      message: `${profile?.username || 'NPC'} tiró ${total} y ${actionTaken === 'bought_country' ? 'compró' : actionTaken === 'paid_toll' ? 'pagó peaje' : 'avanzó'}`,
      diceResult: total,
      actionTaken,
    })
  } catch (error: any) {
    console.error('[NPC Turn] Error:', error)
    return NextResponse.json({
      error: error.message || 'Error al procesar turno de NPC',
    }, { status: 500 })
  }
}

