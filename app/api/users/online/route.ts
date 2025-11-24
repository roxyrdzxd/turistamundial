import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Obtener usuarios en línea (últimos 5 minutos)
    const { data: onlineUsers } = await supabase
      .from('user_online_status')
      .select(`
        *,
        profile:profiles!user_online_status_user_id_fkey(id, username, avatar_url)
      `)
      .eq('is_online', true)
      .gte('last_seen', new Date(Date.now() - 5 * 60 * 1000).toISOString())
      .neq('user_id', user.id) // Excluir al usuario actual
      .order('last_seen', { ascending: false })
      .limit(20)

    if (!onlineUsers) {
      return NextResponse.json({ users: [] })
    }

    // Formatear respuesta
    const users = onlineUsers
      .filter(item => item.profile) // Filtrar nulls
      .map(item => ({
        id: item.profile.id,
        username: item.profile.username,
        avatar_url: item.profile.avatar_url,
        is_online: item.is_online,
        last_seen: item.last_seen,
      }))

    return NextResponse.json({ users })
  } catch (error: any) {
    console.error('[GetOnlineUsers] Error:', error)
    return NextResponse.json({ error: error.message || 'Error al obtener usuarios en línea' }, { status: 500 })
  }
}

