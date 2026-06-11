'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/contexts/ToastContext'
import Link from 'next/link'
import AvatarDisplay from '@/components/avatar/AvatarDisplay'

interface LeaderboardEntry {
  rank: number
  userId: string
  username: string
  avatarUrl: string | null
  value: number
  type: string
}

interface Leaderboard {
  coins: LeaderboardEntry[]
  games: LeaderboardEntry[]
  wins: LeaderboardEntry[]
  monopolies: LeaderboardEntry[]
  friends: LeaderboardEntry[]
  winRate: LeaderboardEntry[]
  snake: LeaderboardEntry[]
}

export default function RecognitionPage() {
  const [leaderboards, setLeaderboards] = useState<Leaderboard>({
    coins: [],
    games: [],
    wins: [],
    monopolies: [],
    friends: [],
    winRate: [],
    snake: []
  })
  const [loading, setLoading] = useState(true)
  const toast = useToast()
  const supabase = createClient()

  useEffect(() => {
    fetchAllLeaderboards()
  }, [])

  const fetchAllLeaderboards = async () => {
    try {
      setLoading(true)
      const types = ['coins', 'games', 'wins', 'monopolies', 'friends', 'win_rate', 'snake']
      
      const results = await Promise.all(
        types.map(type => 
          fetch(`/api/recognition/leaderboard?type=${type}`)
            .then(res => res.json())
            .then(data => ({ type, data }))
            .catch(err => {
              console.error(`Error obteniendo ranking ${type}:`, err)
              return { type, data: { leaderboard: [] } }
            })
        )
      )

      const newLeaderboards: Leaderboard = {
        coins: [],
        games: [],
        wins: [],
        monopolies: [],
        friends: [],
        winRate: [],
        snake: []
      }

      results.forEach(({ type, data }) => {
        if (data.leaderboard) {
          switch (type) {
            case 'coins':
              newLeaderboards.coins = data.leaderboard
              break
            case 'games':
              newLeaderboards.games = data.leaderboard
              break
            case 'wins':
              newLeaderboards.wins = data.leaderboard
              break
            case 'monopolies':
              newLeaderboards.monopolies = data.leaderboard
              break
            case 'friends':
              newLeaderboards.friends = data.leaderboard
              break
            case 'win_rate':
              newLeaderboards.winRate = data.leaderboard
              break
            case 'snake':
              newLeaderboards.snake = data.leaderboard
              break
          }
        }
      })

      setLeaderboards(newLeaderboards)
    } catch (error) {
      console.error('Error obteniendo rankings:', error)
      toast.showError('Error al cargar rankings')
    } finally {
      setLoading(false)
    }
  }

  const formatValue = (value: number, type: string) => {
    switch (type) {
      case 'coins':
        return `${value.toLocaleString()} TC`
      case 'games':
        return `${value} partida${value !== 1 ? 's' : ''}`
      case 'wins':
        return `${value} victoria${value !== 1 ? 's' : ''}`
      case 'monopolies':
        return `${value} monopolio${value !== 1 ? 's' : ''}`
      case 'friends':
        return `${value} amigo${value !== 1 ? 's' : ''}`
      case 'win_rate':
        return `${(value * 100).toFixed(1)}%`
      case 'snake':
        return `${value.toLocaleString()} puntos`
      default:
        return value.toString()
    }
  }

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return '🥇'
      case 2:
        return '🥈'
      case 3:
        return '🥉'
      default:
        return `#${rank}`
    }
  }

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'from-yellow-400 to-yellow-600'
      case 2:
        return 'from-gray-300 to-gray-500'
      case 3:
        return 'from-orange-400 to-orange-600'
      default:
        return 'from-blue-400 to-blue-600'
    }
  }

  const LeaderboardCard = ({ 
    title, 
    entries, 
    type, 
    icon 
  }: { 
    title: string
    entries: LeaderboardEntry[]
    type: string
    icon: string
  }) => (
    <div className="bg-white/10 backdrop-blur-md rounded-xl shadow-lg p-4 sm:p-6 border border-white/20">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-3xl">{icon}</span>
        <h2 className="text-xl sm:text-2xl font-bold text-white">{title}</h2>
      </div>

      {entries.length === 0 ? (
        <div className="text-center py-8 text-white/60">
          <p>No hay datos disponibles aún</p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <div
              key={`${type}-${entry.userId}`}
              className={`flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r ${getRankColor(entry.rank)} text-white transition transform hover:scale-105 border border-white/20`}
            >
              <div className="text-xl font-bold w-10 text-center">
                {getRankIcon(entry.rank)}
              </div>
              
              <div className="flex-shrink-0">
                <AvatarDisplay
                  avatarUrl={entry.avatarUrl}
                  username={entry.username}
                  size="sm"
                  className="border-2 border-white"
                />
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm sm:text-base truncate">
                  {entry.username}
                </p>
                <p className="text-xs sm:text-sm opacity-90">
                  {formatValue(entry.value, type)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4"></div>
          <p className="text-white/80">Cargando rankings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 pb-20 md:pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 mb-4 transition text-sm sm:text-base"
          >
            <span>←</span>
            <span>Volver al Dashboard</span>
          </Link>
          <div className="text-center mb-6">
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-2">
              🏆 Salón de la Fama
            </h1>
            <p className="text-white/80 text-lg">
              Reconocemos a los mejores jugadores de Turix
            </p>
          </div>
        </div>

        {/* Leaderboards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <LeaderboardCard
            title="Top TuristaCoins"
            entries={leaderboards.coins}
            type="coins"
            icon="💰"
          />

          <LeaderboardCard
            title="Más Partidas"
            entries={leaderboards.games}
            type="games"
            icon="🎮"
          />

          <LeaderboardCard
            title="Más Victorias"
            entries={leaderboards.wins}
            type="wins"
            icon="👑"
          />

          <LeaderboardCard
            title="Más Monopolios"
            entries={leaderboards.monopolies}
            type="monopolies"
            icon="🌍"
          />

          <LeaderboardCard
            title="Más Amigos"
            entries={leaderboards.friends}
            type="friends"
            icon="👥"
          />

          <LeaderboardCard
            title="Mejor Ratio"
            entries={leaderboards.winRate}
            type="win_rate"
            icon="📊"
          />

          <LeaderboardCard
            title="Top Snake"
            entries={leaderboards.snake}
            type="snake"
            icon="🐍"
          />
        </div>

        {/* Info Section */}
        <div className="mt-8 bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">📋 Sobre los Rankings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
            <div>
              <p className="font-semibold text-gray-900 mb-1">💰 Top TuristaCoins</p>
              <p>Jugadores con el mayor balance de TuristaCoins acumulados.</p>
            </div>
            <div>
              <p className="font-semibold text-gray-900 mb-1">🎮 Más Partidas</p>
              <p>Jugadores que han participado en más sesiones de juego.</p>
            </div>
            <div>
              <p className="font-semibold text-gray-900 mb-1">👑 Más Victorias</p>
              <p>Jugadores con más partidas ganadas en total.</p>
            </div>
            <div>
              <p className="font-semibold text-gray-900 mb-1">🌍 Más Monopolios</p>
              <p>Jugadores que han conseguido más monopolios completos.</p>
            </div>
            <div>
              <p className="font-semibold text-gray-900 mb-1">👥 Más Amigos</p>
              <p>Jugadores con la mayor red de amistades en la plataforma.</p>
            </div>
            <div>
              <p className="font-semibold text-gray-900 mb-1">📊 Mejor Ratio</p>
              <p>Jugadores con el mejor porcentaje de victorias (mín. 5 partidas).</p>
            </div>
            <div>
              <p className="font-semibold text-gray-900 mb-1">🐍 Top Snake</p>
              <p>Jugadores con la mejor puntuacion en el modo arcade Snake Mundial.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

