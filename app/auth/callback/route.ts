import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const referralCode = requestUrl.searchParams.get('ref')
  const next = requestUrl.searchParams.get('next') || '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code)
    
    // Si hay referral_code y el usuario se autenticó exitosamente, procesarlo
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
  }

  // Redirigir al dashboard
  return NextResponse.redirect(new URL(next, requestUrl.origin))
}

