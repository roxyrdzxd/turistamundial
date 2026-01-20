import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const latitude = parseFloat(searchParams.get('lat') || '0')
    const longitude = parseFloat(searchParams.get('lng') || '0')
    const radius = parseInt(searchParams.get('radius') || '1000')

    // Validar coordenadas
    if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
      return NextResponse.json(
        { error: 'Coordenadas inválidas' },
        { status: 400 }
      )
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return NextResponse.json(
        { error: 'Coordenadas fuera de rango válido' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    
    // Obtener usuario actual (opcional, para saber si ya recolectó tesoros)
    const { data: { user } } = await supabase.auth.getUser()
    const userId = user?.id || null

    // Llamar a la función de base de datos
    const { data, error } = await supabase.rpc('find_nearby_treasures', {
      p_latitude: latitude,
      p_longitude: longitude,
      p_radius_meters: radius,
      p_user_id: userId
    })

    if (error) {
      console.error('Error al buscar tesoros:', error)
      return NextResponse.json(
        { error: 'Error al buscar tesoros', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      treasures: data || [],
      count: data?.length || 0
    })
  } catch (error) {
    console.error('Error inesperado:', error)
    return NextResponse.json(
      { error: 'Error inesperado al buscar tesoros' },
      { status: 500 }
    )
  }
}
