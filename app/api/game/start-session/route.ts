import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
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

  // Verificar que la sesión existe y el usuario es el host
  const { data: session, error: sessionError } = await supabase
    .from('game_sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('host_id', user.id)
    .eq('status', 'waiting')
    .single()

  if (sessionError || !session) {
    return NextResponse.json({ error: 'Sesión no encontrada o no eres el host' }, { status: 404 })
  }

  // Verificar que hay al menos 4 jugadores
  if (session.current_players < 4) {
    return NextResponse.json({ error: 'Se necesitan al menos 4 jugadores para iniciar' }, { status: 400 })
  }

  // Actualizar estado de la sesión
  const { error: updateError } = await supabase
    .from('game_sessions')
    .update({
      status: 'active',
      started_at: new Date().toISOString(),
      current_turn: 0,
    })
    .eq('id', sessionId)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, message: 'Partida iniciada' })
}

