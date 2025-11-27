import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Esta ruta puede ser llamada por un cron job externo (Vercel Cron, GitHub Actions, etc.)
// Para protegerla, usa un secret token en el header
export async function POST(request: Request) {
  try {
    // Verificar token de autorización (opcional pero recomendado)
    const authHeader = request.headers.get('authorization')
    const expectedToken = process.env.CRON_SECRET_TOKEN
    
    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const supabase = await createClient()
    
    // Llamar a la función SQL que reinicia todas las misiones diarias
    const { data, error } = await supabase.rpc('reset_all_daily_missions')

    if (error) {
      console.error('Error reiniciando misiones diarias:', error)
      return NextResponse.json({ 
        error: error.message || 'Error al reiniciar misiones diarias' 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      data,
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('Error en reset-daily-missions:', error)
    return NextResponse.json({ 
      error: error.message || 'Error al reiniciar misiones diarias' 
    }, { status: 500 })
  }
}

// También permitir GET para facilitar pruebas (solo en desarrollo)
export async function GET(request: Request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Método no permitido' }, { status: 405 })
  }

  return POST(request)
}

