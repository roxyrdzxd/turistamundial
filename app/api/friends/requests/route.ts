import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Obtener solicitudes recibidas pendientes
    const { data: receivedRequests } = await supabase
      .from('friend_requests')
      .select(`
        *,
        sender:profiles!friend_requests_sender_id_fkey(id, username, avatar_url)
      `)
      .eq('receiver_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    // Obtener solicitudes enviadas pendientes
    const { data: sentRequests } = await supabase
      .from('friend_requests')
      .select(`
        *,
        receiver:profiles!friend_requests_receiver_id_fkey(id, username, avatar_url)
      `)
      .eq('sender_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    return NextResponse.json({
      received: receivedRequests || [],
      sent: sentRequests || [],
    })
  } catch (error: any) {
    console.error('[GetFriendRequests] Error:', error)
    return NextResponse.json({ error: error.message || 'Error al obtener solicitudes' }, { status: 500 })
  }
}

