import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    
    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { treasureId, latitude, longitude } = body

    // Validar datos
    if (!treasureId) {
      return NextResponse.json(
        { error: 'ID de tesoro requerido' },
        { status: 400 }
      )
    }

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

    // Llamar a la función de base de datos para recolectar el tesoro
    console.log('Intentando recolectar tesoro:', {
      user_id: user.id,
      treasure_id: treasureId,
      latitude,
      longitude
    })

    const { data, error } = await supabase.rpc('collect_treasure', {
      p_user_id: user.id,
      p_treasure_id: treasureId,
      p_user_latitude: latitude,
      p_user_longitude: longitude
    })

    if (error) {
      console.error('Error al recolectar tesoro (RPC error):', {
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        user_id: user.id,
        treasure_id: treasureId,
        latitude,
        longitude,
        fullError: JSON.stringify(error, null, 2)
      })
      return NextResponse.json(
        { 
          error: 'Error al recolectar tesoro', 
          details: error.message,
          code: error.code,
          hint: error.hint
        },
        { status: 500 }
      )
    }

    // Verificar si la función retornó un error
    if (data && typeof data === 'object' && 'success' in data && !data.success) {
      console.error('Error en respuesta de collect_treasure:', data)
      return NextResponse.json(
        { 
          error: data.error || 'No se pudo recolectar el tesoro',
          ...data
        },
        { status: 400 }
      )
    }

    // Verificar que data existe y tiene la estructura esperada
    if (!data) {
      console.error('Error: collect_treasure retornó null o undefined')
      return NextResponse.json(
        { error: 'Error inesperado: la función no retornó datos' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      ...data
    })
  } catch (error: any) {
    console.error('Error inesperado al recolectar tesoro:', {
      error: error?.message || error,
      stack: error?.stack,
      name: error?.name,
      fullError: JSON.stringify(error, Object.getOwnPropertyNames(error), 2)
    })
    return NextResponse.json(
      { 
        error: 'Error inesperado al recolectar tesoro',
        details: error?.message || 'Error desconocido',
        type: error?.name || 'UnknownError'
      },
      { status: 500 }
    )
  }
}
