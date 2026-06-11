import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

type ClaimPayload = {
  userChallengeId?: string
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

    const body = (await request.json()) as ClaimPayload

    if (!body.userChallengeId || typeof body.userChallengeId !== 'string') {
      return NextResponse.json(
        { error: 'Reto invalido' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase.rpc('claim_snake_daily_challenge', {
      p_user_challenge_id: body.userChallengeId,
    })

    if (error) {
      console.error('Error reclamando reto diario Snake:', error)
      return NextResponse.json(
        { error: error.message || 'No se pudo reclamar el reto' },
        { status: 400 }
      )
    }

    const result = data?.[0] || null

    if (!result?.success) {
      return NextResponse.json(
        { error: result?.message || 'No se pudo reclamar el reto', result },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true, result })
  } catch (error: any) {
    console.error('Error en snake challenge claim:', error)
    return NextResponse.json(
      { error: error.message || 'Error al reclamar el reto' },
      { status: 500 }
    )
  }
}
