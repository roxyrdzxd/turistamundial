import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

type ClaimChestPayload = {
  chestId?: string
}

export async function POST(request: Request) {
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

    const body = (await request.json()) as ClaimChestPayload

    if (!body.chestId || typeof body.chestId !== 'string') {
      return NextResponse.json(
        { error: 'Cofre invalido' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase.rpc('claim_snake_daily_chest', {
      p_chest_id: body.chestId,
    })

    if (error) {
      console.error('Error abriendo cofre Snake:', error)
      return NextResponse.json(
        { error: error.message || 'No se pudo abrir el cofre' },
        { status: 400 }
      )
    }

    const result = data?.[0] || null

    if (!result?.success) {
      return NextResponse.json(
        { error: result?.message || 'No se pudo abrir el cofre', result },
        { status: 400 }
      )
    }

    const { data: achievements, error: achievementsError } = await supabase.rpc(
      'evaluate_snake_achievements',
      {
        p_user_id: user.id,
        p_score_id: null,
        p_is_personal_best: false,
      }
    )

    if (achievementsError) {
      console.error('Error evaluando insignias Snake tras cofre:', achievementsError)
    }

    return NextResponse.json({ success: true, result, achievements: achievements || [] })
  } catch (error: any) {
    console.error('Error en snake chest claim:', error)
    return NextResponse.json(
      { error: error.message || 'Error al abrir el cofre' },
      { status: 500 }
    )
  }
}
