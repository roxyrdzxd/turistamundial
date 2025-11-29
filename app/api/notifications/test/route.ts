import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { notificationService } from '@/lib/notifications/notificationService'

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

    // Verificar configuración
    const isConfigured = notificationService.isConfigured()
    
    // Obtener suscripciones del usuario
    const subscriptions = await notificationService.getUserSubscriptions(user.id)

    // Enviar notificación de prueba
    let testResult = null
    if (isConfigured && subscriptions.length > 0) {
      testResult = await notificationService.sendToUser(user.id, {
        title: '🧪 Notificación de Prueba',
        body: 'Si ves esto, las notificaciones están funcionando correctamente.',
        url: '/dashboard',
        tag: 'test-notification',
        requireInteraction: false,
      })
    }

    return NextResponse.json({
      configured: isConfigured,
      subscriptionCount: subscriptions.length,
      subscriptions: subscriptions.map(sub => ({
        endpoint: sub.endpoint.substring(0, 50) + '...',
        hasKeys: !!(sub.keys.p256dh && sub.keys.auth)
      })),
      testResult,
      vapidPublicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ? 'Configurada' : 'No configurada',
      vapidPrivateKey: process.env.VAPID_PRIVATE_KEY ? 'Configurada' : 'No configurada',
      appUrl: process.env.NEXT_PUBLIC_APP_URL || 'No configurada',
    })
  } catch (error: any) {
    console.error('[Test Notification] Error:', error)
    return NextResponse.json(
      { 
        error: error.message || 'Error al probar notificación',
        details: error.stack
      },
      { status: 500 }
    )
  }
}

