import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    const { data, error } = await supabase.rpc('get_snake_daily_challenges')

    if (error) {
      console.error('Error obteniendo retos diarios Snake:', error)
      return NextResponse.json(
        { error: error.message || 'Error al obtener retos diarios' },
        { status: 500 }
      )
    }

    return NextResponse.json({ challenges: data || [] })
  } catch (error: any) {
    console.error('Error en snake challenges:', error)
    return NextResponse.json(
      { error: error.message || 'Error al obtener retos diarios' },
      { status: 500 }
    )
  }
}
