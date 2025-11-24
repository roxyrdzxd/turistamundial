'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useToast } from '@/contexts/ToastContext'

interface Session {
  id: string
  host_id: string
  status: string
  max_players: number
  current_players: number
  created_at: string
  host: {
    username: string
  }
  players: Array<{
    id: string
    color: string
    profile: {
      username: string
    }
  }>
}

export default function LobbyPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const router = useRouter()
  const toast = useToast()

  useEffect(() => {
    fetchUser()
    fetchSessions()
    // Refrescar cada 5 segundos
    const interval = setInterval(fetchSessions, 5000)
    return () => clearInterval(interval)
  }, [])

  const fetchUser = async () => {
    try {
      const response = await fetch('/api/auth/user')
      const data = await response.json()
      if (data.data?.user?.id) {
        setCurrentUserId(data.data.user.id)
      }
    } catch (err) {
      console.error('Error obteniendo usuario:', err)
    }
  }

  const fetchSessions = async () => {
    try {
      const response = await fetch('/api/game/sessions')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al cargar sesiones')
      }

      setSessions(data.sessions || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation() // Prevenir que se active el botón de unirse
    
    if (!confirm('¿Estás seguro de que quieres cerrar esta partida? Esta acción no se puede deshacer.')) {
      return
    }

    try {
      const response = await fetch('/api/game/close-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al cerrar la partida')
      }

      toast.showToast('Partida cerrada correctamente', 'success')
      // Refrescar la lista
      fetchSessions()
    } catch (err: any) {
      toast.showToast(err.message || 'Error al cerrar la partida', 'error')
    }
  }

  const handleJoin = async (sessionId: string) => {
    try {
      const response = await fetch('/api/game/join-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al unirse a la sesión')
      }

      toast.showSuccess('Te has unido a la partida')
      router.push(`/lobby/${sessionId}`)
    } catch (err: any) {
      toast.showError(err.message)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Cargando partidas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4 transition"
          >
            <span>←</span>
            <span>Volver al Dashboard</span>
          </Link>
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Buscar Partidas</h1>
                <p className="text-gray-600">Únete a una partida existente o crea una nueva</p>
              </div>
              <Link
                href="/lobby/create"
                className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-cyan-700 transition font-semibold shadow-lg"
              >
                + Crear Partida
              </Link>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
            <p className="font-semibold">Error</p>
            <p>{error}</p>
          </div>
        )}

        {sessions.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-5xl">🎮</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No hay partidas disponibles</h2>
            <p className="text-gray-600 mb-6">Sé el primero en crear una partida y comienza a jugar</p>
            <Link
              href="/lobby/create"
              className="inline-block bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-8 py-3 rounded-lg hover:from-blue-700 hover:to-cyan-700 transition font-semibold shadow-lg"
            >
              Crear Primera Partida
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sessions.map((session) => {
              const isFull = session.current_players >= session.max_players
              const progress = (session.current_players / session.max_players) * 100
              const isHost = currentUserId === session.host_id
              const isFinished = session.status === 'finished'
              
              return (
                <div
                  key={session.id}
                  className={`bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border-2 ${
                    isFinished 
                      ? 'border-gray-300 opacity-75' 
                      : 'border-transparent hover:border-blue-500'
                  }`}
                >
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-xl font-bold text-gray-900">
                            Partida de {session.host.username}
                          </h3>
                          {isFinished && (
                            <span className="px-2 py-0.5 bg-gray-200 text-gray-600 text-xs font-semibold rounded">
                              Finalizada
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">
                          Creada {new Date(session.created_at).toLocaleString('es-ES', { 
                            day: 'numeric', 
                            month: 'short', 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </p>
                      </div>
                      {isHost && !isFinished && (
                        <button
                          onClick={(e) => handleClose(session.id, e)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Cerrar partida"
                        >
                          🚪
                        </button>
                      )}
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-gray-600 font-semibold">
                          👥 {session.current_players}/{session.max_players} jugadores
                        </span>
                        <span className={`font-semibold ${
                          isFull ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {isFull ? 'Llena' : 'Disponible'}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isFull ? 'bg-red-500' : 'bg-gradient-to-r from-blue-500 to-green-500'
                          }`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Players List */}
                    <div className="mb-4">
                      <p className="text-sm text-gray-600 mb-2 font-semibold">Jugadores:</p>
                      <div className="flex flex-wrap gap-2">
                        {session.players.map((player) => (
                          <span
                            key={player.id}
                            className="px-3 py-1 bg-gray-100 rounded-lg text-xs font-medium flex items-center gap-1"
                            style={{
                              borderLeft: `3px solid ${getColorHex(player.color)}`,
                            }}
                          >
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: getColorHex(player.color) }}
                            />
                            {player.profile.username}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {isHost && !isFinished && (
                        <button
                          onClick={(e) => handleClose(session.id, e)}
                          className="flex-1 bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 transition font-semibold shadow-lg"
                        >
                          🚪 Cerrar
                        </button>
                      )}
                      <button
                        onClick={() => handleJoin(session.id)}
                        disabled={isFull || isFinished}
                        className={`flex-1 py-3 px-4 rounded-lg font-semibold transition ${
                          isFull || isFinished
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 shadow-lg'
                        }`}
                      >
                        {isFinished ? '✅ Finalizada' : isFull ? '❌ Llena' : '✅ Unirse'}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function getColorHex(color: string): string {
  const colors: Record<string, string> = {
    red: '#ef4444',
    blue: '#3b82f6',
    green: '#10b981',
    yellow: '#eab308',
    purple: '#a855f7',
    orange: '#f97316',
    pink: '#ec4899',
    cyan: '#06b6d4',
  }
  return colors[color] || '#gray'
}
