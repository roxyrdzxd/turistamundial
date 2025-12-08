'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    let processed = false
    
    // Función helper para leer parámetros
    const getParams = () => {
      // Leer parámetros del hash (fragment) si existen
      const hash = window.location.hash.substring(1) // Remover el #
      const hashParams = new URLSearchParams(hash)
      
      // Leer parámetros de query también
      const code = searchParams.get('code') || hashParams.get('code')
      const type = searchParams.get('type') || hashParams.get('type')
      const error = searchParams.get('error') || hashParams.get('error')
      const errorDescription = searchParams.get('error_description') || hashParams.get('error_description')
      const errorCode = searchParams.get('error_code') || hashParams.get('error_code')
      const referralCode = searchParams.get('ref') || hashParams.get('ref')
      
      return { code, type, error, errorDescription, errorCode, referralCode, hash, hashParams }
    }
    
    const processCallback = async () => {
      if (processed) {
        console.log('[AuthCallbackPage] Ya se procesó el callback, ignorando...')
        return
      }
      
      // Intentar leer parámetros inmediatamente
      let params = getParams()
      
      // Si no hay código ni error, esperar un poco y reintentar (por si viene en el hash después de una redirección)
      if (!params.code && !params.error && !params.errorCode) {
        console.log('[AuthCallbackPage] No se encontraron parámetros inicialmente, esperando...')
        await new Promise(resolve => setTimeout(resolve, 500))
        params = getParams()
      }
      
      const { code, type, error, errorDescription, errorCode, referralCode, hash, hashParams } = params
      
      // Logging detallado para debugging
      console.log('[AuthCallbackPage] ===== INICIO CALLBACK =====')
      console.log('[AuthCallbackPage] URL completa:', window.location.href)
      console.log('[AuthCallbackPage] Hash completo:', hash || '(vacío)')
      console.log('[AuthCallbackPage] Query string:', window.location.search || '(vacío)')
      console.log('[AuthCallbackPage] Parámetros encontrados:', {
        code: code ? code.substring(0, 30) + '...' : null,
        type,
        error,
        errorCode,
        errorDescription,
        referralCode,
        hasHash: !!hash,
        hasQuery: !!window.location.search
      })
      console.log('[AuthCallbackPage] Hash params individuales:', {
        code: hashParams.get('code') ? hashParams.get('code')?.substring(0, 30) + '...' : null,
        type: hashParams.get('type'),
        error: hashParams.get('error'),
        errorCode: hashParams.get('error_code'),
        errorDescription: hashParams.get('error_description')
      })
      
      // Si hay error en el hash o query params, redirigir al login con el error
      if (error || errorCode) {
        console.error('[AuthCallbackPage] Error detectado:', { error, errorCode, errorDescription })
        
        const loginUrl = new URL('/login', window.location.origin)
        
        if (error === 'server_error' || error === 'unexpected_failure' || errorCode === 'unexpected_failure') {
          loginUrl.searchParams.set('error', 'confirmation_failed')
          loginUrl.searchParams.set('message', 'Error al confirmar tu cuenta. El enlace puede haber expirado o ya haber sido usado. Por favor, solicita un nuevo correo de confirmación.')
        } else if (error) {
          loginUrl.searchParams.set('error', error)
          if (errorDescription) {
            loginUrl.searchParams.set('message', decodeURIComponent(errorDescription))
          }
        } else {
          loginUrl.searchParams.set('error', 'confirmation_failed')
          loginUrl.searchParams.set('message', 'Error al confirmar tu cuenta. Por favor, solicita un nuevo correo de confirmación.')
        }
        
        router.replace(loginUrl.toString())
        return
      }
      
      // Si hay código, procesarlo del lado del cliente
      if (code) {
        try {
          console.log('[AuthCallbackPage] Intercambiando código por sesión...')
          
          const { data: { session }, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
          
          if (exchangeError) {
            console.error('[AuthCallbackPage] Error intercambiando código:', exchangeError)
            
            const loginUrl = new URL('/login', window.location.origin)
            
            if (exchangeError.message.includes('expired') || exchangeError.message.includes('invalid') || exchangeError.message.includes('already been used')) {
              loginUrl.searchParams.set('error', 'expired_token')
              loginUrl.searchParams.set('message', 'El enlace de confirmación ha expirado o ya ha sido usado. Por favor, solicita un nuevo correo de confirmación.')
            } else {
              loginUrl.searchParams.set('error', 'confirmation_failed')
              loginUrl.searchParams.set('message', `Error al confirmar tu cuenta: ${exchangeError.message}`)
            }
            
            router.replace(loginUrl.toString())
            return
          }
          
          if (!session || !session.user) {
            console.error('[AuthCallbackPage] No se recibió sesión después del intercambio')
            const loginUrl = new URL('/login', window.location.origin)
            loginUrl.searchParams.set('error', 'no_session')
            loginUrl.searchParams.set('message', 'No se pudo crear la sesión. Por favor, intenta iniciar sesión nuevamente.')
            router.replace(loginUrl.toString())
            return
          }
          
          console.log('[AuthCallbackPage] Sesión creada exitosamente para usuario:', session.user.id)
          
          // Si es confirmación de registro, esperar un momento para que el perfil se cree
          if (type === 'signup') {
            await new Promise(resolve => setTimeout(resolve, 1500))
          }
          
          // Redirigir al dashboard
          const dashboardUrl = new URL('/dashboard', window.location.origin)
          if (type === 'signup') {
            dashboardUrl.searchParams.set('verified', 'true')
          }
          
          router.replace(dashboardUrl.toString())
        } catch (error: any) {
          console.error('[AuthCallbackPage] Excepción:', error)
          const loginUrl = new URL('/login', window.location.origin)
          loginUrl.searchParams.set('error', 'unexpected_error')
          loginUrl.searchParams.set('message', 'Ocurrió un error inesperado. Por favor, intenta nuevamente.')
          router.replace(loginUrl.toString())
        }
        return
      }
      
      // Si no hay código ni error, puede ser una redirección sin parámetros
      console.warn('[AuthCallbackPage] No se encontró código ni error en la URL')
      
      // Verificar si el usuario ya está autenticado
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email_confirmed_at) {
        router.replace('/dashboard')
        return
      }
      
      const loginUrl = new URL('/login', window.location.origin)
      loginUrl.searchParams.set('error', 'missing_code')
      loginUrl.searchParams.set('message', 'No se recibió el código de confirmación. Por favor, solicita un nuevo correo de confirmación.')
      router.replace(loginUrl.toString())
      processed = true
    }
    
    // Procesar inmediatamente
    processCallback()
    
    // También escuchar cambios en el hash (por si Supabase actualiza el hash después)
    const handleHashChange = () => {
      console.log('[AuthCallbackPage] Hash cambió, reprocesando...')
      if (!processed) {
        processCallback()
      }
    }
    
    window.addEventListener('hashchange', handleHashChange)
    
    // Cleanup
    return () => {
      window.removeEventListener('hashchange', handleHashChange)
    }
  }, [router, searchParams, supabase])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
        <p className="text-white">Procesando confirmación...</p>
      </div>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Cargando...</p>
        </div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  )
}

