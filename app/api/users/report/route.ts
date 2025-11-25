import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

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

    const body = await request.json()
    const { reportedUserId, reason, description } = body

    if (!reportedUserId || !reason) {
      return NextResponse.json(
        { error: 'reportedUserId y reason son requeridos' },
        { status: 400 }
      )
    }

    // No permitir que un usuario se reporte a sí mismo
    if (reportedUserId === user.id) {
      return NextResponse.json(
        { error: 'No puedes reportarte a ti mismo' },
        { status: 400 }
      )
    }

    // Validar que el usuario reportado existe
    const { data: reportedUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', reportedUserId)
      .single()

    if (!reportedUser) {
      return NextResponse.json(
        { error: 'Usuario reportado no encontrado' },
        { status: 404 }
      )
    }

    // Validar reason
    const validReasons = ['spam', 'harassment', 'inappropriate_content', 'cheating', 'other']
    if (!validReasons.includes(reason)) {
      return NextResponse.json(
        { error: 'Razón de reporte inválida' },
        { status: 400 }
      )
    }

    // Verificar si ya existe un reporte reciente del mismo usuario (evitar spam de reportes)
    const { data: recentReport } = await supabase
      .from('user_reports')
      .select('id')
      .eq('reporter_user_id', user.id)
      .eq('reported_user_id', reportedUserId)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Últimas 24 horas
      .single()

    if (recentReport) {
      return NextResponse.json(
        { error: 'Ya has reportado a este usuario recientemente. Por favor espera 24 horas.' },
        { status: 400 }
      )
    }

    // Crear el reporte
    const { data: newReport, error: insertError } = await supabase
      .from('user_reports')
      .insert({
        reported_user_id: reportedUserId,
        reporter_user_id: user.id,
        reason,
        description: description || null,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creando reporte:', insertError)
      return NextResponse.json(
        { error: 'Error al crear el reporte' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      report: newReport,
      message: 'Usuario reportado exitosamente. Revisaremos el caso.'
    })
  } catch (error: any) {
    console.error('Error in user report:', error)
    return NextResponse.json(
      { error: error.message || 'Error al reportar usuario' },
      { status: 500 }
    )
  }
}

