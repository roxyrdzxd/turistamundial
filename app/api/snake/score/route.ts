import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

type SnakeScorePayload = {
  score: number
  durationMs: number
  foodCount: number
  maxLength: number
  levelReached: number
  clientSeed?: string
  integrityHash?: string
  metadata?: Record<string, unknown>
}

function isSafeInteger(value: unknown, min: number, max: number) {
  return Number.isInteger(value) && Number(value) >= min && Number(value) <= max
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

    const body = (await request.json()) as SnakeScorePayload

    if (
      !isSafeInteger(body.score, 0, 100000) ||
      !isSafeInteger(body.durationMs, 0, 1800000) ||
      !isSafeInteger(body.foodCount, 0, 1000) ||
      !isSafeInteger(body.maxLength, 3, 1003) ||
      !isSafeInteger(body.levelReached, 1, 50)
    ) {
      return NextResponse.json(
        { error: 'Datos de partida invalidos' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase.rpc('record_snake_score', {
      p_score: body.score,
      p_duration_ms: body.durationMs,
      p_food_count: body.foodCount,
      p_max_length: body.maxLength,
      p_level_reached: body.levelReached,
      p_client_seed: body.clientSeed || null,
      p_integrity_hash: body.integrityHash || null,
      p_metadata: body.metadata || {},
    })

    if (error) {
      console.error('Error guardando puntaje Snake:', error)
      return NextResponse.json(
        { error: error.message || 'No se pudo guardar el puntaje' },
        { status: 400 }
      )
    }

    const result = data?.[0] || null
    let achievements: any[] = []

    if (result?.score_id) {
      const { data: unlockedAchievements, error: achievementsError } = await supabase.rpc(
        'evaluate_snake_achievements',
        {
          p_user_id: user.id,
          p_score_id: result.score_id,
          p_is_personal_best: Boolean(result.is_personal_best),
        }
      )

      if (achievementsError) {
        console.error('Error evaluando logros Snake:', achievementsError)
      } else {
        achievements = unlockedAchievements || []
      }
    }

    return NextResponse.json({
      success: true,
      result,
      achievements,
    })
  } catch (error: any) {
    console.error('Error en snake score:', error)
    return NextResponse.json(
      { error: error.message || 'Error al guardar el puntaje' },
      { status: 500 }
    )
  }
}
