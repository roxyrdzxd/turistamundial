import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET - Obtener lista de usuarios que han recolectado una medalla específica
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

    // Obtener coleccionistas de la medalla
    const { data: collectors, error } = await supabase
      .from('user_treasure_badges')
      .select(`
        id,
        collected_at,
        user:profiles!user_treasure_badges_user_id_fkey(
          id,
          username,
          avatar_url
        )
      `)
      .eq('treasure_id', params.id)
      .order('collected_at', { ascending: false })

    if (error) {
      console.error('Error al obtener coleccionistas:', error)
      return NextResponse.json(
        { error: 'Error al obtener coleccionistas', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      collectors: collectors || []
    })
  } catch (error: any) {
    console.error('Error inesperado:', error)
    return NextResponse.json(
      { error: 'Error inesperado al obtener coleccionistas' },
      { status: 500 }
    )
  }
}
