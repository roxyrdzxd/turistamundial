import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET - Listar todas las misiones (solo admin)
export async function GET(request: Request) {
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

    // Obtener parámetros de búsqueda
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const isActive = searchParams.get('is_active')

    let query = supabase
      .from('missions')
      .select('*')
      .order('created_at', { ascending: false })

    // Filtros opcionales
    if (type) {
      query = query.eq('type', type)
    }
    if (isActive !== null) {
      query = query.eq('is_active', isActive === 'true')
    }

    const { data: missions, error } = await query

    if (error) {
      console.error('Error al obtener misiones:', error)
      return NextResponse.json(
        { error: 'Error al obtener misiones', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      missions: missions || []
    })
  } catch (error: any) {
    console.error('Error inesperado:', error)
    return NextResponse.json(
      { error: 'Error inesperado al obtener misiones' },
      { status: 500 }
    )
  }
}

// POST - Crear nueva misión (solo admin)
export async function POST(request: Request) {
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
      is_active = true,
      expires_at
    } = await request.json()

    // Validaciones
    if (!title || !description || !type) {
      return NextResponse.json(
        { error: 'Título, descripción y tipo son requeridos' },
        { status: 400 }
      )
    }

    if (!['daily', 'weekly', 'achievement', 'special'].includes(type)) {
      return NextResponse.json(
        { error: 'Tipo de misión inválido' },
        { status: 400 }
      )
    }

    if (!requirement || typeof requirement !== 'object') {
      return NextResponse.json(
        { error: 'Requirement debe ser un objeto JSON válido' },
        { status: 400 }
      )
    }

    // Crear misión
    const { data: mission, error } = await supabase
      .from('missions')
      .insert({
        title,
        description,
        type,
        reward_coins: reward_coins || 0,
        requirement,
        is_active,
        expires_at: expires_at || null
      })
      .select()
      .single()

    if (error) {
      console.error('Error al crear misión:', error)
      return NextResponse.json(
        { error: 'Error al crear misión', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      mission
    })
  } catch (error: any) {
    console.error('Error inesperado:', error)
    return NextResponse.json(
      { error: 'Error inesperado al crear misión' },
      { status: 500 }
    )
  }
}
