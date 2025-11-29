'use client'

import { useState } from 'react'
import { useToast } from '@/contexts/ToastContext'

export default function NotificationTest() {
  const [loading, setLoading] = useState(false)
  const [diagnostics, setDiagnostics] = useState<any>(null)
  const toast = useToast()

  const handleTest = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/notifications/test', {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al probar notificaciones')
      }

      setDiagnostics(data)
      console.log('[NotificationTest] Diagnóstico completo:', data)
      
      if (data.testResult) {
        if (data.testResult.sent > 0) {
          toast.showToast('✅ Notificación enviada. Si no la ves, minimiza la ventana o revisa permisos del navegador.', 'success')
        } else if (data.testResult.failed > 0) {
          toast.showToast('⚠️ Error al enviar notificación. Revisa los logs del servidor.', 'error')
        } else {
          toast.showToast('ℹ️ Notificación procesada. Revisa la consola del Service Worker.', 'info')
        }
      } else if (data.subscriptionCount === 0) {
        toast.showToast('⚠️ No tienes suscripciones activas. Activa las notificaciones primero.', 'warning')
      } else if (!data.configured) {
        toast.showToast('⚠️ Las claves VAPID no están configuradas en el servidor.', 'warning')
      } else {
        toast.showToast('⚠️ No se pudo enviar la notificación. Revisa los detalles.', 'warning')
      }
    } catch (error: any) {
      console.error('[NotificationTest] Error:', error)
      toast.showToast(error.message || 'Error al probar notificaciones', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 shadow-lg">
      <h3 className="text-xl font-bold text-white mb-4">🧪 Probar Notificaciones</h3>
      <p className="text-white/80 text-sm mb-4">
        Envía una notificación de prueba para verificar que todo funciona correctamente.
      </p>
      
      <button
        onClick={handleTest}
        disabled={loading}
        className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white px-6 py-3 rounded-lg transition-all duration-300 font-semibold disabled:opacity-50 disabled:cursor-not-allowed mb-4"
      >
        {loading ? 'Probando...' : 'Enviar Notificación de Prueba'}
      </button>

      {diagnostics && (
        <div className="mt-4 p-4 bg-black/20 rounded-lg border border-white/10">
          <h4 className="text-white font-semibold mb-2">Diagnóstico:</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-white/70">VAPID Configurado:</span>
              <span className={diagnostics.configured ? 'text-green-400' : 'text-red-400'}>
                {diagnostics.configured ? '✅ Sí' : '❌ No'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/70">Suscripciones:</span>
              <span className={diagnostics.subscriptionCount > 0 ? 'text-green-400' : 'text-red-400'}>
                {diagnostics.subscriptionCount}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/70">Clave Pública VAPID:</span>
              <span className={diagnostics.vapidPublicKey === 'Configurada' ? 'text-green-400' : 'text-red-400'}>
                {diagnostics.vapidPublicKey}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/70">Clave Privada VAPID:</span>
              <span className={diagnostics.vapidPrivateKey === 'Configurada' ? 'text-green-400' : 'text-red-400'}>
                {diagnostics.vapidPrivateKey}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/70">App URL:</span>
              <span className="text-white/90">{diagnostics.appUrl}</span>
            </div>
            {diagnostics.testResult && (
              <div className="mt-2 pt-2 border-t border-white/10">
                <div className="flex justify-between">
                  <span className="text-white/70">Enviadas:</span>
                  <span className="text-green-400">{diagnostics.testResult.sent || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70">Fallidas:</span>
                  <span className="text-red-400">{diagnostics.testResult.failed || 0}</span>
                </div>
              </div>
            )}
            {diagnostics.subscriptions && diagnostics.subscriptions.length > 0 && (
              <div className="mt-2 pt-2 border-t border-white/10">
                <p className="text-white/70 text-xs mb-1">Endpoints:</p>
                {diagnostics.subscriptions.map((sub: any, idx: number) => (
                  <div key={idx} className="text-xs text-white/60 font-mono">
                    {sub.endpoint}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

