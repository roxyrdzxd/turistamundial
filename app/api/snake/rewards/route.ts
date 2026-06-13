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

    const { data, error } = await supabase.rpc('get_snake_daily_rewards')

    if (error) {
      console.error('Error obteniendo recompensas Snake:', error)
      return NextResponse.json(
        { error: error.message || 'Error al obtener recompensas' },
        { status: 500 }
      )
    }

    return NextResponse.json({ rewards: data?.[0] || null })
  } catch (error: any) {
    console.error('Error en snake rewards:', error)
    return NextResponse.json(
      { error: error.message || 'Error al obtener recompensas' },
      { status: 500 }
    )
  }
}
