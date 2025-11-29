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
    const { endpoint, p256dh, auth } = body

    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json(
        { error: 'Faltan datos de suscripción' },
        { status: 400 }
      )
    }

    // Insertar o actualizar la suscripción
    const { data, error } = await supabase
      .from('push_subscriptions')
      .upsert(
        {
          user_id: user.id,
          endpoint,
          p256dh,
          auth,
        },
        {
          onConflict: 'user_id,endpoint',
        }
      )
      .select()
      .single()

    if (error) {
      console.error('[Subscribe] Error guardando suscripción:', error)
      return NextResponse.json(
        { error: 'Error al guardar suscripción' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      subscription: data,
    })
  } catch (error: any) {
    console.error('[Subscribe] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Error al suscribirse' },
      { status: 500 }
    )
  }
}

