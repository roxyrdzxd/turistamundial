import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET - Listar todos los templates (solo admin)
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

    // Obtener todos los templates
    const { data: templates, error } = await supabase
      .from('dynamic_treasure_templates')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error al obtener templates:', error)
      return NextResponse.json(
        { error: 'Error al obtener templates', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      templates: templates || []
    })
  } catch (error: any) {
    console.error('Error inesperado:', error)
    return NextResponse.json(
      { error: 'Error inesperado al obtener templates' },
      { status: 500 }
    )
  }
}

// POST - Crear nuevo template (solo admin)
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
      rarity,
      badge_url,
      spawn_probability,
      min_distance_meters,
      max_distance_meters,
      min_walk_distance_meters,
      is_active = true
    } = await request.json()

    // Validaciones
    if (!name) {
      return NextResponse.json(
        { error: 'Nombre es requerido' },
        { status: 400 }
      )
    }

    if (spawn_probability < 0 || spawn_probability > 1) {
      return NextResponse.json(
        { error: 'Probabilidad debe estar entre 0 y 1' },
        { status: 400 }
      )
    }

    if (max_distance_meters < min_distance_meters) {
      return NextResponse.json(
        { error: 'Distancia máxima debe ser mayor o igual a distancia mínima' },
        { status: 400 }
      )
    }

    // Crear template
    const { data, error } = await supabase
      .from('dynamic_treasure_templates')
      .insert({
        name,
        description: description || null,
        coins_reward: coins_reward || 10,
        rarity: rarity || 'common',
        badge_url: badge_url || null,
        spawn_probability: spawn_probability || 0.1,
        min_distance_meters: min_distance_meters || 300,
        max_distance_meters: max_distance_meters || 1000,
        min_walk_distance_meters: min_walk_distance_meters || 300,
        is_active
      })
      .select()
      .single()

    if (error) {
      console.error('Error al crear template:', error)
      return NextResponse.json(
        { error: 'Error al crear template', details: error.message },
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
      { error: 'Error inesperado al crear template' },
      { status: 500 }
    )
  }
}
