// Gestor de notificaciones push en el cliente
// Maneja la suscripción y desuscripción de notificaciones push

export interface PushSubscriptionData {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

class PushManager {
  private registration: ServiceWorkerRegistration | null = null
  private subscription: PushSubscription | null = null

  /**
   * Inicializa el PushManager
   */
  async initialize(): Promise<boolean> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('[PushManager] Push notifications no están soportadas en este navegador')
      return false
    }

    try {
      this.registration = await navigator.serviceWorker.ready
      return true
    } catch (error) {
      console.error('[PushManager] Error inicializando:', error)
      return false
    }
  }

  /**
   * Verifica si las notificaciones están soportadas
   */
  isSupported(): boolean {
    return (
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    )
  }

  /**
   * Verifica el permiso actual de notificaciones
   */
  async getPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      return 'denied'
    }
    return Notification.permission
  }

  /**
   * Solicita permiso para notificaciones
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      throw new Error('Las notificaciones no están soportadas en este navegador')
    }

    const permission = await Notification.requestPermission()
    return permission
  }

  /**
   * Convierte una clave VAPID pública de base64 a Uint8Array
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')

    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
  }

  /**
   * Obtiene la suscripción actual
   */
  async getSubscription(): Promise<PushSubscription | null> {
    if (!this.registration) {
      await this.initialize()
    }

    if (!this.registration) {
      return null
    }

    try {
      this.subscription = await this.registration.pushManager.getSubscription()
      return this.subscription
    } catch (error) {
      console.error('[PushManager] Error obteniendo suscripción:', error)
      return null
    }
  }

  /**
   * Suscribe al usuario a notificaciones push
   */
  async subscribe(vapidPublicKey: string): Promise<PushSubscription | null> {
    if (!this.registration) {
      const initialized = await this.initialize()
      if (!initialized) {
        throw new Error('No se pudo inicializar el Service Worker')
      }
    }

    if (!this.registration) {
      throw new Error('Service Worker no está registrado')
    }

    // Verificar permiso
    const permission = await this.getPermission()
    if (permission !== 'granted') {
      throw new Error('Permiso de notificaciones no otorgado')
    }

    try {
      // Verificar si ya existe una suscripción
      let subscription = await this.registration.pushManager.getSubscription()

      if (!subscription) {
        // Crear nueva suscripción
        const applicationServerKey = this.urlBase64ToUint8Array(vapidPublicKey)
        subscription = await this.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey
        })
      }

      this.subscription = subscription
      return subscription
    } catch (error) {
      console.error('[PushManager] Error suscribiendo:', error)
      throw error
    }
  }

  /**
   * Desuscribe al usuario de notificaciones push
   */
  async unsubscribe(): Promise<boolean> {
    if (!this.registration) {
      await this.initialize()
    }

    if (!this.registration) {
      return false
    }

    try {
      const subscription = await this.registration.pushManager.getSubscription()
      if (subscription) {
        const result = await subscription.unsubscribe()
        this.subscription = null
        return result
      }
      return true
    } catch (error) {
      console.error('[PushManager] Error desuscribiendo:', error)
      return false
    }
  }

  /**
   * Convierte una suscripción a formato para enviar al servidor
   */
  subscriptionToJSON(subscription: PushSubscription): PushSubscriptionData {
    const keys = subscription.getKey('p256dh')
    const auth = subscription.getKey('auth')

    if (!keys || !auth) {
      throw new Error('No se pudieron obtener las claves de la suscripción')
    }

    return {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: this.arrayBufferToBase64(keys),
        auth: this.arrayBufferToBase64(auth)
      }
    }
  }

  /**
   * Convierte ArrayBuffer a base64
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return window.btoa(binary)
  }
}

// Exportar instancia singleton
export const pushManager = new PushManager()

