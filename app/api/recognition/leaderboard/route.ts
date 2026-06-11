import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'coins'

    let leaderboard: any[] = []

    switch (type) {
      case 'coins':
        // Top 5 jugadores con más TC usando función SQL
        const { data: coinsData, error: coinsError } = await supabase
          .rpc('get_top_players_by_coins', { limit_count: 5 })

        if (!coinsError && coinsData) {
          leaderboard = coinsData.map((item: any, index: number) => ({
            rank: index + 1,
            userId: item.user_id,
            username: item.username || 'Usuario',
            avatarUrl: item.avatar_url,
            value: item.coins || 0,
            type: 'coins'
          }))
        } else {
          // Fallback: consulta directa si la función no existe
          const { data: coinsFallback, error: coinsFallbackError } = await supabase
            .from('user_wallet')
            .select(`
              coins,
              user_id,
              profile:profiles!user_wallet_user_id_fkey(id, username, avatar_url)
            `)
            .order('coins', { ascending: false })
            .limit(5)

          if (!coinsFallbackError && coinsFallback) {
            leaderboard = coinsFallback
              .filter((item: any) => {
                const profile = Array.isArray(item.profile) ? item.profile[0] : item.profile
                return profile && profile.id && (item.coins || 0) > 0
              })
              .map((item: any, index: number) => {
                const profile = Array.isArray(item.profile) ? item.profile[0] : item.profile
                return {
                  rank: index + 1,
                  userId: profile.id,
                  username: profile.username || 'Usuario',
                  avatarUrl: profile.avatar_url,
                  value: item.coins || 0,
                  type: 'coins'
                }
              })
          }
        }
        break

      case 'games':
        // Top 5 jugadores con más partidas jugadas
        const { data: gamesData, error: gamesError } = await supabase
          .rpc('get_top_players_by_games', { limit_count: 5 })

        if (!gamesError && gamesData) {
          leaderboard = gamesData.map((item: any, index: number) => ({
            rank: index + 1,
            userId: item.user_id,
            username: item.username,
            avatarUrl: item.avatar_url,
            value: item.games_played,
            type: 'games'
          }))
        } else {
          // Fallback: contar partidas manualmente
          const { data: allSessions } = await supabase
            .from('session_players')
            .select('user_id, profile:profiles!session_players_user_id_fkey(id, username, avatar_url)')

          if (allSessions) {
            const gameCounts: Record<string, { count: number; profile: any }> = {}
            allSessions.forEach((sp: any) => {
              if (sp.profile && !sp.user_id.startsWith('npc-')) {
                if (!gameCounts[sp.user_id]) {
                  gameCounts[sp.user_id] = { count: 0, profile: sp.profile }
                }
                gameCounts[sp.user_id].count++
              }
            })

            leaderboard = Object.entries(gameCounts)
              .map(([userId, data]) => ({
                rank: 0,
                userId,
                username: data.profile.username,
                avatarUrl: data.profile.avatar_url,
                value: data.count,
                type: 'games'
              }))
              .sort((a, b) => b.value - a.value)
              .slice(0, 5)
              .map((item, index) => ({ ...item, rank: index + 1 }))
          }
        }
        break

      case 'wins':
        // Top 5 jugadores con más victorias
        const { data: winsData, error: winsError } = await supabase
          .rpc('get_top_players_by_wins', { limit_count: 5 })

        if (!winsError && winsData) {
          leaderboard = winsData.map((item: any, index: number) => ({
            rank: index + 1,
            userId: item.user_id,
            username: item.username,
            avatarUrl: item.avatar_url,
            value: item.wins,
            type: 'wins'
          }))
        } else {
          // Fallback: contar victorias desde user_missions
          const { data: winsFallback } = await supabase
            .from('user_missions')
            .select(`
              user_id,
              mission:missions!user_missions_mission_id_fkey(id, requirement),
              profile:profiles!user_missions_user_id_fkey(id, username, avatar_url)
            `)
            .not('completed_at', 'is', null) // Solo completadas

          if (winsFallback) {
            const winCounts: Record<string, { count: number; profile: any }> = {}
            winsFallback.forEach((um: any) => {
              if (um.mission?.requirement?.action === 'win_game' && um.profile) {
                if (!winCounts[um.user_id]) {
                  winCounts[um.user_id] = { count: 0, profile: um.profile }
                }
                winCounts[um.user_id].count++
              }
            })

            leaderboard = Object.entries(winCounts)
              .map(([userId, data]) => ({
                rank: 0,
                userId,
                username: data.profile.username,
                avatarUrl: data.profile.avatar_url,
                value: data.count,
                type: 'wins'
              }))
              .sort((a, b) => b.value - a.value)
              .slice(0, 5)
              .map((item, index) => ({ ...item, rank: index + 1 }))
          }
        }
        break

      case 'monopolies':
        // Top 5 jugadores con más monopolios
        const { data: monopoliesData, error: monopoliesError } = await supabase
          .from('user_missions')
          .select(`
            user_id,
            mission:missions!user_missions_mission_id_fkey(id, requirement),
            profile:profiles!user_missions_user_id_fkey(id, username, avatar_url)
          `)
          .not('completed_at', 'is', null)

        if (!monopoliesError && monopoliesData) {
          const monopolyCounts: Record<string, { count: number; profile: any }> = {}
          monopoliesData.forEach((um: any) => {
            if (um.mission?.requirement?.action === 'get_monopoly' && um.profile) {
              if (!monopolyCounts[um.user_id]) {
                monopolyCounts[um.user_id] = { count: 0, profile: um.profile }
              }
              monopolyCounts[um.user_id].count++
            }
          })

          leaderboard = Object.entries(monopolyCounts)
            .map(([userId, data]) => ({
              rank: 0,
              userId,
              username: data.profile.username,
              avatarUrl: data.profile.avatar_url,
              value: data.count,
              type: 'monopolies'
            }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5)
            .map((item, index) => ({ ...item, rank: index + 1 }))
        }
        break

      case 'friends':
        // Top 5 jugadores con más amigos
        const { data: friendsData, error: friendsError } = await supabase
          .rpc('get_top_players_by_friends', { limit_count: 5 })

        if (!friendsError && friendsData) {
          leaderboard = friendsData.map((item: any, index: number) => ({
            rank: index + 1,
            userId: item.user_id,
            username: item.username,
            avatarUrl: item.avatar_url,
            value: item.friends_count,
            type: 'friends'
          }))
        } else {
          // Fallback: contar amigos manualmente
          const { data: allFriendships } = await supabase
            .from('friendships')
            .select('user1_id, user2_id')

          if (allFriendships) {
            const friendCounts: Record<string, number> = {}
            allFriendships.forEach((f: any) => {
              friendCounts[f.user1_id] = (friendCounts[f.user1_id] || 0) + 1
              friendCounts[f.user2_id] = (friendCounts[f.user2_id] || 0) + 1
            })

            const userIds = Object.keys(friendCounts).slice(0, 10)
            if (userIds.length > 0) {
              const { data: profiles } = await supabase
                .from('profiles')
                .select('id, username, avatar_url')
                .in('id', userIds)

              if (profiles) {
                leaderboard = profiles
                  .map((profile: any) => ({
                    rank: 0,
                    userId: profile.id,
                    username: profile.username,
                    avatarUrl: profile.avatar_url,
                    value: friendCounts[profile.id] || 0,
                    type: 'friends'
                  }))
                  .sort((a, b) => b.value - a.value)
                  .slice(0, 5)
                  .map((item, index) => ({ ...item, rank: index + 1 }))
              }
            }
          }
        }
        break

      case 'win_rate':
        // Top 5 jugadores con mejor ratio de victorias (mínimo 5 partidas)
        const { data: winRateData, error: winRateError } = await supabase
          .rpc('get_top_players_by_win_rate', { limit_count: 5, min_games: 5 })

        if (!winRateError && winRateData) {
          leaderboard = winRateData.map((item: any, index: number) => ({
            rank: index + 1,
            userId: item.user_id,
            username: item.username,
            avatarUrl: item.avatar_url,
            value: Math.round(item.win_rate * 100) / 100,
            type: 'win_rate'
          }))
        }
        break

      case 'snake':
        const { data: snakeData, error: snakeError } = await supabase
          .rpc('get_snake_leaderboard', { limit_count: 5 })

        if (!snakeError && snakeData) {
          leaderboard = snakeData.map((item: any) => ({
            rank: item.rank,
            userId: item.user_id,
            username: item.username,
            avatarUrl: item.avatar_url,
            value: item.best_score,
            type: 'snake'
          }))
        }
        break

      default:
        return NextResponse.json({ error: 'Tipo de ranking inválido' }, { status: 400 })
    }

    return NextResponse.json({ leaderboard, type })
  } catch (error: any) {
    console.error('Error obteniendo leaderboard:', error)
    return NextResponse.json(
      { error: error.message || 'Error al obtener rankings' },
      { status: 500 }
    )
  }
}

