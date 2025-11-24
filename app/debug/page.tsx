'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function DebugPage() {
  const [mounted, setMounted] = useState(false)
  const [envCheck, setEnvCheck] = useState({
    hasUrl: false,
    hasKey: false,
    url: '',
  })
  const [user, setUser] = useState<any>(null)
  const [session, setSession] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    // Verificar variables de entorno
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    setEnvCheck({
      hasUrl: !!url,
      hasKey: !!key,
      url: url || 'No configurada',
    })

    // Verificar usuario y sesión
    const checkAuth = async () => {
      try {
        const supabase = createClient()
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (userError) setError(userError.message)
        if (sessionError) setError(sessionError.message)

        setUser(user)
        setSession(session)
      } catch (err: any) {
        setError(err.message)
      }
    }

    checkAuth()
  }, [mounted])

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-100 p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">🔍 Debug - Configuración</h1>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Variables de Entorno</h2>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className={envCheck.hasUrl ? 'text-green-600' : 'text-red-600'}>
                {envCheck.hasUrl ? '✅' : '❌'}
              </span>
              <span>NEXT_PUBLIC_SUPABASE_URL: {envCheck.url}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={envCheck.hasKey ? 'text-green-600' : 'text-red-600'}>
                {envCheck.hasKey ? '✅' : '❌'}
              </span>
              <span>NEXT_PUBLIC_SUPABASE_ANON_KEY: {envCheck.hasKey ? 'Configurada' : 'No configurada'}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Estado de Autenticación</h2>
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              Error: {error}
            </div>
          )}
          <div className="space-y-2">
            <div>
              <strong>Usuario:</strong> {user ? '✅ Autenticado' : '❌ No autenticado'}
            </div>
            {user && (
              <div className="ml-4 text-sm text-gray-600">
                <div>ID: {user.id}</div>
                <div>Email: {user.email}</div>
              </div>
            )}
            <div>
              <strong>Sesión:</strong> {session ? '✅ Activa' : '❌ No activa'}
            </div>
            {session && (
              <div className="ml-4 text-sm text-gray-600">
                <div>Access Token: {session.access_token ? 'Presente' : 'Ausente'}</div>
                <div>Expires At: {new Date(session.expires_at * 1000).toLocaleString()}</div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-bold mb-2">💡 Solución de Problemas</h3>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>Si las variables de entorno están en rojo, crea un archivo <code>.env.local</code> en la raíz del proyecto</li>
            <li>Si el usuario no está autenticado, intenta iniciar sesión nuevamente</li>
            <li>Si hay errores, revisa la consola del navegador para más detalles</li>
            <li>Asegúrate de que las migraciones de Supabase se hayan ejecutado correctamente</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

