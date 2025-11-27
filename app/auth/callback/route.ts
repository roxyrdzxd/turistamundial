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
      // Verificar si el usuario es nuevo (creado en los últimos 2 minutos)
      // Esto es necesario porque OAuth puede crear usuarios nuevos o autenticar existentes
      const userCreatedAt = new Date(session.user.created_at)
      const now = new Date()
      const timeDiff = now.getTime() - userCreatedAt.getTime()
      const isNewUser = timeDiff < 120000 // Menos de 2 minutos
      
      if (isNewUser) {
        // Procesar el referido en segundo plano (no bloquear el flujo)
        // Usar la función RPC directamente desde el servidor
        try {
          const { error: referralError } = await supabase.rpc('process_referral', {
            p_referred_user_id: session.user.id,
            p_referral_code: referralCode
          })
          
          if (referralError) {
            console.error('[AuthCallback] Error procesando referido:', referralError)
            // No fallar el flujo si hay error en el referido
          } else {
            console.log('[AuthCallback] Referido procesado exitosamente para usuario:', session.user.id)
          }
        } catch (error) {
          console.error('[AuthCallback] Excepción al procesar referido:', error)
          // No fallar el flujo si hay error en el referido
        }
      } else {
        console.log('[AuthCallback] Usuario no es nuevo, no se procesa referido')
      }
    }
  }

  // Redirigir al dashboard
  return NextResponse.redirect(new URL(next, requestUrl.origin))
}

