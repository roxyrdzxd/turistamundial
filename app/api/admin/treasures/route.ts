import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET - Listar todos los tesoros (solo admin)
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
    const isActive = searchParams.get('is_active')
    const rarity = searchParams.get('rarity')

    let query = supabase
      .from('treasures')
      .select(`
        id,
        name,
        description,
        coins_reward,
        radius_meters,
        rarity,
        max_collections,
        current_collections,
        spawn_time,
        despawn_time,
        is_active,
        badge_url,
        created_at,
        updated_at,
        location
      `)
      .order('created_at', { ascending: false })

    // Filtros opcionales
    if (isActive !== null) {
      query = query.eq('is_active', isActive === 'true')
    }
    if (rarity) {
      query = query.eq('rarity', rarity)
    }

    // Usar función RPC para obtener tesoros con coordenadas
    const { data: treasures, error } = await supabase.rpc('get_treasures_admin', {
      p_is_active: isActive ? isActive === 'true' : null,
      p_rarity: rarity || null
    })

    if (error) {
      console.error('Error al obtener tesoros:', error)
      return NextResponse.json(
        { error: 'Error al obtener tesoros', details: error.message },
        { status: 500 }
      )
    }

    // Obtener estadísticas de medallas para cada tesoro
    const { data: badgeStats, error: statsError } = await supabase.rpc('get_all_treasure_badge_stats')

    // Crear un mapa de estadísticas por treasure_id
    const statsMap = new Map()
    if (badgeStats && !statsError) {
      badgeStats.forEach((stat: any) => {
        statsMap.set(stat.treasure_id, {
          total_collections: Number(stat.total_collections),
          recent_collections: Number(stat.recent_collections)
        })
      })
    }

    // Agregar estadísticas a cada tesoro
    const treasuresWithStats = (treasures || []).map((treasure: any) => ({
      ...treasure,
      badge_stats: treasure.badge_url ? (statsMap.get(treasure.id) || {
        total_collections: 0,
        recent_collections: 0
      }) : null
    }))

    return NextResponse.json({
      success: true,
      treasures: treasuresWithStats
    })
  } catch (error: any) {
    console.error('Error inesperado:', error)
    return NextResponse.json(
      { error: 'Error inesperado al obtener tesoros' },
      { status: 500 }
    )
  }
}

// POST - Crear nuevo tesoro (solo admin)
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
      name,
      description,
      coins_reward,
      latitude,
      longitude,
      radius_meters,
      rarity,
      max_collections,
      despawn_time,
      is_active = true,
      badge_url
    } = await request.json()

    // Validaciones
    if (!name || !latitude || !longitude) {
      return NextResponse.json(
        { error: 'Nombre, latitud y longitud son requeridos' },
        { status: 400 }
      )
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return NextResponse.json(
        { error: 'Coordenadas inválidas' },
        { status: 400 }
      )
    }

    // Crear tesoro usando función RPC para manejar geometry correctamente
    const { data, error } = await supabase.rpc('create_treasure_admin', {
      p_name: name,
      p_latitude: latitude,
      p_longitude: longitude,
      p_description: description || null,
      p_coins_reward: coins_reward || 10,
      p_radius_meters: radius_meters || 50,
      p_rarity: rarity || 'common',
      p_max_collections: max_collections || null,
      p_despawn_time: despawn_time || null,
      p_is_active: is_active,
      p_badge_url: badge_url || null
    })

    if (error) {
      console.error('Error al crear tesoro:', error)
      return NextResponse.json(
        { error: 'Error al crear tesoro', details: error.message },
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
      { error: 'Error inesperado al crear tesoro' },
      { status: 500 }
    )
  }
}
