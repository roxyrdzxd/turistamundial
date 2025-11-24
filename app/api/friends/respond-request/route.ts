import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { requestId, action } = await request.json() // action: 'accept' o 'reject'

    if (!requestId || !action) {
      return NextResponse.json({ error: 'requestId y action requeridos' }, { status: 400 })
    }

    if (action !== 'accept' && action !== 'reject') {
      return NextResponse.json({ error: 'action debe ser "accept" o "reject"' }, { status: 400 })
    }

    // Verificar que la solicitud existe y es para este usuario
    const { data: friendRequest } = await supabase
      .from('friend_requests')
      .select('*, sender:profiles!friend_requests_sender_id_fkey(id, username)')
      .eq('id', requestId)
      .eq('receiver_id', user.id)
      .eq('status', 'pending')
      .single()

    if (!friendRequest) {
      return NextResponse.json({ error: 'Solicitud no encontrada o ya procesada' }, { status: 404 })
    }

    // Actualizar estado de la solicitud
    const { error: updateError } = await supabase
      .from('friend_requests')
      .update({ status: action === 'accept' ? 'accepted' : 'rejected' })
      .eq('id', requestId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Si se acepta, la amistad se crea automáticamente por el trigger

    return NextResponse.json({
      message: action === 'accept' 
        ? `Ahora eres amigo de ${friendRequest.sender.username}`
        : 'Solicitud rechazada',
    })
  } catch (error: any) {
    console.error('[RespondFriendRequest] Error:', error)
    return NextResponse.json({ error: error.message || 'Error al procesar solicitud' }, { status: 500 })
  }
}

