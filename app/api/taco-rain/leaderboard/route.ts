import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const limit = Number(searchParams.get('limit') || 10)

    const { data, error } = await supabase.rpc('get_taco_rain_leaderboard', {
      limit_count: Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 100) : 10,
    })

    if (error) {
      console.error('Error obteniendo ranking Lluvia de Tacos:', error)
      return NextResponse.json(
        { error: 'Error al obtener el ranking' },
        { status: 500 }
      )
    }

    return NextResponse.json({ leaderboard: data || [] })
  } catch (error: any) {
    console.error('Error en taco rain leaderboard:', error)
    return NextResponse.json(
      { error: error.message || 'Error al obtener el ranking' },
      { status: 500 }
    )
  }
}
