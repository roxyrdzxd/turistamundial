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

    const { sessionId, cardType = 'suerte' } = await request.json()

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

    // Obtener cartas del tipo especificado
    const { data: cards, error: cardsError } = await supabase
      .from('chance_cards')
      .select('*')
      .eq('type', cardType)

    if (cardsError || !cards || cards.length === 0) {
      return NextResponse.json({ error: 'No hay cartas disponibles' }, { status: 404 })
    }

    // Seleccionar carta aleatoria
    const randomCard = cards[Math.floor(Math.random() * cards.length)]

    // Ejecutar acción de la carta
    let result = { success: true, message: randomCard.description }

    switch (randomCard.action_type) {
      case 'gain_money':
        const gainAmount = randomCard.action_data.amount || 0
        await supabase
          .from('session_players')
          .update({ money: currentPlayer.money + gainAmount })
          .eq('id', currentPlayer.id)
        result.message = `${randomCard.description}. Has ganado $${gainAmount}`
        break

      case 'lose_money':
        const loseAmount = randomCard.action_data.amount || 0
        if (currentPlayer.money >= loseAmount) {
          await supabase
            .from('session_players')
            .update({ money: currentPlayer.money - loseAmount })
            .eq('id', currentPlayer.id)
          result.message = `${randomCard.description}. Has perdido $${loseAmount}`
        } else {
          // Bancarrota
          await supabase
            .from('session_players')
            .update({ is_bankrupt: true, money: 0 })
            .eq('id', currentPlayer.id)
          result.message = `${randomCard.description}. Has quedado en bancarrota`
        }
        break

      case 'move':
        const spaces = randomCard.action_data.spaces || 0
        const newPosition = (currentPlayer.position + spaces + 40) % 40
        await supabase
          .from('session_players')
          .update({ position: newPosition })
          .eq('id', currentPlayer.id)
        result.message = `${randomCard.description}. ${spaces > 0 ? 'Avanzas' : 'Retrocedes'} ${Math.abs(spaces)} espacios`
        break

      case 'go_to_jail':
        const jailPosition = 10 // Posición de la cárcel
        await supabase
          .from('session_players')
          .update({ position: jailPosition })
          .eq('id', currentPlayer.id)
        result.message = randomCard.description
        break

      default:
        result.message = randomCard.description
    }

    // Registrar movimiento
    await supabase
      .from('game_moves')
      .insert({
        session_id: sessionId,
        player_id: currentPlayer.id,
        move_type: 'draw_card',
        move_data: {
          card_id: randomCard.id,
          card_type: cardType,
          card_title: randomCard.title,
          action_type: randomCard.action_type,
        },
      })

    return NextResponse.json({
      success: true,
      card: randomCard,
      result,
    })
  } catch (error: any) {
    console.error('[Draw Card] Error:', error)
    return NextResponse.json({
      error: error.message || 'Error al sacar carta',
    }, { status: 500 })
  }
}

