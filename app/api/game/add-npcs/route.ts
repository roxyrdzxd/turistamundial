import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { sessionId, count = 3 } = await request.json()

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId requerido' }, { status: 400 })
    }

    console.log('[Add NPCs] Iniciando proceso para sesión:', sessionId, 'Usuario:', user.id)

    // Verificar que la sesión existe y el usuario es el host
    const { data: session, error: sessionError } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('host_id', user.id)
      .eq('status', 'waiting')
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Sesión no encontrada o no eres el host' }, { status: 404 })
    }

    // Obtener colores ya usados
    const { data: existingPlayers } = await supabase
      .from('session_players')
      .select('color')
      .eq('session_id', sessionId)

    const usedColors = existingPlayers?.map(p => p.color) || []
    const availableColors = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'cyan']
    const unusedColors = availableColors.filter(c => !usedColors.includes(c))

    // Nombres comunes y realistas para NPCs (sin indicar que son bots)
    const npcNames = [
      'Alex', 'Carlos', 'Diego', 'Elena', 'Fernando', 'Gabriela', 'Hugo', 'Isabel',
      'Javier', 'Laura', 'Miguel', 'Natalia', 'Oscar', 'Patricia', 'Roberto', 'Sofia',
      'Tomas', 'Valeria', 'Andres', 'Beatriz', 'Cristian', 'Daniela', 'Emilio', 'Fabiola',
      'Gonzalo', 'Hilda', 'Ivan', 'Julia', 'Kevin', 'Lucia', 'Manuel', 'Nora'
    ]

    const npcsToAdd = Math.min(count, unusedColors.length, session.max_players - session.current_players)
    
    if (npcsToAdd === 0) {
      return NextResponse.json({ error: 'No hay espacio para más jugadores' }, { status: 400 })
    }

    // Función helper para generar UUID v4
    function generateUUID() {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0
        const v = c === 'x' ? r : (r & 0x3 | 0x8)
        return v.toString(16)
      })
    }

    // Crear jugadores NPC
    const npcPlayers = []
    
    for (let i = 0; i < npcsToAdd; i++) {
      const color = unusedColors[i]
      const npcName = npcNames[i % npcNames.length]
      
      // Generar un UUID único para el NPC (sin prefijo, debe ser UUID válido)
      const npcUserId = generateUUID()
      // Usar solo el nombre común sin sufijos que indiquen que es bot
      // Agregar un número aleatorio pequeño para variar si hay duplicados
      const randomSuffix = Math.floor(Math.random() * 1000)
      const uniqueNpcName = randomSuffix > 0 && randomSuffix < 100 ? `${npcName}${randomSuffix}` : npcName
      
      console.log(`[Add NPCs] Creando NPC ${i} con nombre:`, uniqueNpcName, 'UUID:', npcUserId)
      
      // Crear el perfil del NPC
      const { data: insertData, error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: npcUserId,
          username: uniqueNpcName,
        })
        .select()

      if (profileError) {
        console.error(`[Add NPCs] Error creando perfil NPC ${i}:`, profileError.message, profileError.code)
        
        // Si es error de username duplicado (muy improbable con UUID), intentar una vez más
        if (profileError.code === '23505' && profileError.message.includes('username')) {
          const retryNpcUserId = generateUUID()
          const retryRandomSuffix = Math.floor(Math.random() * 1000)
          const retryUniqueNpcName = retryRandomSuffix > 0 && retryRandomSuffix < 100 ? `${npcName}${retryRandomSuffix}` : npcName
          
          console.log(`[Add NPCs] Reintentando con nuevo nombre:`, retryUniqueNpcName)
          
          const { data: retryData, error: retryError } = await supabase
            .from('profiles')
            .insert({
              id: retryNpcUserId,
              username: retryUniqueNpcName,
            })
            .select()
          
          if (retryError) {
            return NextResponse.json({ 
              error: `Error al crear perfil NPC: ${retryError.message}`,
              details: retryError
            }, { status: 500 })
          }
          
          // Usar el perfil del retry para crear el jugador
          const finalUserId = retryNpcUserId
          const { data: npcPlayer, error: playerError } = await supabase
            .from('session_players')
            .insert({
              session_id: sessionId,
              user_id: finalUserId,
              position: 0,
              money: 1500,
              color: color,
              turn_order: session.current_players + i,
              is_bankrupt: false,
            })
            .select()
            .single()

          if (playerError) {
            console.error(`[Add NPCs] Error agregando NPC ${i} como jugador:`, playerError)
            // Limpiar el perfil creado
            await supabase.from('profiles').delete().eq('id', finalUserId)
            return NextResponse.json({ 
              error: `Error al agregar NPC como jugador: ${playerError.message}`,
              details: playerError
            }, { status: 500 })
          }

          console.log(`[Add NPCs] NPC ${i} creado exitosamente (retry):`, npcPlayer.id)
          npcPlayers.push(npcPlayer)
          continue
        }
        
        return NextResponse.json({ 
          error: `Error al crear perfil NPC: ${profileError.message}`,
          details: profileError
        }, { status: 500 })
      }

      console.log(`[Add NPCs] Perfil NPC ${i} creado exitosamente:`, insertData)
      
      // Agregar el NPC como jugador
      const { data: npcPlayer, error: playerError } = await supabase
        .from('session_players')
        .insert({
          session_id: sessionId,
          user_id: npcUserId,
          position: 0,
          money: 1500,
          color: color,
          turn_order: session.current_players + i,
          is_bankrupt: false,
        })
        .select()
        .single()

      if (playerError) {
        console.error(`[Add NPCs] Error agregando NPC ${i} como jugador:`, playerError)
        // Limpiar el perfil creado
        await supabase.from('profiles').delete().eq('id', npcUserId)
        return NextResponse.json({ 
          error: `Error al agregar NPC como jugador: ${playerError.message}`,
          details: playerError
        }, { status: 500 })
      }

      console.log(`[Add NPCs] NPC ${i} creado exitosamente:`, npcPlayer.id)
      npcPlayers.push(npcPlayer)
    }

    if (npcPlayers.length === 0) {
      return NextResponse.json({ 
        error: 'No se pudo crear ningún NPC. Verifica los logs del servidor.' 
      }, { status: 500 })
    }

    // Actualizar contador de jugadores
    const { error: updateError } = await supabase
      .from('game_sessions')
      .update({ current_players: session.current_players + npcPlayers.length })
      .eq('id', sessionId)

    if (updateError) {
      console.error('[Add NPCs] Error actualizando contador de jugadores:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    console.log(`[Add NPCs] Éxito: Se agregaron ${npcPlayers.length} NPC(s) a la sesión ${sessionId}`)

    return NextResponse.json({ 
      success: true,
      npcsAdded: npcPlayers.length,
      message: `Se agregaron ${npcPlayers.length} NPC(s) a la partida`
    })
  } catch (error: any) {
    console.error('[Add NPCs] Error general:', error)
    return NextResponse.json({ 
      error: error.message || 'Error desconocido al agregar NPCs',
      details: error
    }, { status: 500 })
  }
}
