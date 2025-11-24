import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: { sessionId: string } }
) {
  try {
    const supabase = await createClient()
    const { sessionId } = params

    // Obtener movimientos recientes
    const { data: moves, error: movesError } = await supabase
      .from('game_moves')
      .select(`
        id,
        player_id,
        move_type,
        move_data,
        created_at,
        session_players!inner(
          color,
          profiles!inner(
            username
          )
        )
      `)
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (movesError) {
      throw movesError
    }

    // Formatear transacciones
    const transactions = moves?.map((move: any) => ({
      id: move.id,
      player_id: move.player_id,
      move_type: move.move_type,
      move_data: move.move_data,
      created_at: move.created_at,
      player: {
        profile: {
          username: move.session_players.profiles.username,
        },
        color: move.session_players.color,
      },
    })) || []

    return NextResponse.json({ transactions })
  } catch (error: any) {
    console.error('[Transactions] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Error al obtener transacciones' },
      { status: 500 }
    )
  }
}

