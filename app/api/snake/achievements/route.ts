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

    const { data, error } = await supabase.rpc('get_snake_achievements_for_user', {
      p_user_id: user.id,
    })

    if (error) {
      console.error('Error obteniendo logros Snake:', error)
      return NextResponse.json(
        { error: 'Error al obtener logros' },
        { status: 500 }
      )
    }

    return NextResponse.json({ achievements: data || [] })
  } catch (error: any) {
    console.error('Error en snake achievements:', error)
    return NextResponse.json(
      { error: error.message || 'Error al obtener logros' },
      { status: 500 }
    )
  }
}
