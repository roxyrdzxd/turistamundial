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

    const { sessionId } = await request.json()

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId requerido' }, { status: 400 })
    }

    // Actualizar estado del jugador como online y actualizar last_seen
    const { error: updateError } = await supabase
      .from('session_players')
      .update({
        is_online: true,
        last_seen: new Date().toISOString(),
      })
      .eq('session_id', sessionId)
      .eq('user_id', user.id)

    if (updateError) {
      console.error('Error actualizando heartbeat:', updateError)
      return NextResponse.json({ error: 'Error al actualizar estado' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[Heartbeat] Error:', error)
    return NextResponse.json({
      error: error.message || 'Error en heartbeat',
    }, { status: 500 })
  }
}

