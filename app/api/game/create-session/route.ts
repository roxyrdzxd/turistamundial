import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  // Obtener boardId del body, si no se proporciona usar el tablero mundial por defecto
  const body = await request.json().catch(() => ({}))
  const boardId = body.boardId || '00000000-0000-0000-0000-000000000001' // Turista Mundial por defecto
  const maxPlayers = body.maxPlayers || 8

  // Verificar que el tablero existe
  const { data: board, error: boardError } = await supabase
    .from('boards')
    .select('id, name, is_active')
    .eq('id', boardId)
    .single()

  if (boardError || !board || !board.is_active) {
    return NextResponse.json({ error: 'Tablero no encontrado o no disponible' }, { status: 400 })
  }

  // Asegurar que el perfil existe antes de crear la sesión
  // Esto es un fallback si el trigger no funcionó correctamente
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .single()

  if (!existingProfile) {
    // Si el perfil no existe, intentar crearlo usando la función SQL más robusta
    const { error: profileError } = await supabase.rpc('ensure_user_profile_safe', {
      p_user_id: user.id
    })

    if (profileError) {
      console.error('[CreateSession] Error al crear perfil:', profileError)
      // Si falla la función, intentar crear el perfil directamente
      const defaultUsername = 'Usuario' + user.id.substring(0, 8).toUpperCase()
      const { error: directInsertError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          username: defaultUsername,
        })
        .select()
        .single()

      if (directInsertError) {
        console.error('[CreateSession] Error al crear perfil directamente:', directInsertError)
        return NextResponse.json(
          { error: 'Error al crear perfil de usuario. Por favor, contacta al soporte.' },
          { status: 500 }
        )
      }
    }
  }

  // Crear nueva sesión de juego
  const { data: session, error: sessionError } = await supabase
    .from('game_sessions')
    .insert({
      host_id: user.id,
      board_id: boardId,
      status: 'waiting',
      max_players: maxPlayers,
      current_players: 1,
      current_turn: 0,
    })
    .select()
    .single()

  if (sessionError) {
    return NextResponse.json({ error: sessionError.message }, { status: 500 })
  }

  // Obtener color preferido del usuario si existe
  const { data: profile } = await supabase
    .from('profiles')
    .select('preferred_color')
    .eq('id', user.id)
    .single()

  // Colores disponibles para jugadores
  const colors = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'cyan']
  
  // Usar el color preferido del usuario si existe y es válido, sino usar el primero disponible
  let playerColor = colors[0]
  if (profile?.preferred_color && colors.includes(profile.preferred_color)) {
    playerColor = profile.preferred_color
  }
  
  // Agregar el host como primer jugador
  const { data: player, error: playerError } = await supabase
    .from('session_players')
    .insert({
      session_id: session.id,
      user_id: user.id,
      position: 0,
      money: 1500,
      color: playerColor,
      turn_order: 0,
      is_bankrupt: false,
    })
    .select()
    .single()

  if (playerError) {
    // Si falla, eliminar la sesión creada
    await supabase.from('game_sessions').delete().eq('id', session.id)
    return NextResponse.json({ error: playerError.message }, { status: 500 })
  }

  return NextResponse.json({ 
    session: {
      ...session,
      player,
    },
  })
}

