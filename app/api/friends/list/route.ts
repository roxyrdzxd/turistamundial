import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Obtener todas las amistades del usuario
    const { data: friendships1 } = await supabase
      .from('friendships')
      .select(`
        *,
        friend1:profiles!friendships_user1_id_fkey(id, username, avatar_url),
        friend2:profiles!friendships_user2_id_fkey(id, username, avatar_url)
      `)
      .eq('user1_id', user.id)
    
    const { data: friendships2 } = await supabase
      .from('friendships')
      .select(`
        *,
        friend1:profiles!friendships_user1_id_fkey(id, username, avatar_url),
        friend2:profiles!friendships_user2_id_fkey(id, username, avatar_url)
      `)
      .eq('user2_id', user.id)
    
    const friendships = [...(friendships1 || []), ...(friendships2 || [])]

    if (!friendships || friendships.length === 0) {
      return NextResponse.json({ friends: [] })
    }

    // Formatear para obtener el amigo (no el usuario actual)
    const friends = friendships.map(friendship => {
      const friend = friendship.user1_id === user.id 
        ? friendship.friend2 
        : friendship.friend1
      return {
        id: friend.id,
        username: friend.username,
        avatar_url: friend.avatar_url,
        friendship_id: friendship.id,
      }
    })

    // Obtener estado online de los amigos
    const friendIds = friends.map(f => f.id)
    const { data: onlineStatuses } = await supabase
      .from('user_online_status')
      .select('user_id, is_online, last_seen')
      .in('user_id', friendIds)

    // Combinar información
    const friendsWithStatus = friends.map(friend => {
      const status = onlineStatuses?.find(s => s.user_id === friend.id)
      return {
        ...friend,
        is_online: status?.is_online || false,
        last_seen: status?.last_seen || null,
      }
    })

    return NextResponse.json({ friends: friendsWithStatus })
  } catch (error: any) {
    console.error('[GetFriends] Error:', error)
    return NextResponse.json({ error: error.message || 'Error al obtener amigos' }, { status: 500 })
  }
}

