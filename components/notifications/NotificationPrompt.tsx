'use client'

import { useState, useEffect } from 'react'
import { pushManager } from '@/lib/notifications/pushManager'
import { useToast } from '@/contexts/ToastContext'

export default function NotificationPrompt() {
  const [isSupported, setIsSupported] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showPrompt, setShowPrompt] = useState(false)
  const toast = useToast()

  useEffect(() => {
    checkSupport()
    checkPermission()
    checkSubscription()
  }, [])

  const checkSupport = () => {
    setIsSupported(pushManager.isSupported())
  }

  const checkPermission = async () => {
    const currentPermission = await pushManager.getPermission()
    setPermission(currentPermission)
    setShowPrompt(currentPermission === 'default')
  }

  const checkSubscription = async () => {
    const subscription = await pushManager.getSubscription()
    setIsSubscribed(!!subscription)
  }

  const handleEnableNotifications = async () => {
    setIsLoading(true)

    try {
      // Solicitar permiso
      const newPermission = await pushManager.requestPermission()

      if (newPermission !== 'granted') {
        toast.showToast('Permiso de notificaciones denegado', 'error')
        setPermission(newPermission)
        setShowPrompt(false)
        setIsLoading(false)
        return
      }

      setPermission(newPermission)

      // Obtener clave VAPID pública
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidPublicKey) {
        throw new Error('VAPID public key no configurada')
      }

      // Suscribir
      const subscription = await pushManager.subscribe(vapidPublicKey)
      if (!subscription) {
        throw new Error('No se pudo crear la suscripción')
      }

      // Enviar suscripción al servidor
      const subscriptionData = pushManager.subscriptionToJSON(subscription)
      const response = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endpoint: subscriptionData.endpoint,
          p256dh: subscriptionData.keys.p256dh,
          auth: subscriptionData.keys.auth,
        }),
      })

      if (!response.ok) {
        throw new Error('Error al guardar suscripción')
      }

      setIsSubscribed(true)
      setShowPrompt(false)
      toast.showToast('¡Notificaciones activadas!', 'success')

      // Guardar preferencia en localStorage
      localStorage.setItem('notificationsEnabled', 'true')
    } catch (error: any) {
      console.error('[NotificationPrompt] Error:', error)
      toast.showToast(error.message || 'Error al activar notificaciones', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDisableNotifications = async () => {
    setIsLoading(true)

    try {
      // Desuscribir del navegador
      await pushManager.unsubscribe()

      // Eliminar del servidor
      const response = await fetch('/api/notifications/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      })

      if (!response.ok) {
        throw new Error('Error al eliminar suscripción')
      }

      setIsSubscribed(false)
      toast.showToast('Notificaciones desactivadas', 'info')

      // Guardar preferencia en localStorage
      localStorage.setItem('notificationsEnabled', 'false')
    } catch (error: any) {
      console.error('[NotificationPrompt] Error:', error)
      toast.showToast(error.message || 'Error al desactivar notificaciones', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isSupported) {
    return null
  }

  if (permission === 'denied') {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-white/80 text-sm">
        <p>Las notificaciones están bloqueadas. Por favor, habilítalas en la configuración de tu navegador.</p>
      </div>
    )
  }

  if (isSubscribed) {
    return (
      <button
        onClick={handleDisableNotifications}
        disabled={isLoading}
        className="bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white px-4 py-2 rounded-lg transition-all duration-300 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Desactivando...' : '🔕 Desactivar Notificaciones'}
      </button>
    )
  }

  if (showPrompt && permission === 'default') {
    return (
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 shadow-lg">
        <div className="flex items-start gap-4">
          <div className="text-3xl">🔔</div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-white mb-2">
              Activa las notificaciones
            </h3>
            <p className="text-white/80 text-sm mb-4">
              Recibe alertas cuando sea tu turno, te inviten a partidas o recibas solicitudes de amistad.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleEnableNotifications}
                disabled={isLoading}
                className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white px-4 py-2 rounded-lg transition-all duration-300 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Activando...' : 'Activar Notificaciones'}
              </button>
              <button
                onClick={() => setShowPrompt(false)}
                disabled={isLoading}
                className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-all duration-300 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Ahora no
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return null
}

