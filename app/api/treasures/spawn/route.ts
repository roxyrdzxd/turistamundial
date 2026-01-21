import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { latitude, longitude, radius = 2000, minTreasures = 3 } = await request.json()

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
    
    // Verificar autenticación
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    // Llamar a la función mejorada de generación de tesoros (con templates e insignias)
    const { data, error } = await supabase.rpc('spawn_dynamic_treasures_with_badges', {
      p_latitude: latitude,
      p_longitude: longitude,
      p_radius_meters: radius,
      p_min_treasures: minTreasures
    })

    if (error) {
      console.error('Error al generar tesoros:', error)
      return NextResponse.json(
        { error: 'Error al generar tesoros', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      ...data
    })
  } catch (error) {
    console.error('Error inesperado:', error)
    return NextResponse.json(
      { error: 'Error inesperado al generar tesoros' },
      { status: 500 }
    )
  }
}
