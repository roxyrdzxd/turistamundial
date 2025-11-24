import { createBrowserClient } from '@supabase/ssr'

let clientInstance: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  // Reutilizar la instancia si ya existe
  if (clientInstance) {
    return clientInstance
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
  }

  // createBrowserClient con configuración explícita de cookies
  clientInstance = createBrowserClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return document.cookie.split('; ').map(cookie => {
          const [name, ...rest] = cookie.split('=')
          return { 
            name: name.trim(), 
            value: rest.join('=') 
          }
        }).filter(c => c.name && c.value)
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          let cookieString = `${name}=${value}`
          
          if (options?.maxAge) {
            cookieString += `; max-age=${options.maxAge}`
          }
          if (options?.domain) {
            cookieString += `; domain=${options.domain}`
          }
          if (options?.path) {
            cookieString += `; path=${options.path}`
          } else {
            cookieString += `; path=/`
          }
          if (options?.sameSite) {
            cookieString += `; samesite=${options.sameSite}`
          } else {
            cookieString += `; samesite=lax`
          }
          if (options?.secure) {
            cookieString += `; secure`
          }
          
          document.cookie = cookieString
          console.log('Cookie establecida:', name, '=', value.substring(0, 20) + '...')
        })
      },
    },
  })
  
  return clientInstance
}

