import { notificationService } from '@/lib/notifications/notificationService'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    // Este endpoint es para uso interno, podría requerir autenticación especial
    // Por ahora, lo dejamos abierto pero solo se debe llamar desde el servidor

    const requestBody = await request.json()
    const { userId, userIds, title, body, icon, badge, tag, url, requireInteraction, data } = requestBody

    if (!title || !body) {
      return NextResponse.json(
        { error: 'Título y cuerpo son requeridos' },
        { status: 400 }
      )
    }

    if (!userId && !userIds) {
      return NextResponse.json(
        { error: 'userId o userIds es requerido' },
        { status: 400 }
      )
    }

    if (!notificationService.isConfigured()) {
      return NextResponse.json(
        { error: 'Servicio de notificaciones no configurado' },
        { status: 500 }
      )
    }

    const payload = {
      title,
      body,
      icon,
      badge,
      tag,
      url,
      requireInteraction,
      data,
    }

    let result

    if (userIds && Array.isArray(userIds)) {
      // Enviar a múltiples usuarios
      result = await notificationService.sendToUsers(userIds, payload)
    } else {
      // Enviar a un solo usuario
      result = await notificationService.sendToUser(userId, payload)
    }

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error: any) {
    console.error('[Send Notification] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Error al enviar notificación' },
      { status: 500 }
    )
  }
}

