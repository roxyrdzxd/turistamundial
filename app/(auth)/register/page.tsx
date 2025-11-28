'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { validateUsername } from '@/lib/utils/contentFilter'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    setMounted(true)
    
    // Detectar código de referencia desde la URL
    const urlParams = new URLSearchParams(window.location.search)
    const refCode = urlParams.get('ref')
    if (refCode) {
      // Guardar en localStorage para usarlo después del registro
      localStorage.setItem('referral_code', refCode)
    }
  }, [])

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Validar username si se proporciona
      if (username && username.trim().length > 0) {
        const validation = validateUsername(username.trim())
        if (!validation.valid) {
          setError(validation.error || 'Nombre de usuario inválido')
          setLoading(false)
          return
        }
      }

      // Obtener código de referencia si existe
      const referralCode = localStorage.getItem('referral_code')

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username || `Usuario${Math.random().toString(36).substr(2, 8)}`,
            referral_code: referralCode || null, // Pasar código si existe
          },
        },
      })
      
      // Limpiar código de referencia después del registro
      if (referralCode) {
        localStorage.removeItem('referral_code')
      }

      if (error) {
        throw error
      }

      if (data.user) {
        // Esperar un momento para que las cookies se establezcan
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // Forzar recarga de la página para asegurar que el middleware detecte la sesión
        window.location.href = '/dashboard'
      }
    } catch (error: any) {
      console.error('Error en registro:', error)
      
      // Mensajes de error más descriptivos
      let errorMessage = 'Error al registrarse'
      
      if (error.message) {
        if (error.message.includes('User already registered')) {
          errorMessage = 'Este email ya está registrado. Intenta iniciar sesión.'
        } else if (error.message.includes('Email rate limit')) {
          errorMessage = 'Demasiados intentos. Por favor espera unos minutos.'
        } else if (error.message.includes('Password')) {
          errorMessage = 'La contraseña no cumple con los requisitos.'
        } else if (error.message.includes('Database error') || error.message.includes('saving new user')) {
          errorMessage = 'Error al crear tu cuenta. Por favor intenta de nuevo. Si el problema persiste, contacta al soporte.'
        } else {
          errorMessage = error.message
        }
      }
      
      setError(errorMessage)
      setLoading(false)
    }
  }

  const handleGoogleRegister = async () => {
    setLoading(true)
    setError(null)

    try {
      // Obtener código de referencia si existe
      const referralCode = localStorage.getItem('referral_code')
      
      // Pasar el referral_code en la URL del callback si existe
      const callbackUrl = referralCode 
        ? `${window.location.origin}/auth/callback?ref=${encodeURIComponent(referralCode)}`
        : `${window.location.origin}/auth/callback`

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: callbackUrl,
        },
      })

      if (error) {
        throw error
      }
    } catch (error: any) {
      console.error('Error en registro con Google:', error)
      setError(error.message || 'Error al registrarse con Google')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 overflow-hidden relative">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-cyan-500/20 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-pink-500/20 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-1/2 w-72 h-72 bg-purple-500/20 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
        <div className={`w-full max-w-md transform transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          {/* Logo and Title */}
          <div className="text-center mb-8">
            <div className="inline-block mb-4 relative">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-blue-400 to-pink-400 rounded-full blur-3xl opacity-50 animate-pulse"></div>
              <div className="relative w-24 h-24 sm:w-28 sm:h-28 mx-auto drop-shadow-2xl">
                <Image
                  src="https://cgoisveithzvituzyoga.supabase.co/storage/v1/object/public/avatars/turix.png"
                  alt="Turix Logo"
                  width={112}
                  height={112}
                  className="w-full h-full object-contain animate-pulse-slow"
                  priority
                />
              </div>
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold mb-2 text-white">
              Crear Cuenta
            </h1>
            <p className="text-white/80 mb-1">Únete a</p>
            <p className="text-lg sm:text-xl text-white/90 font-semibold uppercase tracking-wider">
              Turix - TURISTA MUNDIAL
            </p>
          </div>

          {/* Form Card */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-8 border border-white/20">
            <form onSubmit={handleRegister} className="space-y-6">
              {error && (
                <div className={`bg-red-500/20 border-l-4 border-red-400 text-red-200 px-4 py-3 rounded-lg transform transition-all duration-300 ${error ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
                  <p className="font-semibold">Error</p>
                  <p className="text-sm">{error}</p>
                </div>
              )}

              <div>
                <label htmlFor="username" className="block text-sm font-semibold text-white mb-2">
                  Nombre de usuario
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-white/20 rounded-xl focus:outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-400/30 transition-all duration-300 bg-white/10 backdrop-blur-sm text-white placeholder:text-white/50"
                  placeholder="Tu nombre de usuario"
                />
                <p className="mt-1 text-xs text-white/60">Opcional. Si no lo ingresas, se generará uno automáticamente.</p>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-white mb-2">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 border-2 border-white/20 rounded-xl focus:outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-400/30 transition-all duration-300 bg-white/10 backdrop-blur-sm text-white placeholder:text-white/50"
                  placeholder="tu@email.com"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-white mb-2">
                  Contraseña
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-4 py-3 border-2 border-white/20 rounded-xl focus:outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-400/30 transition-all duration-300 bg-white/10 backdrop-blur-sm text-white placeholder:text-white/50"
                  placeholder="Mínimo 6 caracteres"
                />
                <p className="mt-1 text-xs text-white/60">La contraseña debe tener al menos 6 caracteres.</p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="group relative w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white py-3 px-6 rounded-xl font-bold shadow-lg hover:shadow-pink-500/50 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all duration-300 overflow-hidden"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Creando cuenta...</span>
                    </>
                  ) : (
                    <>
                      <span>Crear Cuenta</span>
                      <span className="group-hover:translate-x-1 transition-transform">→</span>
                    </>
                  )}
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-pink-600 to-purple-700 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/20"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white/10 text-white/70">O continúa con</span>
              </div>
            </div>

            {/* Google Register Button */}
            <button
              onClick={handleGoogleRegister}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-white/10 backdrop-blur-sm border-2 border-white/20 text-white py-3 px-6 rounded-xl font-semibold shadow-md hover:shadow-lg hover:border-white/30 hover:bg-white/15 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all duration-300"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span>Continuar con Google</span>
            </button>

            <div className="mt-6 text-center">
              <p className="text-sm text-white/80">
                ¿Ya tienes cuenta?{' '}
                <Link 
                  href="/login" 
                  className="font-semibold text-pink-400 hover:text-pink-300 hover:underline transition-colors"
                >
                  Inicia sesión aquí
                </Link>
              </p>
            </div>

            <div className="mt-6 text-center">
              <Link 
                href="/" 
                className="text-sm text-white/60 hover:text-white/80 transition-colors inline-flex items-center gap-1"
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
