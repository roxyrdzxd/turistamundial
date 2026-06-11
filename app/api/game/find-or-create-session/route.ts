import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const MIN_PLAYERS = 2
const MAX_PLAYERS = 8

function normalizeMaxPlayers(value: unknown) {
  const parsed = Number(value ?? MAX_PLAYERS)

  if (!Number.isInteger(parsed) || parsed < MIN_PLAYERS || parsed > MAX_PLAYERS) {
    return null
  }

  return parsed
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const boardId = body.boardId || '00000000-0000-0000-0000-000000000001' // Turista Mundial por defecto
    const maxPlayers = normalizeMaxPlayers(body.maxPlayers)

    if (!maxPlayers) {
      return NextResponse.json(
        { error: `El numero maximo de jugadores debe estar entre ${MIN_PLAYERS} y ${MAX_PLAYERS}` },
        { status: 400 }
      )
    }

    // Asegurar que el perfil existe
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single()

    if (!existingProfile) {
      const { error: profileError } = await supabase.rpc('ensure_user_profile_safe', {
        p_user_id: user.id
      })
      if (profileError) {
        const defaultUsername = 'Usuario' + user.id.substring(0, 8).toUpperCase()
        await supabase.from('profiles').insert({
          id: user.id,
          username: defaultUsername,
        })
      }
    }

    // PASO 1: Buscar una sesión disponible
    const { data: availableSessions, error: searchError } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('status', 'waiting')
      .eq('board_id', boardId)
      .lt('current_players', maxPlayers) // Que no esté llena
      .order('created_at', { ascending: true }) // La más antigua primero
      .limit(1)

    if (searchError) {
      console.error('[Find or Create] Error buscando sesiones:', searchError)
    }

    // Si hay una sesión disponible, intentar unirse a ella
    if (availableSessions && availableSessions.length > 0) {
      const session = availableSessions[0]
      
      // Verificar que el usuario no esté ya en esta sesión
      const { data: existingPlayer } = await supabase
        .from('session_players')
        .select('id')
        .eq('session_id', session.id)
        .eq('user_id', user.id)
        .maybeSingle()

      if (existingPlayer) {
        // Ya está en la sesión, devolverla
        return NextResponse.json({
          session: session,
          alreadyInSession: true,
          isNewSession: false,
        })
      }

      // Verificar que aún tiene capacidad (por si cambió mientras buscábamos)
      if (session.current_players >= session.max_players) {
        // Si se llenó, continuar para crear una nueva
        console.log('[Find or Create] Sesión encontrada pero se llenó, creando nueva')
      } else {
        // Obtener color preferido del usuario si existe
        const { data: profile } = await supabase
          .from('profiles')
          .select('preferred_color')
          .eq('id', user.id)
          .single()

        // Unirse a la sesión existente
        const { data: existingPlayers } = await supabase
          .from('session_players')
          .select('color')
          .eq('session_id', session.id)

        const usedColors = existingPlayers?.map(p => p.color) || []
        const availableColors = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'cyan']
        
        // Intentar usar el color preferido del usuario si está disponible
        let availableColor = availableColors.find(c => !usedColors.includes(c)) || availableColors[0]
        if (profile?.preferred_color && availableColors.includes(profile.preferred_color) && !usedColors.includes(profile.preferred_color)) {
          availableColor = profile.preferred_color
        }

        const { data: player, error: joinError } = await supabase
          .from('session_players')
          .insert({
            session_id: session.id,
            user_id: user.id,
            position: 0,
            money: 1500,
            color: availableColor,
            turn_order: session.current_players,
            is_bankrupt: false,
          })
          .select()
          .single()

        if (joinError) {
          console.error('[Find or Create] Error uniéndose a sesión:', joinError)
          // Si falla, crear una nueva (continuar al código de creación)
        } else {
          // Actualizar contador
          await supabase
            .from('game_sessions')
            .update({ current_players: session.current_players + 1 })
            .eq('id', session.id)

          return NextResponse.json({
            session: {
              ...session,
              current_players: session.current_players + 1,
            },
            player,
            isNewSession: false,
          })
        }
      }
    }

    // PASO 2: Si no hay sesión disponible, crear una nueva
    // Verificar que el tablero existe
    const { data: board, error: boardError } = await supabase
      .from('boards')
      .select('id, name, is_active')
      .eq('id', boardId)
      .single()

    if (boardError || !board || !board.is_active) {
      return NextResponse.json({ error: 'Tablero no encontrado o no disponible' }, { status: 400 })
    }

    // Crear nueva sesión
    const { data: newSession, error: sessionError } = await supabase
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
    
    const { data: player, error: playerError } = await supabase
      .from('session_players')
      .insert({
        session_id: newSession.id,
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
      await supabase.from('game_sessions').delete().eq('id', newSession.id)
      return NextResponse.json({ error: playerError.message }, { status: 500 })
    }

    return NextResponse.json({
      session: {
        ...newSession,
        player,
      },
      isNewSession: true,
    })
  } catch (error: any) {
    console.error('[Find or Create] Error general:', error)
    return NextResponse.json({
      error: error.message || 'Error al buscar o crear sesión'
    }, { status: 500 })
  }
}

