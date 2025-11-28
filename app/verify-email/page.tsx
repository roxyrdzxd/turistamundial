'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'

export default function VerifyEmailPage() {
  const [email, setEmail] = useState('')
  const [resending, setResending] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)
  const [mounted, setMounted] = useState(false)
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    setMounted(true)
    
    // Obtener email de los parámetros de la URL o del usuario actual
    const emailParam = searchParams.get('email')
    if (emailParam) {
      setEmail(emailParam)
    } else {
      // Intentar obtener email del usuario actual si está logueado
      const getUserEmail = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          setEmail(user.email || '')
        }
      }
      getUserEmail()
    }
  }, [searchParams])

  const handleResendEmail = async () => {
    if (!email) return
    
    setResending(true)
    setResendSuccess(false)
    
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        throw error
      }

      setResendSuccess(true)
      setTimeout(() => setResendSuccess(false), 5000)
    } catch (error: any) {
      console.error('Error reenviando email:', error)
      alert('Error al reenviar el correo. Por favor intenta más tarde.')
    } finally {
      setResending(false)
    }
  }

  const handleCheckStatus = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      // Verificar si el email está confirmado
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email_confirmed_at) {
        router.push('/dashboard')
      } else {
        alert('Tu email aún no ha sido confirmado. Por favor revisa tu correo y haz clic en el enlace de confirmación.')
      }
    } else {
      router.push('/login')
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
          {/* Logo */}
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
            <h1 className="text-3xl sm:text-4xl font-extrabold mb-2 text-white">
              Verifica tu Email
            </h1>
            <p className="text-white/80 mb-1">Turix - TURISTA MUNDIAL</p>
          </div>

          {/* Form Card */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-8 border border-white/20">
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border-2 border-cyan-400/30 rounded-lg p-4">
                <div className="text-center mb-3">
                  <span className="text-4xl">📧</span>
                </div>
                <p className="text-white text-center font-semibold mb-2">
                  Revisa tu correo electrónico
                </p>
                <p className="text-white/90 text-sm text-center">
                  Hemos enviado un enlace de confirmación a{' '}
                  <strong className="text-cyan-300">{email || 'tu correo'}</strong>. 
                  Haz clic en el enlace para activar tu cuenta.
                </p>
              </div>

              {email && (
                <div className="space-y-3">
                  <button
                    onClick={handleResendEmail}
                    disabled={resending}
                    className="w-full bg-white/10 backdrop-blur-sm border-2 border-white/20 text-white py-3 px-6 rounded-xl font-semibold hover:border-white/30 hover:bg-white/15 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {resending ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        <span>Reenviando...</span>
                      </span>
                    ) : (
                      '📬 Reenviar correo de confirmación'
                    )}
                  </button>

                  {resendSuccess && (
                    <div className="bg-green-500/20 border-2 border-green-400/30 rounded-lg p-3">
                      <p className="text-green-300 text-sm text-center font-semibold">
                        ✅ Correo reenviado exitosamente
                      </p>
                    </div>
                  )}

                  <button
                    onClick={handleCheckStatus}
                    className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white py-3 px-6 rounded-xl font-bold shadow-lg hover:shadow-cyan-500/50 transform hover:scale-105 transition-all"
                  >
                    ✅ Ya confirmé mi email
                  </button>
                </div>
              )}

              <div className="pt-4 border-t border-white/20">
                <p className="text-white/70 text-sm text-center mb-3">
                  ¿No recibiste el correo? Revisa tu carpeta de spam o intenta reenviarlo.
                </p>
                <Link
                  href="/login"
                  className="block text-center text-white/80 hover:text-white transition-colors text-sm font-semibold"
                >
                  Volver al inicio de sesión
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

