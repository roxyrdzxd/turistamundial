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

    const body = await request.json()
    const { sessionId } = body

    if (!sessionId || typeof sessionId !== 'string') {
      console.error('[Join Session] sessionId inválido:', sessionId)
      return NextResponse.json({ error: 'sessionId requerido' }, { status: 400 })
    }

    // Verificar que la sesión existe
    const { data: session, error: sessionError } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      console.error('[Join Session] Sesión no encontrada:', sessionError)
      return NextResponse.json({ error: 'Sesión no encontrada' }, { status: 404 })
    }

    // Verificar que la sesión esté esperando jugadores
    if (session.status !== 'waiting') {
      console.error(`[Join Session] Sesión en estado incorrecto: ${session.status}`)
      return NextResponse.json({ 
        error: `La sesión está ${session.status === 'active' ? 'en curso' : 'finalizada'}` 
      }, { status: 400 })
    }

    // Verificar que no esté llena
    if (session.current_players >= session.max_players) {
      console.error(`[Join Session] Sesión llena: ${session.current_players}/${session.max_players}`)
      return NextResponse.json({ error: 'La sesión está llena' }, { status: 400 })
    }

    // Verificar que el usuario no esté ya en la sesión (usar maybeSingle para evitar error si no existe)
    const { data: existingPlayer, error: existingError } = await supabase
      .from('session_players')
      .select('id')
      .eq('session_id', sessionId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (existingError) {
      console.error('[Join Session] Error verificando jugador existente:', existingError)
    }

    if (existingPlayer) {
      // Si ya está en la sesión, devolver éxito pero con mensaje informativo
      // Esto permite que el frontend redirija sin mostrar error
      return NextResponse.json({ 
        message: 'Ya estás en esta sesión',
        session,
        alreadyInSession: true
      })
    }

    // Obtener colores ya usados
    const { data: existingPlayers } = await supabase
      .from('session_players')
      .select('color')
      .eq('session_id', sessionId)

    const usedColors = existingPlayers?.map(p => p.color) || []
    const availableColors = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'cyan']
    const availableColor = availableColors.find(c => !usedColors.includes(c)) || availableColors[0]

    // Agregar jugador a la sesión
    const { data: player, error: playerError } = await supabase
      .from('session_players')
      .insert({
        session_id: sessionId,
        user_id: user.id,
        position: 0,
        money: 1500,
        color: availableColor,
        turn_order: session.current_players,
        is_bankrupt: false,
      })
      .select()
      .single()

    if (playerError) {
      console.error('[Join Session] Error insertando jugador:', playerError)
      return NextResponse.json({ error: playerError.message }, { status: 500 })
    }

    // Actualizar contador de jugadores
    const { error: updateError } = await supabase
      .from('game_sessions')
      .update({ current_players: session.current_players + 1 })
      .eq('id', sessionId)

    if (updateError) {
      console.error('[Join Session] Error actualizando contador:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ 
      session: {
        ...session,
        current_players: session.current_players + 1,
      },
      player,
    })
  } catch (error: any) {
    console.error('[Join Session] Error general:', error)
    return NextResponse.json({ 
      error: error.message || 'Error al unirse a la sesión' 
    }, { status: 500 })
  }
}

