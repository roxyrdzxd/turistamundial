import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET - Obtener un template específico
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Verificar si es administrador
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { data: template, error } = await supabase
      .from('dynamic_treasure_templates')
      .select('*')
      .eq('id', params.id)
      .single()

    if (error) {
      console.error('Error al obtener template:', error)
      return NextResponse.json(
        { error: 'Error al obtener template', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      template
    })
  } catch (error: any) {
    console.error('Error inesperado:', error)
    return NextResponse.json(
      { error: 'Error inesperado al obtener template' },
      { status: 500 }
    )
  }
}

// PUT - Actualizar template
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Verificar si es administrador
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const body = await request.json()

    // Validaciones
    if (body.spawn_probability !== undefined && (body.spawn_probability < 0 || body.spawn_probability > 1)) {
      return NextResponse.json(
        { error: 'Probabilidad debe estar entre 0 y 1' },
        { status: 400 }
      )
    }

    if (body.max_distance_meters !== undefined && body.min_distance_meters !== undefined) {
      if (body.max_distance_meters < body.min_distance_meters) {
        return NextResponse.json(
          { error: 'Distancia máxima debe ser mayor o igual a distancia mínima' },
          { status: 400 }
        )
      }
    }

    const { data, error } = await supabase
      .from('dynamic_treasure_templates')
      .update({
        ...body,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      console.error('Error al actualizar template:', error)
      return NextResponse.json(
        { error: 'Error al actualizar template', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      template: data
    })
  } catch (error: any) {
    console.error('Error inesperado:', error)
    return NextResponse.json(
      { error: 'Error inesperado al actualizar template' },
      { status: 500 }
    )
  }
}

// DELETE - Eliminar template
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Verificar si es administrador
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { error } = await supabase
      .from('dynamic_treasure_templates')
      .delete()
      .eq('id', params.id)

    if (error) {
      console.error('Error al eliminar template:', error)
      return NextResponse.json(
        { error: 'Error al eliminar template', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Template eliminado exitosamente'
    })
  } catch (error: any) {
    console.error('Error inesperado:', error)
    return NextResponse.json(
      { error: 'Error inesperado al eliminar template' },
      { status: 500 }
    )
  }
}
