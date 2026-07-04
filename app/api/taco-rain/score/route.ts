import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

type TacoRainScorePayload = {
  score: number
  durationMs: number
  tacosCaught: number
  bestCombo: number
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

    const body = (await request.json()) as TacoRainScorePayload

    if (
      !isSafeInteger(body.score, 0, 250000) ||
      !isSafeInteger(body.durationMs, 0, 1800000) ||
      !isSafeInteger(body.tacosCaught, 0, 2000) ||
      !isSafeInteger(body.bestCombo, 0, 2000) ||
      body.bestCombo > body.tacosCaught
    ) {
      return NextResponse.json(
        { error: 'Datos de partida invalidos' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase.rpc('record_taco_rain_score', {
      p_score: body.score,
      p_duration_ms: body.durationMs,
      p_tacos_caught: body.tacosCaught,
      p_best_combo: body.bestCombo,
      p_client_seed: body.clientSeed || null,
      p_integrity_hash: body.integrityHash || null,
      p_metadata: body.metadata || {},
    })

    if (error) {
      console.error('Error guardando puntaje Lluvia de Tacos:', error)
      return NextResponse.json(
        { error: error.message || 'No se pudo guardar el puntaje' },
        { status: 400 }
      )
    }

    const result = data?.[0] || null
    let achievements: any[] = []

    if (result?.score_id) {
      const { data: unlockedAchievements, error: achievementsError } = await supabase.rpc(
        'evaluate_taco_rain_achievements',
        {
          p_user_id: user.id,
          p_score_id: result.score_id,
          p_is_personal_best: Boolean(result.is_personal_best),
        }
      )

      if (achievementsError) {
        console.error('Error evaluando logros Lluvia de Tacos:', achievementsError)
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
    console.error('Error en taco rain score:', error)
    return NextResponse.json(
      { error: error.message || 'Error al guardar el puntaje' },
      { status: 500 }
    )
  }
}
