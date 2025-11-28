import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const boardId = searchParams.get('boardId')
    const sessionId = searchParams.get('sessionId')
    
    // Si hay sessionId, obtener el board_id de la sesión
    let targetBoardId = boardId
    if (sessionId && !boardId) {
      const { data: session } = await supabase
        .from('game_sessions')
        .select('board_id')
        .eq('id', sessionId)
        .single()
      
      if (session?.board_id) {
        targetBoardId = session.board_id
      }
    }

    // Si no hay boardId, usar el tablero mundial por defecto
    if (!targetBoardId) {
      targetBoardId = '00000000-0000-0000-0000-000000000001'
    }
    
    const { data: countries, error } = await supabase
      .from('countries')
      .select('*')
      .eq('board_id', targetBoardId)
      .order('position', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ countries: countries || [] })
  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message || 'Error al obtener países' 
    }, { status: 500 })
  }
}

