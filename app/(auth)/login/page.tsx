'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    setMounted(true)
  }, [])

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 overflow-hidden relative">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-1/2 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
        <div className={`w-full max-w-md transform transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          {/* Logo and Title */}
          <div className="text-center mb-8">
            <div className="inline-block mb-4">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full blur-2xl opacity-50 animate-pulse"></div>
              <div className="relative text-6xl animate-bounce-slow">
                🌍
              </div>
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold mb-2">
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                Iniciar Sesión
              </span>
            </h1>
            <p className="text-gray-600">Bienvenido de vuelta a Turista Mundial</p>
          </div>

          {/* Form Card */}
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/20">
            <form onSubmit={handleLogin} className="space-y-6">
              {error && (
                <div className={`bg-red-50 border-l-4 border-red-400 text-red-700 px-4 py-3 rounded-lg transform transition-all duration-300 ${error ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
                  <p className="font-semibold">Error</p>
                  <p className="text-sm">{error}</p>
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-300 bg-white/50 backdrop-blur-sm"
                  placeholder="tu@email.com"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                  Contraseña
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-300 bg-white/50 backdrop-blur-sm"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="group relative w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-3 px-6 rounded-xl font-bold shadow-lg hover:shadow-blue-500/50 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all duration-300 overflow-hidden"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Iniciando sesión...</span>
                    </>
                  ) : (
                    <>
                      <span>Iniciar Sesión</span>
                      <span className="group-hover:translate-x-1 transition-transform">→</span>
                    </>
                  )}
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-blue-700 to-cyan-700 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                ¿No tienes cuenta?{' '}
                <Link 
                  href="/register" 
                  className="font-semibold text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                >
                  Regístrate aquí
                </Link>
              </p>
            </div>

            <div className="mt-6 text-center">
              <Link 
                href="/" 
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors inline-flex items-center gap-1"
              >
                <span>←</span>
                <span>Volver al inicio</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
