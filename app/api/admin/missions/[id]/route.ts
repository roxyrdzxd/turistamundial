import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET - Obtener una misión específica
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

    const { data: mission, error } = await supabase
      .from('missions')
      .select('*')
      .eq('id', params.id)
      .single()

    if (error) {
      console.error('Error al obtener misión:', error)
      return NextResponse.json(
        { error: 'Error al obtener misión', details: error.message },
        { status: 500 }
      )
    }

    if (!mission) {
      return NextResponse.json({ error: 'Misión no encontrada' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      mission
    })
  } catch (error: any) {
    console.error('Error inesperado:', error)
    return NextResponse.json(
      { error: 'Error inesperado al obtener misión' },
      { status: 500 }
    )
  }
}

// PUT - Actualizar misión
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

    const {
      title,
      description,
      type,
      reward_coins,
      requirement,
      is_active,
      expires_at
    } = await request.json()

    // Validar tipo si se proporciona
    if (type && !['daily', 'weekly', 'achievement', 'special'].includes(type)) {
      return NextResponse.json(
        { error: 'Tipo de misión inválido' },
        { status: 400 }
      )
    }

    // Validar requirement si se proporciona
    if (requirement !== undefined && (typeof requirement !== 'object' || Array.isArray(requirement))) {
      return NextResponse.json(
        { error: 'Requirement debe ser un objeto JSON válido' },
        { status: 400 }
      )
    }

    // Construir objeto de actualización solo con campos proporcionados
    const updateData: any = {}
    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (type !== undefined) updateData.type = type
    if (reward_coins !== undefined) updateData.reward_coins = reward_coins
    if (requirement !== undefined) updateData.requirement = requirement
    if (is_active !== undefined) updateData.is_active = is_active
    if (expires_at !== undefined) updateData.expires_at = expires_at

    const { data: mission, error } = await supabase
      .from('missions')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      console.error('Error al actualizar misión:', error)
      return NextResponse.json(
        { error: 'Error al actualizar misión', details: error.message },
        { status: 500 }
      )
    }

    if (!mission) {
      return NextResponse.json({ error: 'Misión no encontrada' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      mission
    })
  } catch (error: any) {
    console.error('Error inesperado:', error)
    return NextResponse.json(
      { error: 'Error inesperado al actualizar misión' },
      { status: 500 }
    )
  }
}

// DELETE - Eliminar misión
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

    // Eliminar misión (cascade eliminará los progresos de usuario)
    const { error } = await supabase
      .from('missions')
      .delete()
      .eq('id', params.id)

    if (error) {
      console.error('Error al eliminar misión:', error)
      return NextResponse.json(
        { error: 'Error al eliminar misión', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Misión eliminada correctamente'
    })
  } catch (error: any) {
    console.error('Error inesperado:', error)
    return NextResponse.json(
      { error: 'Error inesperado al eliminar misión' },
      { status: 500 }
    )
  }
}
