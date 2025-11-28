import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Obtener el usuario - esto refresca la sesión automáticamente si es necesario
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  
  // Log para debugging (solo en desarrollo)
  if (process.env.NODE_ENV === 'development') {
    if (userError && (request.nextUrl.pathname.startsWith('/dashboard') || 
                      request.nextUrl.pathname.startsWith('/lobby') ||
                      request.nextUrl.pathname.startsWith('/game'))) {
      console.log('[Middleware] Error obteniendo usuario:', userError.message)
      console.log('[Middleware] Cookies recibidas:', request.cookies.getAll().map(c => c.name).join(', '))
    }
    if (user) {
      console.log('[Middleware] Usuario encontrado:', user.id)
    }
  }

  // Protect dashboard, game, and profile routes
  if (request.nextUrl.pathname.startsWith('/dashboard') || 
      request.nextUrl.pathname.startsWith('/lobby') ||
      request.nextUrl.pathname.startsWith('/game') ||
      request.nextUrl.pathname.startsWith('/profile')) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    // Asegurar que el perfil existe antes de permitir acceso
    // Esto previene errores cuando el usuario accede antes de que se cree el perfil
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle()

      if (!profile && !profileError) {
        // Perfil no existe, intentar crearlo usando la función SQL
        console.log('[Middleware] Perfil no existe para usuario', user.id, '- Intentando crear...')
        
        const { error: createError } = await supabase.rpc('ensure_user_profile_safe', {
          p_user_id: user.id
        })

        if (createError) {
          console.error('[Middleware] Error creando perfil:', createError)
          // No bloquear el acceso, pero loguear el error
          // El fallback en las páginas individuales lo manejará
        } else {
          console.log('[Middleware] Perfil creado exitosamente para usuario', user.id)
        }
      }
    } catch (error) {
      // No bloquear el acceso si hay error, solo loguear
      console.error('[Middleware] Error verificando/creando perfil:', error)
    }
  }

  // Redirect authenticated users away from auth pages
  if ((request.nextUrl.pathname === '/login' || 
       request.nextUrl.pathname === '/register') && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

