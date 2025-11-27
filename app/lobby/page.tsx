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
        // Si el error es que ya está en la sesión, redirigir de todas formas
        if (data.error && data.error.includes('Ya estás en esta sesión')) {
          toast.showToast('Ya estás en esta partida', 'info')
          router.push(`/lobby/${sessionId}`)
          return
        }
        throw new Error(data.error || 'Error al unirse a la sesión')
      }

      // Si ya estaba en la sesión pero se devolvió éxito, también redirigir
      if (data.alreadyInSession) {
        toast.showToast('Ya estás en esta partida', 'info')
        router.push(`/lobby/${sessionId}`)
        return
      }

      toast.showToast('Te has unido a la partida', 'success')
      router.push(`/lobby/${sessionId}`)
    } catch (err: any) {
      toast.showToast(err.message || 'Error al unirse a la sesión', 'error')
    }
  }

  const handleCopyInviteLink = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    
    const inviteLink = `${window.location.origin}/join/${sessionId}`
    
    try {
      await navigator.clipboard.writeText(inviteLink)
      toast.showToast('¡Link de invitación copiado al portapapeles!', 'success')
    } catch (err) {
      // Fallback para navegadores que no soportan clipboard API
      const textArea = document.createElement('textarea')
      textArea.value = inviteLink
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      document.body.appendChild(textArea)
      textArea.select()
      try {
        document.execCommand('copy')
        toast.showToast('¡Link de invitación copiado al portapapeles!', 'success')
      } catch (e) {
        toast.showToast('No se pudo copiar el link. Comparte este link manualmente: ' + inviteLink, 'error')
      }
      document.body.removeChild(textArea)
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 pb-20 md:pb-8">
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
                className="hidden md:inline-block bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-cyan-700 transition font-semibold shadow-lg"
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {sessions
              .filter((session) => {
                // Solo mostrar sesiones que estén esperando jugadores y no estén llenas
                return session.status === 'waiting' && session.current_players < session.max_players
              })
              .map((session) => {
                const isFull = session.current_players >= session.max_players
                const progress = (session.current_players / session.max_players) * 100
                const isHost = currentUserId === session.host_id
                const canJoin = !isFull && session.status === 'waiting'
              
              return (
                <div
                  key={session.id}
                  className={`bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border-2 ${
                    canJoin
                      ? 'border-transparent hover:border-green-500 cursor-pointer'
                      : 'border-gray-300 opacity-75'
                  }`}
                  onClick={() => canJoin && !isHost && handleJoin(session.id)}
                >
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-xl font-bold text-gray-900">
                            Partida de {session.host.username}
                          </h3>
                          {canJoin && (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded">
                              Disponible
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
                      {isHost && canJoin && (
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => handleCopyInviteLink(session.id, e)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Copiar link de invitación"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                          <button
                            onClick={(e) => handleClose(session.id, e)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Cerrar partida"
                          >
                            🚪
                          </button>
                        </div>
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

                    <div className="flex flex-col sm:flex-row gap-2">
                      {isHost && canJoin && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleClose(session.id, e)
                          }}
                          className="w-full sm:flex-1 bg-red-600 text-white py-2.5 sm:py-3 px-4 rounded-lg hover:bg-red-700 transition font-semibold shadow-lg text-sm sm:text-base"
                        >
                          🚪 Cerrar
                        </button>
                      )}
                      {isHost && canJoin ? (
                        <Link
                          href={`/lobby/${session.id}`}
                          className="w-full sm:flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-2.5 sm:py-3 px-4 rounded-lg hover:from-blue-700 hover:to-cyan-700 transition font-semibold shadow-lg text-sm sm:text-base text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          🎮 Entrar
                        </Link>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleJoin(session.id)
                          }}
                          disabled={!canJoin}
                          className={`w-full sm:flex-1 py-2.5 sm:py-3 px-4 rounded-lg font-semibold transition text-sm sm:text-base ${
                            !canJoin
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              : 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 shadow-lg'
                          }`}
                        >
                          {canJoin ? '✅ Unirse' : '❌ No disponible'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Botón flotante para crear partida (solo móvil) */}
      <Link
        href="/lobby/create"
        className="fixed bottom-20 right-4 z-40 md:hidden"
      >
        <button className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white w-16 h-16 rounded-full shadow-2xl hover:shadow-3xl transition-all duration-300 flex items-center justify-center transform hover:scale-110 active:scale-95 border-4 border-white">
          <span className="text-3xl">➕</span>
        </button>
        <p className="text-center text-xs font-semibold text-white mt-2 bg-black/50 rounded-full px-3 py-1">
          Crear Partida
        </p>
      </Link>
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
