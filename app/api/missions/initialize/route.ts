import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }
    
    // Inicializar todas las misiones para el usuario
    const [dailyResult, weeklyResult, achievementResult] = await Promise.all([
      supabase.rpc('initialize_daily_missions', { p_user_id: user.id }),
      supabase.rpc('initialize_weekly_missions', { p_user_id: user.id }),
      supabase.rpc('initialize_achievement_missions', { p_user_id: user.id })
    ])
    
    const dailyCount = dailyResult.data || 0
    const weeklyCount = weeklyResult.data || 0
    const achievementCount = achievementResult.data || 0
    
    return NextResponse.json({ 
      success: true,
      daily: dailyCount,
      weekly: weeklyCount,
      achievements: achievementCount,
      total: dailyCount + weeklyCount + achievementCount
    })
  } catch (error: any) {
    console.error('Error inicializando misiones:', error)
    return NextResponse.json({ error: error.message || 'Error al inicializar misiones' }, { status: 500 })
  }
}

