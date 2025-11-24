import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { receiverId } = await request.json()

    if (!receiverId) {
      return NextResponse.json({ error: 'receiverId requerido' }, { status: 400 })
    }

    if (receiverId === user.id) {
      return NextResponse.json({ error: 'No puedes enviarte una solicitud a ti mismo' }, { status: 400 })
    }

    // Verificar que el receptor existe
    const { data: receiver } = await supabase
      .from('profiles')
      .select('id, username')
      .eq('id', receiverId)
      .single()

    if (!receiver) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    // Verificar que no hay una solicitud pendiente
    const { data: existingRequests } = await supabase
      .from('friend_requests')
      .select('*')
      .eq('status', 'pending')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${user.id})`)
    
    const existingRequest = existingRequests && existingRequests.length > 0 ? existingRequests[0] : null

    if (existingRequest) {
      return NextResponse.json({ error: 'Ya existe una solicitud pendiente' }, { status: 400 })
    }

    // Verificar que no son ya amigos
    // Asegurar que user1_id < user2_id para la búsqueda
    const user1 = user.id < receiverId ? user.id : receiverId
    const user2 = user.id < receiverId ? receiverId : user.id
    
    const { data: existingFriendship } = await supabase
      .from('friendships')
      .select('*')
      .eq('user1_id', user1)
      .eq('user2_id', user2)
      .single()

    if (existingFriendship) {
      return NextResponse.json({ error: 'Ya son amigos' }, { status: 400 })
    }

    // Crear solicitud
    const { data: friendRequest, error: insertError } = await supabase
      .from('friend_requests')
      .insert({
        sender_id: user.id,
        receiver_id: receiverId,
        status: 'pending',
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({
      message: `Solicitud de amistad enviada a ${receiver.username}`,
      friendRequest,
    })
  } catch (error: any) {
    console.error('[SendFriendRequest] Error:', error)
    return NextResponse.json({ error: error.message || 'Error al enviar solicitud' }, { status: 500 })
  }
}

