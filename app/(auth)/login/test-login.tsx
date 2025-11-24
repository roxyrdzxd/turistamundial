'use client'

// Componente de prueba para verificar la configuración de Supabase
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function TestLogin() {
  const [status, setStatus] = useState<string>('Verificando...')
  const supabase = createClient()

  useEffect(() => {
    let mounted = true
    
    const testConnection = async () => {
      try {
        // Verificar variables de entorno
        const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL
        const hasKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

        if (!hasUrl || !hasKey) {
          if (mounted) setStatus('❌ Variables de entorno no configuradas')
          return
        }

        // Intentar una consulta simple
        const { data, error } = await supabase.from('profiles').select('count').limit(1)

        if (!mounted) return

        if (error) {
          setStatus(`⚠️ Error de conexión: ${error.message}`)
        } else {
          setStatus('✅ Conexión a Supabase exitosa')
        }
      } catch (err: any) {
        if (mounted) setStatus(`❌ Error: ${err.message}`)
      }
    }

    testConnection()
    
    return () => {
      mounted = false
    }
  }, []) // Sin dependencias para evitar bucles

  return (
    <div className="mt-4 p-4 bg-gray-100 rounded text-sm">
      <strong>Estado de conexión:</strong> {status}
    </div>
  )
}

