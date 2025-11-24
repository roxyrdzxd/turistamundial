import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { username, avatar_url } = body

    // Validar que al menos un campo esté presente
    if (!username && !avatar_url) {
      return NextResponse.json(
        { error: 'Debes proporcionar username o avatar_url' },
        { status: 400 }
      )
    }

    // Validar username si se proporciona
    if (username !== undefined) {
      if (username.length < 3 || username.length > 20) {
        return NextResponse.json(
          { error: 'El nombre de usuario debe tener entre 3 y 20 caracteres' },
          { status: 400 }
        )
      }

      // Verificar que el username no esté en uso por otro usuario
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .neq('id', user.id)
        .single()

      if (existingProfile) {
        return NextResponse.json(
          { error: 'Este nombre de usuario ya está en uso' },
          { status: 400 }
        )
      }
    }

    // Actualizar perfil
    const updateData: { username?: string; avatar_url?: string; updated_at?: string } = {}
    
    if (username !== undefined) {
      updateData.username = username
    }
    
    if (avatar_url !== undefined) {
      updateData.avatar_url = avatar_url
    }
    
    updateData.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating profile:', error)
      return NextResponse.json(
        { error: 'Error al actualizar el perfil' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true,
      profile: data 
    })
  } catch (error: any) {
    console.error('Error in profile update:', error)
    return NextResponse.json(
      { error: error.message || 'Error al actualizar el perfil' },
      { status: 500 }
    )
  }
}

