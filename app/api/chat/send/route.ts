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

    const { sessionId, message } = await request.json()

    if (!sessionId || !message) {
      return NextResponse.json({ error: 'sessionId y message son requeridos' }, { status: 400 })
    }

    // Validar que el mensaje no esté vacío
    const trimmedMessage = message.trim()
    if (!trimmedMessage || trimmedMessage.length === 0) {
      return NextResponse.json({ error: 'El mensaje no puede estar vacío' }, { status: 400 })
    }

    // Validar longitud del mensaje (máximo 500 caracteres)
    if (trimmedMessage.length > 500) {
      return NextResponse.json({ error: 'El mensaje no puede tener más de 500 caracteres' }, { status: 400 })
    }

    // Verificar que el usuario está en la sesión
    const { data: player } = await supabase
      .from('session_players')
      .select('id')
      .eq('session_id', sessionId)
      .eq('user_id', user.id)
      .single()

    if (!player) {
      return NextResponse.json({ error: 'No estás en esta sesión' }, { status: 403 })
    }

    // Insertar mensaje
    const { data: newMessage, error: insertError } = await supabase
      .from('chat_messages')
      .insert({
        session_id: sessionId,
        user_id: user.id,
        message: trimmedMessage,
      })
      .select(`
        *,
        profile:profiles!chat_messages_user_id_fkey(id, username, avatar_url)
      `)
      .single()

    if (insertError) {
      console.error('Error insertando mensaje:', insertError)
      return NextResponse.json({ error: 'Error al enviar mensaje' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      message: newMessage 
    })
  } catch (error: any) {
    console.error('[Send Message] Error:', error)
    return NextResponse.json({
      error: error.message || 'Error al enviar mensaje',
    }, { status: 500 })
  }
}

