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

    const { sessionId, playerCountryId, salePrice, isForSale } = await request.json()

    if (!sessionId || !playerCountryId || salePrice === undefined) {
      return NextResponse.json({ error: 'sessionId, playerCountryId y salePrice son requeridos' }, { status: 400 })
    }

    // Verificar que la sesión existe y está activa
    const { data: session, error: sessionError } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('status', 'active')
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Sesión no encontrada o no activa' }, { status: 404 })
    }

    // Obtener la propiedad
    const { data: playerCountry, error: pcError } = await supabase
      .from('player_countries')
      .select(`
        *,
        player:session_players!player_countries_player_id_fkey(user_id)
      `)
      .eq('id', playerCountryId)
      .eq('session_id', sessionId)
      .single()

    if (pcError || !playerCountry) {
      return NextResponse.json({ error: 'Propiedad no encontrada' }, { status: 404 })
    }

    // Verificar que el usuario es el dueño
    if (playerCountry.player.user_id !== user.id) {
      return NextResponse.json({ error: 'No eres el dueño de esta propiedad' }, { status: 403 })
    }

    // Validar precio de venta
    if (isForSale && salePrice <= 0) {
      return NextResponse.json({ error: 'El precio de venta debe ser mayor a 0' }, { status: 400 })
    }

    // Actualizar el estado de venta
    const updateData: any = {
      is_for_sale: isForSale || false,
    }

    if (isForSale) {
      updateData.sale_price = salePrice
    } else {
      updateData.sale_price = null
    }

    const { error: updateError } = await supabase
      .from('player_countries')
      .update(updateData)
      .eq('id', playerCountryId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: isForSale 
        ? `Propiedad puesta en venta por $${salePrice.toLocaleString()}`
        : 'Propiedad retirada de venta',
    })
  } catch (error: any) {
    console.error('[Sell Property] Error:', error)
    return NextResponse.json({
      error: error.message || 'Error al actualizar estado de venta',
    }, { status: 500 })
  }
}

