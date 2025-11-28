import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { validateUsername } from '@/lib/utils/contentFilter'

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
      // Validar formato y contenido ofensivo
      const validation = validateUsername(username)
      if (!validation.valid) {
        return NextResponse.json(
          { error: validation.error },
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

    // Verificar si el perfil existe, si no, crearlo primero
    const { data: existingProfile, error: checkError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking profile:', checkError)
      return NextResponse.json(
        { error: 'Error al verificar el perfil' },
        { status: 500 }
      )
    }

    // Si el perfil no existe, crearlo primero usando ensure_user_profile_safe
    if (!existingProfile) {
      console.log('Profile does not exist, creating it for user:', user.id)
      const { error: createError } = await supabase.rpc('ensure_user_profile_safe', {
        p_user_id: user.id
      })

      if (createError) {
        console.error('Error creating profile:', createError)
        // Intentar crear manualmente como fallback
        const defaultUsername = user.user_metadata?.username || `Usuario${user.id.substring(0, 8)}`
        const { error: manualCreateError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            username: defaultUsername,
          })

        if (manualCreateError) {
          console.error('Error creating profile manually:', manualCreateError)
          return NextResponse.json(
            { error: 'Error al crear el perfil. Por favor intenta de nuevo.' },
            { status: 500 }
          )
        }
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

