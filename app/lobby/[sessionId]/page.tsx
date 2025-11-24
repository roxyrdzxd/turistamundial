'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { useToast } from '@/contexts/ToastContext'

interface Player {
  id: string
  user_id: string
  position: number
  money: number
  color: string
  turn_order: number
  is_bankrupt: boolean
  profile: {
    id: string
    username: string
    avatar_url: string | null
  }
}

interface Session {
  id: string
  host_id: string
  status: 'waiting' | 'active' | 'finished'
  max_players: number
  current_players: number
  current_turn: number
  created_at: string
  started_at: string | null
  host: {
    id: string
    username: string
  }
  players: Player[]
}

export default function SessionPage() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.sessionId as string

  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isHost, setIsHost] = useState(false)
  const [addingNPCs, setAddingNPCs] = useState(false)
  const toast = useToast()

  useEffect(() => {
    if (sessionId) {
      fetchSession()
      // Refrescar cada 2 segundos
      const interval = setInterval(fetchSession, 2000)
      return () => clearInterval(interval)
    }
  }, [sessionId])

  const fetchSession = async () => {
    try {
      const response = await fetch(`/api/game/session/${sessionId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al cargar la sesión')
      }

      setSession(data.session)
      
      // Verificar si el usuario actual es el host
      try {
        const userResponse = await fetch('/api/auth/user')
        const userData = await userResponse.json()
        setIsHost(data.session.host_id === userData.data?.user?.id)
      } catch {
        setIsHost(false)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAddNPCs = async () => {
    if (!isHost) return

    setAddingNPCs(true)
    try {
      console.log('[Client] Intentando agregar NPCs a sesión:', sessionId)
      const response = await fetch('/api/game/add-npcs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId, count: 3 }),
      })

      const data = await response.json()
      console.log('[Client] Respuesta del servidor:', data)

      if (!response.ok) {
        console.error('[Client] Error del servidor:', data)
        throw new Error(data.error || `Error al agregar NPCs: ${response.status}`)
      }

      console.log('[Client] NPCs agregados exitosamente:', data.npcsAdded)
      toast.showSuccess(data.message || `Se agregaron ${data.npcsAdded} NPC(s)`)
      
      // Refrescar la sesión después de un pequeño delay para asegurar que la BD se actualizó
      setTimeout(() => {
        fetchSession()
      }, 500)
    } catch (err: any) {
      console.error('[Client] Error completo:', err)
      toast.showError(`Error al agregar NPCs: ${err.message}`)
    } finally {
      setAddingNPCs(false)
    }
  }

  const handleStart = async () => {
    if (!isHost) return

    try {
      const response = await fetch('/api/game/start-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al iniciar la partida')
      }

      toast.showSuccess('¡Partida iniciada!')
      // Redirigir al juego
      router.push(`/game/${sessionId}`)
    } catch (err: any) {
      toast.showError(err.message)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando sesión...</p>
        </div>
      </div>
    )
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h1 className="text-2xl font-bold mb-4 text-red-600">Error</h1>
            <p className="text-gray-600 mb-4">{error || 'Sesión no encontrada'}</p>
            <Link
              href="/lobby"
              className="text-blue-600 hover:underline"
            >
              ← Volver al Lobby
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const canStart = session.status === 'waiting' && 
                   session.current_players >= 4 && 
                   isHost

  const slotsRemaining = session.max_players - session.current_players
  const isNPC = (player: Player) => player.user_id.startsWith('npc-') || player.profile.username.startsWith('Bot')

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/lobby"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4 transition"
          >
            <span>←</span>
            <span>Volver al Lobby</span>
          </Link>
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Sala de Espera</h1>
                <div className="flex items-center gap-4">
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    session.status === 'waiting' 
                      ? 'bg-yellow-100 text-yellow-800'
                      : session.status === 'active'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {session.status === 'waiting' ? '⏳ Esperando' : session.status === 'active' ? '▶️ En Curso' : '✅ Finalizada'}
                  </span>
                  <span className="text-gray-600">
                    👥 {session.current_players}/{session.max_players} jugadores
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Players Grid */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Jugadores</h2>
            {session.status === 'waiting' && slotsRemaining > 0 && (
              <span className="text-sm text-gray-500">
                {slotsRemaining} espacio{slotsRemaining > 1 ? 's' : ''} disponible{slotsRemaining > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {session.players.map((player) => (
              <div
                key={player.id}
                className="relative group p-4 rounded-xl border-2 transition-all hover:shadow-lg"
                style={{
                  borderColor: getColorHex(player.color),
                  backgroundColor: `${getColorHex(player.color)}10`,
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md"
                    style={{ backgroundColor: getColorHex(player.color) }}
                  >
                    {isNPC(player) ? '🤖' : player.profile.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-gray-900 truncate">{player.profile.username}</p>
                      {isNPC(player) && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">NPC</span>
                      )}
                      {player.turn_order === 0 && (
                        <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">👑 Host</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 flex items-center gap-1">
                      <span>💰</span>
                      <span className="font-semibold">${player.money.toLocaleString()}</span>
                    </p>
                  </div>
                </div>
              </div>
            ))}
            
            {/* Empty Slots */}
            {Array.from({ length: slotsRemaining }).map((_, index) => (
              <div
                key={`empty-${index}`}
                className="p-4 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center"
              >
                <span className="text-gray-400 text-sm">Espacio vacío</span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        {session.status === 'waiting' && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="mb-6">
              {session.current_players < 4 ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                  <p className="text-yellow-800 font-semibold mb-1">⚠️ Se necesitan más jugadores</p>
                  <p className="text-yellow-700 text-sm">
                    Se requieren al menos 4 jugadores para iniciar. Faltan {4 - session.current_players} jugador{4 - session.current_players > 1 ? 'es' : ''}.
                  </p>
                </div>
              ) : (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <p className="text-green-800 font-semibold">✅ La partida está lista para comenzar</p>
                </div>
              )}
            </div>

            {isHost && (
              <div className="flex flex-col sm:flex-row gap-4">
                {session.current_players < session.max_players && (
                  <button
                    onClick={handleAddNPCs}
                    disabled={addingNPCs || session.current_players >= session.max_players}
                    className="flex-1 bg-purple-600 text-white py-3 px-6 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-semibold flex items-center justify-center gap-2"
                  >
                    {addingNPCs ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        <span>Agregando NPCs...</span>
                      </>
                    ) : (
                      <>
                        <span>🤖</span>
                        <span>Agregar 3 NPCs</span>
                      </>
                    )}
                  </button>
                )}
                
                {canStart && (
                  <button
                    onClick={handleStart}
                    className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 px-6 rounded-lg hover:from-green-700 hover:to-emerald-700 transition font-semibold text-lg shadow-lg"
                  >
                    🎮 Iniciar Partida
                  </button>
                )}
              </div>
            )}

            {!isHost && (
              <div className="text-center py-4">
                <p className="text-gray-600 mb-2">Esperando a que el host inicie la partida...</p>
                <div className="flex items-center justify-center gap-2 text-gray-400">
                  <div className="animate-pulse">●</div>
                  <div className="animate-pulse" style={{ animationDelay: '0.2s' }}>●</div>
                  <div className="animate-pulse" style={{ animationDelay: '0.4s' }}>●</div>
                </div>
              </div>
            )}
          </div>
        )}

        {session.status === 'active' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <Link
              href={`/game/${sessionId}`}
              className="block w-full bg-blue-600 text-white py-3 px-6 rounded-md hover:bg-blue-700 transition text-center text-lg font-semibold"
            >
              🎮 Ir al Juego
            </Link>
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

