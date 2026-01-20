import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET - Obtener todas las insignias con filtros
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    
    // Obtener parámetros de búsqueda
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || null
    const rarityParam = searchParams.get('rarity')
    const rarity = rarityParam ? rarityParam.split(',') : null
    const city = searchParams.get('city') || null
    const sortBy = searchParams.get('sort') || 'name'
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Obtener usuario actual (opcional, para saber si ya recolectó insignias)
    const { data: { user } } = await supabase.auth.getUser()
    const userId = user?.id || null

    // Validar sortBy
    const validSortOptions = ['name', 'rarity', 'coins', 'popularity']
    const finalSortBy = validSortOptions.includes(sortBy) ? sortBy : 'name'

    // Obtener insignias
    const { data: badges, error } = await supabase.rpc('get_all_badges', {
      p_search: search,
      p_rarity: rarity,
      p_city: city,
      p_collected_by_user: userId,
      p_sort_by: finalSortBy,
      p_limit: limit,
      p_offset: offset
    })

    if (error) {
      console.error('Error al obtener insignias:', error)
      return NextResponse.json(
        { error: 'Error al obtener insignias', details: error.message },
        { status: 500 }
      )
    }

    // Obtener total para paginación
    const { data: total, error: countError } = await supabase.rpc('count_all_badges', {
      p_search: search,
      p_rarity: rarity,
      p_city: city
    })

    if (countError) {
      console.error('Error al contar insignias:', countError)
    }

    // Obtener ciudades disponibles (siempre para los filtros)
    const { data: cities, error: citiesError } = await supabase.rpc('get_available_cities')

    if (citiesError) {
      console.error('Error al obtener ciudades:', citiesError)
    }

    return NextResponse.json({
      success: true,
      badges: badges || [],
      total: total || 0,
      cities: cities || [],
      hasMore: (total || 0) > offset + limit
    })
  } catch (error: any) {
    console.error('Error inesperado:', error)
    return NextResponse.json(
      { error: 'Error inesperado al obtener insignias' },
      { status: 500 }
    )
  }
}
