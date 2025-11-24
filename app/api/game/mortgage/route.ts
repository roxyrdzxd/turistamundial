import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getMortgageValue } from '@/lib/game/gameEngine'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { sessionId, playerCountryId } = await request.json()

    if (!sessionId || !playerCountryId) {
      return NextResponse.json({ error: 'sessionId y playerCountryId requeridos' }, { status: 400 })
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

    // Verificar que no está ya hipotecada
    if (playerCountry.is_mortgaged) {
      return NextResponse.json({ error: 'Esta propiedad ya está hipotecada' }, { status: 400 })
    }

    // Verificar que no tiene casas/hoteles (debe venderlas primero)
    if (playerCountry.houses > 0 || playerCountry.hotels > 0) {
      return NextResponse.json({ 
        error: 'Debes vender todas las casas y hoteles antes de hipotecar' 
      }, { status: 400 })
    }

    const country = playerCountry.countries
    if (!country) {
      return NextResponse.json({ error: 'País no encontrado' }, { status: 404 })
    }

    const mortgageValue = getMortgageValue(country)

    // Hipotecar la propiedad
    const { error: mortgageError } = await supabase
      .from('player_countries')
      .update({ is_mortgaged: true })
      .eq('id', playerCountryId)

    if (mortgageError) {
      return NextResponse.json({ error: mortgageError.message }, { status: 500 })
    }

    // Agregar dinero al jugador
    const { error: moneyError } = await supabase
      .from('session_players')
      .update({ money: currentPlayer.money + mortgageValue })
      .eq('id', currentPlayer.id)

    if (moneyError) {
      return NextResponse.json({ error: moneyError.message }, { status: 500 })
    }

    // Registrar movimiento
    await supabase.from('game_moves').insert({
      session_id: sessionId,
      player_id: currentPlayer.id,
      move_type: 'mortgage',
      move_data: {
        country_name: country.name,
        mortgage_value: mortgageValue,
      },
    })

    return NextResponse.json({
      message: `Has hipotecado ${country.name} por $${mortgageValue.toLocaleString()}`,
      mortgageValue,
    })
  } catch (error: any) {
    console.error('[Mortgage] Error:', error)
    return NextResponse.json({ error: error.message || 'Error al hipotecar propiedad' }, { status: 500 })
  }
}

