import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { canBuild, getBuildCost } from '@/lib/game/gameEngine'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { sessionId, countryId, houses = 0, hotels = 0 } = await request.json()

    if (!sessionId || !countryId) {
      return NextResponse.json({ error: 'sessionId y countryId requeridos' }, { status: 400 })
    }

    if (houses === 0 && hotels === 0) {
      return NextResponse.json({ error: 'Debes construir al menos 1 casa o hotel' }, { status: 400 })
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

    // Obtener país
    const { data: country, error: countryError } = await supabase
      .from('countries')
      .select('*')
      .eq('id', countryId)
      .single()

    if (countryError || !country) {
      return NextResponse.json({ error: 'País no encontrado' }, { status: 404 })
    }

    // Obtener países comprados
    const { data: playerCountries } = await supabase
      .from('player_countries')
      .select('*')
      .eq('session_id', sessionId)

    const { data: allCountries } = await supabase
      .from('countries')
      .select('*')

    const gameState = {
      sessionId,
      players: players || [],
      playerCountries: playerCountries || [],
      countries: allCountries || [],
      currentTurn: session.current_turn,
    }

    // Verificar si puede construir
    const buildCheck = canBuild(country, currentPlayer.id, gameState)

    if (!buildCheck.canBuild) {
      return NextResponse.json({ error: buildCheck.reason || 'No puedes construir aquí' }, { status: 400 })
    }

    // Verificar límites
    const playerCountry = playerCountries?.find(
      pc => pc.country_id === countryId && pc.player_id === currentPlayer.id
    )

    if (!playerCountry) {
      return NextResponse.json({ error: 'No eres dueño de este país' }, { status: 400 })
    }

    if (houses > 0 && playerCountry.houses + houses > 4) {
      return NextResponse.json({ error: 'Máximo 4 casas por país' }, { status: 400 })
    }

    if (hotels > 0 && (playerCountry.hotels > 0 || playerCountry.houses < 4)) {
      return NextResponse.json({ error: 'Necesitas 4 casas antes de construir un hotel' }, { status: 400 })
    }

    // Calcular costo
    const cost = getBuildCost(country, houses, hotels)

    if (currentPlayer.money < cost) {
      return NextResponse.json({ error: 'No tienes suficiente dinero' }, { status: 400 })
    }

    // Actualizar construcción
    const newHouses = Math.min(playerCountry.houses + houses, 4)
    const newHotels = hotels > 0 ? 1 : playerCountry.hotels

    // Si construye hotel, quitar las 4 casas
    const finalHouses = newHotels > 0 ? 0 : newHouses

    const { error: buildError } = await supabase
      .from('player_countries')
      .update({
        houses: finalHouses,
        hotels: newHotels,
      })
      .eq('id', playerCountry.id)

    if (buildError) {
      return NextResponse.json({ error: buildError.message }, { status: 500 })
    }

    // Descontar dinero
    const { error: moneyError } = await supabase
      .from('session_players')
      .update({ money: currentPlayer.money - cost })
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
        move_type: 'build',
        move_data: {
          country_id: countryId,
          country_name: country.name,
          houses,
          hotels,
          cost,
        },
      })

    return NextResponse.json({
      success: true,
      message: `Has construido ${houses > 0 ? houses + ' casa(s)' : ''} ${hotels > 0 ? '1 hotel' : ''} en ${country.name}`,
    })
  } catch (error: any) {
    console.error('[Build] Error:', error)
    return NextResponse.json({
      error: error.message || 'Error al construir',
    }, { status: 500 })
  }
}

