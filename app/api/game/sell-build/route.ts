import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getSellBuildValue } from '@/lib/game/gameEngine'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { sessionId, playerCountryId, houses = 0, hotels = 0 } = await request.json()

    if (!sessionId || !playerCountryId) {
      return NextResponse.json({ error: 'sessionId y playerCountryId requeridos' }, { status: 400 })
    }

    if (houses === 0 && hotels === 0) {
      return NextResponse.json({ error: 'Debes vender al menos 1 casa o hotel' }, { status: 400 })
    }

    // Verificar que la sesión existe y está activa
    const { data: session } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('status', 'active')
      .single()

    if (!session) {
      return NextResponse.json({ error: 'Sesión no encontrada o no está activa' }, { status: 404 })
    }

    // Obtener la propiedad con el país
    const { data: playerCountry, error: pcError } = await supabase
      .from('player_countries')
      .select(`
        *,
        countries (*)
      `)
      .eq('id', playerCountryId)
      .single()

    if (pcError || !playerCountry) {
      return NextResponse.json({ error: 'Propiedad no encontrada' }, { status: 404 })
    }

    // Verificar que el jugador es el dueño
    const { data: currentPlayer } = await supabase
      .from('session_players')
      .select('*')
      .eq('session_id', sessionId)
      .eq('user_id', user.id)
      .single()

    if (!currentPlayer || playerCountry.player_id !== currentPlayer.id) {
      return NextResponse.json({ error: 'No eres el dueño de esta propiedad' }, { status: 403 })
    }

    // Verificar que no está hipotecada
    if (playerCountry.is_mortgaged) {
      return NextResponse.json({ error: 'No puedes vender construcciones de una propiedad hipotecada' }, { status: 400 })
    }

    // Verificar que tiene las construcciones que quiere vender
    if (houses > playerCountry.houses) {
      return NextResponse.json({ error: `Solo tienes ${playerCountry.houses} casa(s)` }, { status: 400 })
    }

    if (hotels > playerCountry.hotels) {
      return NextResponse.json({ error: `Solo tienes ${playerCountry.hotels} hotel(es)` }, { status: 400 })
    }

    const country = playerCountry.countries
    if (!country) {
      return NextResponse.json({ error: 'País no encontrado' }, { status: 404 })
    }

    const sellValue = getSellBuildValue(country, houses, hotels)

    // Calcular nuevas cantidades
    const newHouses = playerCountry.houses - houses
    const newHotels = playerCountry.hotels - hotels

    // Si vendes un hotel, no puedes tener casas (regla del juego)
    // Pero si vendes casas, puedes mantener hoteles
    const finalHouses = newHotels > 0 ? 0 : newHouses

    // Actualizar la propiedad
    const { error: updateError } = await supabase
      .from('player_countries')
      .update({
        houses: finalHouses,
        hotels: newHotels,
      })
      .eq('id', playerCountryId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Agregar dinero al jugador
    const { error: moneyError } = await supabase
      .from('session_players')
      .update({ money: currentPlayer.money + sellValue })
      .eq('id', currentPlayer.id)

    if (moneyError) {
      return NextResponse.json({ error: moneyError.message }, { status: 500 })
    }

    // Registrar movimiento
    await supabase.from('game_moves').insert({
      session_id: sessionId,
      player_id: currentPlayer.id,
      move_type: 'sell_build',
      move_data: {
        country_name: country.name,
        houses_sold: houses,
        hotels_sold: hotels,
        sell_value: sellValue,
      },
    })

    return NextResponse.json({
      message: `Has vendido ${houses > 0 ? houses + ' casa(s)' : ''} ${hotels > 0 ? hotels + ' hotel(es)' : ''} en ${country.name} por $${sellValue.toLocaleString()}`,
      sellValue,
    })
  } catch (error: any) {
    console.error('[SellBuild] Error:', error)
    return NextResponse.json({ error: error.message || 'Error al vender construcciones' }, { status: 500 })
  }
}

