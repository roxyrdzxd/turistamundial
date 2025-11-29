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
    const { endpoint } = body

    // Si se proporciona endpoint, eliminar solo esa suscripción
    // Si no, eliminar todas las suscripciones del usuario
    const query = supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', user.id)

    if (endpoint) {
      query.eq('endpoint', endpoint)
    }

    const { error } = await query

    if (error) {
      console.error('[Unsubscribe] Error eliminando suscripción:', error)
      return NextResponse.json(
        { error: 'Error al eliminar suscripción' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
    })
  } catch (error: any) {
    console.error('[Unsubscribe] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Error al desuscribirse' },
      { status: 500 }
    )
  }
}

