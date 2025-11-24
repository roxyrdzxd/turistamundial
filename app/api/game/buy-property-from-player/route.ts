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

    const { sessionId, playerCountryId } = await request.json()

    if (!sessionId || !playerCountryId) {
      return NextResponse.json({ error: 'sessionId y playerCountryId requeridos' }, { status: 400 })
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

    // Obtener la propiedad en venta
    const { data: playerCountry, error: pcError } = await supabase
      .from('player_countries')
      .select(`
        *,
        country:countries!player_countries_country_id_fkey(*)
      `)
      .eq('id', playerCountryId)
      .eq('session_id', sessionId)
      .eq('is_for_sale', true)
      .single()

    if (pcError || !playerCountry) {
      return NextResponse.json({ error: 'Propiedad no encontrada o no está en venta' }, { status: 404 })
    }

    // Obtener el vendedor
    const { data: seller } = await supabase
      .from('session_players')
      .select('*')
      .eq('id', playerCountry.player_id)
      .single()

    // Verificar que el jugador está en esa posición
    if (currentPlayer.position !== playerCountry.country.position) {
      return NextResponse.json({ error: 'No estás en ese país' }, { status: 400 })
    }

    // Verificar que no es el dueño actual
    if (playerCountry.player_id === currentPlayer.id) {
      return NextResponse.json({ error: 'No puedes comprar tu propia propiedad' }, { status: 400 })
    }

    // Verificar que tiene suficiente dinero
    if (!playerCountry.sale_price || currentPlayer.money < playerCountry.sale_price) {
      return NextResponse.json({ 
        error: `No tienes suficiente dinero. Necesitas $${playerCountry.sale_price?.toLocaleString()}` 
      }, { status: 400 })
    }

    // Verificar que la propiedad no está hipotecada
    if (playerCountry.is_mortgaged) {
      return NextResponse.json({ error: 'No puedes comprar una propiedad hipotecada' }, { status: 400 })
    }

    // Realizar la transacción
    // 1. Transferir la propiedad al nuevo dueño
    const { error: transferError } = await supabase
      .from('player_countries')
      .update({
        player_id: currentPlayer.id,
        is_for_sale: false,
        sale_price: null,
      })
      .eq('id', playerCountryId)

    if (transferError) {
      return NextResponse.json({ error: transferError.message }, { status: 500 })
    }

    // 2. Descontar dinero del comprador
    const { error: buyerMoneyError } = await supabase
      .from('session_players')
      .update({ money: currentPlayer.money - playerCountry.sale_price })
      .eq('id', currentPlayer.id)

    if (buyerMoneyError) {
      return NextResponse.json({ error: buyerMoneyError.message }, { status: 500 })
    }

    // 3. Agregar dinero al vendedor
    const seller = playerCountry.seller
    if (seller) {
      const { error: sellerMoneyError } = await supabase
        .from('session_players')
        .update({ money: seller.money + playerCountry.sale_price })
        .eq('id', seller.id)

      if (sellerMoneyError) {
        console.error('Error actualizando dinero del vendedor:', sellerMoneyError)
      }
    }

    // Registrar movimiento
    await supabase
      .from('game_moves')
      .insert({
        session_id: sessionId,
        player_id: currentPlayer.id,
        move_type: 'buy_property_from_player',
        move_data: {
          player_country_id: playerCountryId,
          country_name: playerCountry.country.name,
          sale_price: playerCountry.sale_price,
          seller_id: seller?.id,
        },
      })

    return NextResponse.json({
      success: true,
      message: `Has comprado ${playerCountry.country.name} por $${playerCountry.sale_price?.toLocaleString()}`,
    })
  } catch (error: any) {
    console.error('[Buy Property From Player] Error:', error)
    return NextResponse.json({
      error: error.message || 'Error al comprar propiedad',
    }, { status: 500 })
  }
}

