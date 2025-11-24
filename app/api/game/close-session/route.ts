import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
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

    const body = await request.json()
    const { sessionId } = body

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId es requerido' },
        { status: 400 }
      )
    }

    // Obtener la sesión
    const { data: session, error: sessionError } = await supabase
      .from('game_sessions')
      .select('id, host_id, status')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Sesión no encontrada' },
        { status: 404 }
      )
    }

    // Verificar que el usuario es el host
    if (session.host_id !== user.id) {
      return NextResponse.json(
        { error: 'Solo el host puede cerrar la partida' },
        { status: 403 }
      )
    }

    // Verificar que la sesión no esté ya cerrada
    if (session.status === 'finished') {
      return NextResponse.json(
        { error: 'La partida ya está cerrada' },
        { status: 400 }
      )
    }

    // Cerrar la sesión
    const { data: updatedSession, error: updateError } = await supabase
      .from('game_sessions')
      .update({
        status: 'finished',
        finished_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .select()
      .single()

    if (updateError) {
      console.error('Error closing session:', updateError)
      return NextResponse.json(
        { error: 'Error al cerrar la partida' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      session: updatedSession,
      message: 'Partida cerrada correctamente'
    })
  } catch (error: any) {
    console.error('Error in close session:', error)
    return NextResponse.json(
      { error: error.message || 'Error al cerrar la partida' },
      { status: 500 }
    )
  }
}

