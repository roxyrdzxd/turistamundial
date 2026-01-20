import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET - Obtener un tesoro específico
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

    // Obtener tesoro con coordenadas usando RPC
    const { data: treasures, error } = await supabase.rpc('get_treasures_admin', {
      p_is_active: null,
      p_rarity: null
    })

    if (error) {
      console.error('Error al obtener tesoro:', error)
      return NextResponse.json(
        { error: 'Error al obtener tesoro', details: error.message },
        { status: 500 }
      )
    }

    const treasure = treasures?.find((t: any) => t.id === params.id)

    if (!treasure) {
      return NextResponse.json({ error: 'Tesoro no encontrado' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      treasure
    })
  } catch (error: any) {
    console.error('Error inesperado:', error)
    return NextResponse.json(
      { error: 'Error inesperado al obtener tesoro' },
      { status: 500 }
    )
  }
}

// PUT - Actualizar tesoro
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
      name,
      description,
      coins_reward,
      latitude,
      longitude,
      radius_meters,
      rarity,
      max_collections,
      despawn_time,
      is_active,
      badge_url
    } = await request.json()

    // Validar coordenadas si se proporcionan
    if (latitude !== undefined || longitude !== undefined) {
      if (latitude === undefined || longitude === undefined) {
        return NextResponse.json(
          { error: 'Debe proporcionar tanto latitud como longitud' },
          { status: 400 }
        )
      }
      if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        return NextResponse.json(
          { error: 'Coordenadas inválidas' },
          { status: 400 }
        )
      }
    }

    // Actualizar tesoro usando función RPC
    const { data, error } = await supabase.rpc('update_treasure_admin', {
      p_treasure_id: params.id,
      p_name: name || null,
      p_description: description !== undefined ? description : null,
      p_coins_reward: coins_reward || null,
      p_latitude: latitude || null,
      p_longitude: longitude || null,
      p_radius_meters: radius_meters || null,
      p_rarity: rarity || null,
      p_max_collections: max_collections !== undefined ? max_collections : null,
      p_despawn_time: despawn_time || null,
      p_is_active: is_active !== undefined ? is_active : null,
      p_badge_url: badge_url !== undefined ? badge_url : null
    })

    if (error) {
      console.error('Error al actualizar tesoro:', error)
      return NextResponse.json(
        { error: 'Error al actualizar tesoro', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      treasure: data
    })
  } catch (error: any) {
    console.error('Error inesperado:', error)
    return NextResponse.json(
      { error: 'Error inesperado al actualizar tesoro' },
      { status: 500 }
    )
  }
}

// DELETE - Eliminar tesoro
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

    // Eliminar tesoro (cascade eliminará las recolecciones)
    const { error } = await supabase
      .from('treasures')
      .delete()
      .eq('id', params.id)

    if (error) {
      console.error('Error al eliminar tesoro:', error)
      return NextResponse.json(
        { error: 'Error al eliminar tesoro', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Tesoro eliminado correctamente'
    })
  } catch (error: any) {
    console.error('Error inesperado:', error)
    return NextResponse.json(
      { error: 'Error inesperado al eliminar tesoro' },
      { status: 500 }
    )
  }
}
