import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const referralCode = requestUrl.searchParams.get('ref')
  const type = requestUrl.searchParams.get('type') // 'signup' o 'recovery'
  const next = requestUrl.searchParams.get('next') || '/dashboard'

  // Manejar errores que vienen en los query params (algunos casos)
  const errorParam = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')
  
  if (errorParam) {
    console.error('[AuthCallback] Error recibido en URL:', {
      error: errorParam,
      description: errorDescription,
      fullUrl: requestUrl.toString()
    })
    
    const url = new URL('/login', requestUrl.origin)
    
    if (errorParam === 'server_error' || errorParam === 'unexpected_failure') {
      url.searchParams.set('error', 'confirmation_failed')
      url.searchParams.set('message', 'Error al confirmar tu cuenta. El enlace puede haber expirado o ya haber sido usado. Por favor, solicita un nuevo correo de confirmación.')
    } else {
      url.searchParams.set('error', errorParam)
      if (errorDescription) {
        url.searchParams.set('message', decodeURIComponent(errorDescription))
      }
    }
    
    return NextResponse.redirect(url)
  }

  if (!code) {
    // Si no hay código, puede ser una redirección directa sin parámetros
    // o un error que no se capturó arriba
    console.warn('[AuthCallback] No se recibió código en la URL:', requestUrl.toString())
    
    // Verificar si hay un usuario autenticado (puede ser que ya esté confirmado)
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user?.email_confirmed_at) {
        // Usuario ya confirmado, redirigir al dashboard
        return NextResponse.redirect(new URL('/dashboard', requestUrl.origin))
      }
    } catch (error) {
      console.error('[AuthCallback] Error verificando usuario:', error)
    }
    
    // Si no hay código y no hay usuario, redirigir al login
    const url = new URL('/login', requestUrl.origin)
    url.searchParams.set('error', 'missing_code')
    url.searchParams.set('message', 'No se recibió el código de confirmación. Por favor, solicita un nuevo correo de confirmación.')
    return NextResponse.redirect(url)
  }

  // Procesar el código de confirmación
  try {
    const supabase = await createClient()
    console.log('[AuthCallback] Intercambiando código por sesión...', { type, hasReferralCode: !!referralCode })
    
    const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      console.error('[AuthCallback] Error intercambiando código:', {
        error: error.message,
        status: error.status,
        name: error.name,
        code: code.substring(0, 20) + '...'
      })
      
      // Si hay error, redirigir al login con mensaje
      const url = new URL('/login', requestUrl.origin)
      
      if (error.message.includes('expired') || error.message.includes('invalid') || error.message.includes('already been used')) {
        url.searchParams.set('error', 'expired_token')
        url.searchParams.set('message', 'El enlace de confirmación ha expirado o ya ha sido usado. Por favor, solicita un nuevo correo de confirmación desde la página de login.')
      } else if (error.message.includes('email')) {
        url.searchParams.set('error', 'email_error')
        url.searchParams.set('message', 'Error relacionado con el correo electrónico. Por favor, verifica tu correo e intenta nuevamente.')
      } else {
        url.searchParams.set('error', 'confirmation_failed')
        url.searchParams.set('message', `Error al confirmar tu cuenta: ${error.message}`)
      }
      
      return NextResponse.redirect(url)
    }

    if (!session || !session.user) {
      console.error('[AuthCallback] No se recibió sesión después del intercambio')
      const url = new URL('/login', requestUrl.origin)
      url.searchParams.set('error', 'no_session')
      url.searchParams.set('message', 'No se pudo crear la sesión. Por favor, intenta iniciar sesión nuevamente.')
      return NextResponse.redirect(url)
    }

    console.log('[AuthCallback] Sesión creada exitosamente para usuario:', session.user.id)

    // Si es confirmación de registro (type === 'signup')
    if (type === 'signup' && session?.user) {
      console.log('[AuthCallback] Procesando registro nuevo usuario...')
      
      // Esperar un momento para asegurar que el perfil se haya creado por el trigger
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Verificar que el perfil existe
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, username')
        .eq('id', session.user.id)
        .single()
      
      if (!profile && !profileError) {
        // Perfil no existe, intentar crearlo
        console.warn('[AuthCallback] Perfil no encontrado, intentando crear...')
        const { error: createError } = await supabase.rpc('ensure_user_profile_safe', {
          p_user_id: session.user.id
        })
        
        if (createError) {
          console.error('[AuthCallback] Error creando perfil:', createError)
        } else {
          console.log('[AuthCallback] Perfil creado exitosamente')
        }
      } else if (profile) {
        console.log('[AuthCallback] Perfil encontrado:', profile.username)
      }
      
      // Procesar referidos si existe código
      if (referralCode) {
        console.log('[AuthCallback] Procesando código de referido:', referralCode)
        
        // Verificar que el perfil existe antes de procesar el referido
        const { data: profileCheck } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', session.user.id)
          .single()
        
        if (profileCheck) {
          // Verificar si el usuario ya tiene un referido
          const { data: existingReferral } = await supabase
            .from('referrals')
            .select('id')
            .eq('referred_id', session.user.id)
            .maybeSingle()
          
          // Solo procesar si no tiene referido previo
          if (!existingReferral) {
            try {
              const { data: referralResult, error: referralError } = await supabase.rpc('process_referral', {
                p_referred_user_id: session.user.id,
                p_referral_code: referralCode
              })
              
              if (referralError) {
                console.error('[AuthCallback] Error procesando referido:', referralError)
              } else if (referralResult && referralResult.success === false) {
                console.error('[AuthCallback] Error en process_referral:', referralResult.error)
              } else {
                console.log('[AuthCallback] Referido procesado exitosamente')
              }
            } catch (error) {
              console.error('[AuthCallback] Excepción al procesar referido:', error)
            }
          } else {
            console.log('[AuthCallback] Usuario ya tiene un referido, no se procesa')
          }
        } else {
          console.warn('[AuthCallback] Perfil no encontrado, no se puede procesar referido')
        }
      }
      
      // Redirigir al dashboard con mensaje de bienvenida
      const url = new URL('/dashboard', requestUrl.origin)
      url.searchParams.set('verified', 'true')
      console.log('[AuthCallback] Redirigiendo al dashboard')
      return NextResponse.redirect(url)
    }
    
    // Si hay referral_code y el usuario se autenticó exitosamente (OAuth), procesarlo
    if (referralCode && session?.user && !error) {
      // Esperar un momento para asegurar que el perfil se haya creado
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Verificar si el usuario es nuevo (creado en los últimos 5 minutos)
      // Esto es necesario porque OAuth puede crear usuarios nuevos o autenticar existentes
      const userCreatedAt = new Date(session.user.created_at)
      const now = new Date()
      const timeDiff = now.getTime() - userCreatedAt.getTime()
      const isNewUser = timeDiff < 300000 // Menos de 5 minutos
      
      if (isNewUser) {
        // Verificar que el perfil existe antes de procesar el referido
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', session.user.id)
          .single()
        
        if (profile && !profileError) {
          // Verificar si el usuario ya tiene un referido
          const { data: existingReferral, error: referralCheckError } = await supabase
            .from('referrals')
            .select('id')
            .eq('referred_id', session.user.id)
            .maybeSingle()
          
          // Solo procesar si no tiene referido previo
          if (!existingReferral && !referralCheckError) {
            // Procesar el referido en segundo plano (no bloquear el flujo)
            try {
              const { data: referralResult, error: referralError } = await supabase.rpc('process_referral', {
                p_referred_user_id: session.user.id,
                p_referral_code: referralCode
              })
              
              if (referralError) {
                console.error('[AuthCallback] Error procesando referido:', referralError)
              } else if (referralResult && referralResult.success === false) {
                console.error('[AuthCallback] Error en process_referral:', referralResult.error)
              } else {
                console.log('[AuthCallback] Referido procesado exitosamente para usuario:', session.user.id)
              }
            } catch (error) {
              console.error('[AuthCallback] Excepción al procesar referido:', error)
            }
          } else {
            console.log('[AuthCallback] Usuario ya tiene un referido, no se procesa')
          }
        } else {
          console.error('[AuthCallback] Perfil no encontrado para usuario:', session.user.id)
        }
      } else {
        console.log('[AuthCallback] Usuario no es nuevo (creado hace más de 5 minutos), no se procesa referido')
      }
    }
  } catch (error: any) {
    console.error('[AuthCallback] Excepción no manejada:', error)
    const url = new URL('/login', requestUrl.origin)
    url.searchParams.set('error', 'unexpected_error')
    url.searchParams.set('message', 'Ocurrió un error inesperado. Por favor, intenta nuevamente.')
    return NextResponse.redirect(url)
  }

  // Redirigir al dashboard
  return NextResponse.redirect(new URL(next, requestUrl.origin))
}

