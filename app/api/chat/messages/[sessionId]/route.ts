import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: { sessionId: string } }
) {
  try {
    const supabase = await createClient()
    
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { sessionId } = params

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

    // Obtener los últimos 50 mensajes
    const { data: messages, error } = await supabase
      .from('chat_messages')
      .select(`
        *,
        profile:profiles!chat_messages_user_id_fkey(id, username, avatar_url)
      `)
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Error obteniendo mensajes:', error)
      return NextResponse.json({ error: 'Error al obtener mensajes' }, { status: 500 })
    }

    // Invertir el orden para mostrar los más antiguos primero
    return NextResponse.json({ 
      messages: (messages || []).reverse()
    })
  } catch (error: any) {
    console.error('[Get Messages] Error:', error)
    return NextResponse.json({
      error: error.message || 'Error al obtener mensajes',
    }, { status: 500 })
  }
}

