import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }
    
    const { action, count = 1, sessionId = null } = await request.json()
    
    if (!action) {
      return NextResponse.json({ error: 'Acción requerida' }, { status: 400 })
    }
    
    // Actualizar progreso de misiones
    const { data, error } = await supabase.rpc('update_mission_progress', {
      p_user_id: user.id,
      p_action: action,
      p_count: count,
      p_session_id: sessionId
    })
    
    if (error) {
      console.error('Error actualizando progreso de misiones:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({ 
      success: true,
      data,
      message: 'Progreso de misiones actualizado'
    })
  } catch (error: any) {
    console.error('Error en update-progress:', error)
    return NextResponse.json({ error: error.message || 'Error al actualizar progreso' }, { status: 500 })
  }
}

