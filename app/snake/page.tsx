import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SnakeGame from '@/components/snake/SnakeGame'

const emptyStats = {
  best_score: 0,
  games_played: 0,
  total_score: 0,
  total_food: 0,
  longest_snake: 3,
  best_level: 1,
  average_score: 0,
  last_played_at: null as string | null,
  rank: null as number | null,
}

export default async function SnakePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const [{ data: profile }, { data: stats }, { data: leaderboard }] = await Promise.all([
    supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .maybeSingle(),
    supabase
      .from('snake_player_stats')
      .select('best_score, games_played, total_score, total_food, longest_snake, best_level, average_score, last_played_at')
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase.rpc('get_snake_leaderboard', { limit_count: 100 }),
  ])

  const rank = leaderboard?.find((entry: any) => entry.user_id === user.id)?.rank || null

  return (
    <SnakeGame
      userId={user.id}
      username={profile?.username || 'Jugador'}
      initialStats={{
        ...emptyStats,
        ...(stats || {}),
        rank,
      }}
    />
  )
}
