'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      console.log('Intentando iniciar sesión con:', email)
      
      // Intentar login directo con Supabase
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      })

      if (loginError) {
        console.error('Error de autenticación:', loginError)
        
        // Mensajes de error más amigables
        if (loginError.message.includes('Invalid login credentials')) {
          throw new Error('Email o contraseña incorrectos. Por favor, verifica tus credenciales.')
        } else if (loginError.message.includes('Email not confirmed')) {
          throw new Error('Por favor, confirma tu email antes de iniciar sesión.')
        } else {
          throw new Error(loginError.message || 'Error al iniciar sesión')
        }
      }

      if (!data.user || !data.session) {
        throw new Error('No se recibió información completa del usuario')
      }

      console.log('Login exitoso, usuario:', data.user?.id)
      console.log('Session data:', data.session)

      // Verificar que tenemos la sesión
      if (!data.session) {
        throw new Error('No se recibió la sesión del servidor')
      }

      console.log('Esperando establecimiento de cookies (2 segundos)...')
      
      // Esperar más tiempo para que las cookies se establezcan
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Verificar cookies antes de redirigir
      const cookies = document.cookie
      console.log('=== COOKIES ANTES DE REDIRIGIR ===')
      console.log('Total de cookies:', cookies.length)
      console.log('Cookies completas:', cookies)
      console.log('¿Tiene cookies de Supabase?', cookies.includes('sb-') || cookies.includes('supabase'))
      
      // Verificar sesión una vez más
      const { data: { session: checkSession } } = await supabase.auth.getSession()
      console.log('Sesión al verificar:', checkSession ? 'Presente ✅' : 'Ausente ❌')
      
      if (!checkSession) {
        console.error('⚠️ ADVERTENCIA: No hay sesión al verificar')
        console.error('Esto puede causar que el middleware redirija de vuelta al login')
      }
      
      console.log('Redirigiendo a /dashboard en 1 segundo más...')
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Redirigir
      window.location.href = '/dashboard'
      
    } catch (error: any) {
      console.error('Error completo en login:', error)
      setError(error.message || 'Error al iniciar sesión')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-6">
          🌍 Iniciar Sesión
        </h1>
        
        <form onSubmit={handleLogin} className="space-y-4">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="tu@email.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-600">
          ¿No tienes cuenta?{' '}
          <Link href="/register" className="text-blue-600 hover:underline">
            Regístrate aquí
          </Link>
        </p>
      </div>
    </div>
  )
}
