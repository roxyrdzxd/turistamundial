import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()
    const [
      { data: season, error: seasonError },
      { data: leaderboard, error: leaderboardError },
      { data: history, error: historyError },
    ] = await Promise.all([
      supabase.rpc('get_current_taco_rain_season'),
      supabase.rpc('get_current_taco_rain_season_leaderboard', {
        limit_count: 10,
      }),
      supabase.rpc('get_taco_rain_season_history', { limit_count: 5 }),
    ])

    if (seasonError || leaderboardError || historyError) {
      console.error('Error obteniendo temporada Lluvia de Tacos:', {
        seasonError,
        leaderboardError,
        historyError,
      })
      return NextResponse.json(
        { error: 'Error al obtener temporada semanal' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      season: season?.[0] || null,
      leaderboard: leaderboard || [],
      history: history || [],
    })
  } catch (error: any) {
    console.error('Error en taco rain season:', error)
    return NextResponse.json(
      { error: error.message || 'Error al obtener temporada semanal' },
      { status: 500 }
    )
  }
}
