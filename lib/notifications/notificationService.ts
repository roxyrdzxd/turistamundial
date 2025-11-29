// Servicio para enviar notificaciones push desde el servidor
// Usa web-push para enviar notificaciones a los usuarios suscritos

import webpush from 'web-push'
import { createClient } from '@/lib/supabase/server'

interface NotificationPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  tag?: string
  url?: string
  requireInteraction?: boolean
  data?: Record<string, any>
}

interface PushSubscription {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

class NotificationService {
  private vapidPublicKey: string
  private vapidPrivateKey: string
  private vapidEmail: string

  constructor() {
    // Obtener claves VAPID de variables de entorno
    this.vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
    this.vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || ''
    this.vapidEmail = process.env.VAPID_EMAIL || 'mailto:noreply@turix.club'

    // Configurar web-push con las claves VAPID
    if (this.vapidPublicKey && this.vapidPrivateKey) {
      webpush.setVapidDetails(
        this.vapidEmail,
        this.vapidPublicKey,
        this.vapidPrivateKey
      )
    }
  }

  /**
   * Verifica si el servicio está configurado correctamente
   */
  isConfigured(): boolean {
    return !!(this.vapidPublicKey && this.vapidPrivateKey)
  }

  /**
   * Obtiene todas las suscripciones de un usuario
   */
  async getUserSubscriptions(userId: string): Promise<PushSubscription[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', userId)

    if (error) {
      console.error('[NotificationService] Error obteniendo suscripciones:', error)
      return []
    }

    return (data || []).map(sub => ({
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.p256dh,
        auth: sub.auth
      }
    }))
  }

  /**
   * Envía una notificación a un usuario específico
   */
  async sendToUser(
    userId: string,
    payload: NotificationPayload
  ): Promise<{ success: number; failed: number }> {
    if (!this.isConfigured()) {
      console.error('[NotificationService] VAPID keys no configuradas')
      return { success: 0, failed: 0 }
    }

    const subscriptions = await this.getUserSubscriptions(userId)
    if (subscriptions.length === 0) {
      console.log(`[NotificationService] Usuario ${userId} no tiene suscripciones`)
      return { success: 0, failed: 0 }
    }

    let success = 0
    let failed = 0

    const notificationPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/icons/icon-192x192.png',
      badge: payload.badge || '/icons/icon-72x72.png',
      tag: payload.tag || 'turix-notification',
      url: payload.url || '/dashboard',
      requireInteraction: payload.requireInteraction || false,
      data: payload.data || {}
    })

    // Enviar a todas las suscripciones del usuario
    const promises = subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.keys.p256dh,
              auth: subscription.keys.auth
            }
          },
          notificationPayload
        )
        success++
      } catch (error: any) {
        console.error('[NotificationService] Error enviando notificación:', error)

        // Si la suscripción es inválida (410), eliminarla
        if (error.statusCode === 410) {
          await this.removeSubscription(subscription.endpoint)
        }

        failed++
      }
    })

    await Promise.allSettled(promises)

    return { success, failed }
  }

  /**
   * Envía una notificación a múltiples usuarios
   */
  async sendToUsers(
    userIds: string[],
    payload: NotificationPayload
  ): Promise<{ success: number; failed: number }> {
    let totalSuccess = 0
    let totalFailed = 0

    for (const userId of userIds) {
      const result = await this.sendToUser(userId, payload)
      totalSuccess += result.success
      totalFailed += result.failed
    }

    return { success: totalSuccess, failed: totalFailed }
  }

  /**
   * Elimina una suscripción inválida
   */
  private async removeSubscription(endpoint: string): Promise<void> {
    const supabase = await createClient()

    await supabase
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', endpoint)
  }
}

// Exportar instancia singleton
export const notificationService = new NotificationService()

