import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    
    // Verificar autenticación
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'general'
    const days = parseInt(searchParams.get('days') || '30')
    const limit = parseInt(searchParams.get('limit') || '10')

    if (type === 'general') {
      // Obtener estadísticas generales
      const { data, error } = await supabase.rpc('get_treasure_stats', {
        p_user_id: user.id
      })

      if (error) {
        console.error('Error al obtener estadísticas:', error)
        return NextResponse.json(
          { error: 'Error al obtener estadísticas', details: error.message },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        stats: data
      })
    } else if (type === 'history') {
      // Obtener historial
      const { data, error } = await supabase.rpc('get_treasure_history', {
        p_user_id: user.id,
        p_days: days
      })

      if (error) {
        console.error('Error al obtener historial:', error)
        return NextResponse.json(
          { error: 'Error al obtener historial', details: error.message },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        history: data || []
      })
    } else if (type === 'leaderboard') {
      // Obtener ranking
      const { data, error } = await supabase.rpc('get_treasure_leaderboard', {
        p_limit: limit
      })

      if (error) {
        console.error('Error al obtener ranking:', error)
        return NextResponse.json(
          { error: 'Error al obtener ranking', details: error.message },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        leaderboard: data || []
      })
    }

    return NextResponse.json(
      { error: 'Tipo de estadística no válido' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error inesperado:', error)
    return NextResponse.json(
      { error: 'Error inesperado al obtener estadísticas' },
      { status: 500 }
    )
  }
}
