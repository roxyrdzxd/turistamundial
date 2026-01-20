'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface Stats {
  total_collected: number
  total_coins: number
  by_rarity: {
    common: number
    rare: number
    epic: number
    legendary: number
  }
  days_consecutive: number
  total_distance_km: number
  today_count: number
  week_count: number
  month_count: number
}

interface HistoryEntry {
  date: string
  count: number
  coins: number
}

interface LeaderboardEntry {
  user_id: string
  username: string
  total_collected: number
  total_coins: number
  rank: number
}

export default function ExploreStatsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<Stats | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setCurrentUserId(user.id)
      fetchStats()
    }
    checkAuth()
  }, [router, supabase])

  const fetchStats = async () => {
    try {
      setLoading(true)

      // Obtener estadísticas generales
      const statsResponse = await fetch('/api/explore/stats?type=general')
      const statsData = await statsResponse.json()
      if (statsData.success) {
        setStats(statsData.stats)
      }

      // Obtener historial
      const historyResponse = await fetch('/api/explore/stats?type=history&days=30')
      const historyData = await historyResponse.json()
      if (historyData.success) {
        setHistory(historyData.history)
      }

      // Obtener ranking
      const leaderboardResponse = await fetch('/api/explore/stats?type=leaderboard&limit=10')
      const leaderboardData = await leaderboardResponse.json()
      if (leaderboardData.success) {
        setLeaderboard(leaderboardData.leaderboard)
      }
    } catch (error) {
      console.error('Error al cargar estadísticas:', error)
    } finally {
      setLoading(false)
    }
  }

  const getRarityColor = (rarity: string): string => {
    switch (rarity) {
      case 'common':
        return '#10b981'
      case 'rare':
        return '#3b82f6'
      case 'epic':
        return '#8b5cf6'
      case 'legendary':
        return '#f59e0b'
      default:
        return '#6b7280'
    }
  }

  const getRarityName = (rarity: string): string => {
    switch (rarity) {
      case 'common':
        return 'Común'
      case 'rare':
        return 'Raro'
      case 'epic':
        return 'Épico'
      case 'legendary':
        return 'Legendario'
      default:
        return rarity
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Cargando estadísticas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-md shadow-md border-b border-white/20 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/explore"
                className="text-white hover:text-white/80 transition"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
              </Link>
              <h1 className="text-2xl font-bold text-white">Estadísticas de Exploración</h1>
            </div>
            <Link
              href="/explore"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
            >
              Volver al Mapa
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {stats && (
          <>
            {/* Métricas principales */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white/10 backdrop-blur-md rounded-xl shadow-lg p-6 border-l-4 border-green-400 border border-white/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white/70 mb-1">Total Recolectados</p>
                    <p className="text-3xl font-bold text-white">{stats.total_collected}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center border border-green-400/30">
                    <span className="text-2xl">💰</span>
                  </div>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-md rounded-xl shadow-lg p-6 border-l-4 border-yellow-400 border border-white/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white/70 mb-1">TuristaCoins Ganados</p>
                    <p className="text-3xl font-bold text-white">{stats.total_coins.toLocaleString()}</p>
                  </div>
                  <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center border border-yellow-400/30">
                    <span className="text-2xl">🪙</span>
                  </div>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-md rounded-xl shadow-lg p-6 border-l-4 border-blue-400 border border-white/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white/70 mb-1">Días Consecutivos</p>
                    <p className="text-3xl font-bold text-white">{stats.days_consecutive}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center border border-blue-400/30">
                    <span className="text-2xl">🔥</span>
                  </div>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-md rounded-xl shadow-lg p-6 border-l-4 border-purple-400 border border-white/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white/70 mb-1">Distancia Recorrida</p>
                    <p className="text-3xl font-bold text-white">{stats.total_distance_km.toFixed(1)}</p>
                    <p className="text-xs text-white/60 mt-1">kilómetros</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center border border-purple-400/30">
                    <span className="text-2xl">📍</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Estadísticas por período */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white/10 backdrop-blur-md rounded-xl shadow-lg p-6 border border-white/20">
                <div className="text-center">
                  <p className="text-sm text-white/70 mb-2">Hoy</p>
                  <p className="text-4xl font-bold text-white mb-1">{stats.today_count}</p>
                  <p className="text-xs text-white/60">tesoros</p>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-md rounded-xl shadow-lg p-6 border border-white/20">
                <div className="text-center">
                  <p className="text-sm text-white/70 mb-2">Esta Semana</p>
                  <p className="text-4xl font-bold text-white mb-1">{stats.week_count}</p>
                  <p className="text-xs text-white/60">tesoros</p>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-md rounded-xl shadow-lg p-6 border border-white/20">
                <div className="text-center">
                  <p className="text-sm text-white/70 mb-2">Este Mes</p>
                  <p className="text-4xl font-bold text-white mb-1">{stats.month_count}</p>
                  <p className="text-xs text-white/60">tesoros</p>
                </div>
              </div>
            </div>

            {/* Desglose por rareza */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl shadow-lg p-6 mb-8 border border-white/20">
              <h2 className="text-xl font-bold text-white mb-6">Desglose por Rareza</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {Object.entries(stats.by_rarity).map(([rarity, count]) => (
                  <div
                    key={rarity}
                    className="bg-white/5 rounded-lg p-4 border border-white/10"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div
                        className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                        style={{ backgroundColor: getRarityColor(rarity) }}
                      ></div>
                      <span className="text-sm font-semibold text-white">
                        {getRarityName(rarity)}
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-white">{count}</p>
                    <p className="text-xs text-white/60 mt-1">
                      {stats.total_collected > 0
                        ? `${((count / stats.total_collected) * 100).toFixed(1)}%`
                        : '0%'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Ranking de exploradores */}
        {leaderboard.length > 0 && (
          <div className="bg-white/10 backdrop-blur-md rounded-xl shadow-lg p-6 mb-8 border border-white/20">
            <h2 className="text-xl font-bold text-white mb-6">🏆 Ranking de Exploradores</h2>
            <div className="space-y-3">
              {leaderboard.map((entry, index) => (
                <div
                  key={entry.user_id}
                  className={`flex items-center justify-between p-4 rounded-lg ${
                    entry.user_id === currentUserId
                      ? 'bg-blue-500/20 border-2 border-blue-400'
                      : 'bg-white/5 border border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                        index === 0
                          ? 'bg-yellow-500'
                          : index === 1
                          ? 'bg-gray-400'
                          : index === 2
                          ? 'bg-orange-600'
                          : 'bg-gray-600'
                      }`}
                    >
                      {index < 3 ? (
                        <span className="text-lg">
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                        </span>
                      ) : (
                        <span className="text-sm">#{entry.rank}</span>
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-white">
                        {entry.username}
                        {entry.user_id === currentUserId && (
                          <span className="ml-2 text-xs bg-blue-500 px-2 py-0.5 rounded">Tú</span>
                        )}
                      </p>
                      <p className="text-xs text-white/60">
                        {entry.total_collected} tesoros • {entry.total_coins.toLocaleString()} TC
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Historial reciente (últimos 7 días) */}
        {history.length > 0 && (
          <div className="bg-white/10 backdrop-blur-md rounded-xl shadow-lg p-6 border border-white/20">
            <h2 className="text-xl font-bold text-white mb-6">📅 Actividad Reciente</h2>
            <div className="space-y-2">
              {history.slice(0, 7).map((entry) => (
                <div
                  key={entry.date}
                  className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10"
                >
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {new Date(entry.date).toLocaleDateString('es-ES', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-bold text-white">{entry.count} tesoros</p>
                      <p className="text-xs text-white/60">{entry.coins} TC</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
