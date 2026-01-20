import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// POST - Registrar un share de medalla
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { treasure_id, platform } = await request.json()

    if (!treasure_id || !platform) {
      return NextResponse.json(
        { error: 'treasure_id y platform son requeridos' },
        { status: 400 }
      )
    }

    // Verificar que el usuario tiene esta medalla
    const { data: userBadge, error: badgeError } = await supabase
      .from('user_treasure_badges')
      .select('id')
      .eq('user_id', user.id)
      .eq('treasure_id', treasure_id)
      .single()

    if (badgeError || !userBadge) {
      return NextResponse.json(
        { error: 'No tienes esta medalla' },
        { status: 403 }
      )
    }

    // Registrar el share (usar ON CONFLICT para evitar duplicados)
    const { error: insertError } = await supabase
      .from('badge_shares')
      .insert({
        user_id: user.id,
        treasure_id: treasure_id,
        share_platform: platform
      })
      .select()
      .single()

    if (insertError) {
      // Si es error de duplicado, no es crítico
      if (insertError.code === '23505') {
        return NextResponse.json({
          success: true,
          message: 'Share ya registrado'
        })
      }
      
      console.error('Error registrando share:', insertError)
      return NextResponse.json(
        { error: 'Error al registrar share', details: insertError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Share registrado exitosamente'
    })
  } catch (error: any) {
    console.error('Error inesperado:', error)
    return NextResponse.json(
      { error: 'Error inesperado al registrar share' },
      { status: 500 }
    )
  }
}
