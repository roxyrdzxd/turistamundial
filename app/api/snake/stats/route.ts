import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const emptyStats = {
  best_score: 0,
  games_played: 0,
  total_score: 0,
  total_food: 0,
  longest_snake: 3,
  best_level: 1,
  average_score: 0,
  last_played_at: null,
  rank: null,
}

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    const [{ data: stats, error: statsError }, { data: leaderboard }] = await Promise.all([
      supabase
        .from('snake_player_stats')
        .select('best_score, games_played, total_score, total_food, longest_snake, best_level, average_score, last_played_at')
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase.rpc('get_snake_leaderboard', { limit_count: 100 }),
    ])

    if (statsError) {
      console.error('Error obteniendo estadisticas Snake:', statsError)
      return NextResponse.json(
        { error: 'Error al obtener estadisticas' },
        { status: 500 }
      )
    }

    const userRank = leaderboard?.find((entry: any) => entry.user_id === user.id)?.rank || null

    return NextResponse.json({
      stats: {
        ...emptyStats,
        ...(stats || {}),
        rank: userRank,
      },
    })
  } catch (error: any) {
    console.error('Error en snake stats:', error)
    return NextResponse.json(
      { error: error.message || 'Error al obtener estadisticas' },
      { status: 500 }
    )
  }
}
