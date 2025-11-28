'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

interface Board {
  id: string
  name: string
  description: string | null
}

function CreateLobbyContent() {
  const [maxPlayers, setMaxPlayers] = useState(8)
  const [selectedBoardId, setSelectedBoardId] = useState<string>('')
  const [boards, setBoards] = useState<Board[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingBoards, setLoadingBoards] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const addNPCs = searchParams.get('npcs') === 'true'

  useEffect(() => {
    fetchBoards()
  }, [])

  const fetchBoards = async () => {
    try {
      const response = await fetch('/api/game/boards')
      const data = await response.json()
      if (data.boards && data.boards.length > 0) {
        setBoards(data.boards)
        // Seleccionar el primer tablero por defecto
        setSelectedBoardId(data.boards[0].id)
      }
    } catch (err) {
      console.error('Error obteniendo tableros:', err)
    } finally {
      setLoadingBoards(false)
    }
  }

  const handleCreateWithNPCs = async () => {
    setLoading(true)
    setError(null)

    try {
      if (!selectedBoardId) {
        throw new Error('Por favor selecciona un tablero')
      }

      // Crear sesión
      const response = await fetch('/api/game/create-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ boardId: selectedBoardId, maxPlayers }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al crear la sesión')
      }

      const sessionId = data.session.id

      // Agregar NPCs automáticamente
      const npcResponse = await fetch('/api/game/add-npcs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId, count: 3 }),
      })

      if (!npcResponse.ok) {
        console.warn('No se pudieron agregar NPCs, pero la sesión se creó')
      }

      // Redirigir a la página de la sesión
      router.push(`/lobby/${sessionId}`)
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  useEffect(() => {
    if (addNPCs) {
      // Si viene con el parámetro npcs, crear y agregar NPCs automáticamente
      handleCreateWithNPCs()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addNPCs])

  const handleCreate = async () => {
    setLoading(true)
    setError(null)

    try {
      if (!selectedBoardId) {
        throw new Error('Por favor selecciona un tablero')
      }

      const response = await fetch('/api/game/create-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ boardId: selectedBoardId, maxPlayers }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al crear la sesión')
      }

      // Redirigir a la página de la sesión
      router.push(`/lobby/${data.session.id}`)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white/10 backdrop-blur-md rounded-xl shadow-lg p-8 border border-white/20">
          <div className="mb-6">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 mb-4 transition"
            >
              <span>←</span>
              <span>Volver al Dashboard</span>
            </Link>
            <h1 className="text-3xl font-bold text-white mb-2">Crear Nueva Partida</h1>
            <p className="text-white/80">Configura tu sesión de juego</p>
          </div>

          {error && (
            <div className="bg-red-500/20 border-l-4 border-red-400 text-red-200 px-4 py-3 rounded-lg mb-6 backdrop-blur-sm">
              <p className="font-semibold">Error</p>
              <p>{error}</p>
            </div>
          )}

          <div className="space-y-6 mb-8">
            {loadingBoards ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mx-auto"></div>
                <p className="text-white/80 mt-2">Cargando tableros...</p>
              </div>
            ) : (
              <div>
                <label htmlFor="board" className="block text-sm font-medium text-white mb-3">
                  Seleccionar Tablero
                </label>
                <select
                  id="board"
                  value={selectedBoardId}
                  onChange={(e) => setSelectedBoardId(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-white/20 rounded-xl focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/30 transition-all duration-300 bg-white/10 backdrop-blur-sm text-white"
                  required
                >
                  {boards.map((board) => (
                    <option key={board.id} value={board.id} className="bg-slate-900">
                      {board.name} {board.description && `- ${board.description}`}
                    </option>
                  ))}
                </select>
                {selectedBoardId && (
                  <p className="mt-2 text-xs text-white/60">
                    {boards.find(b => b.id === selectedBoardId)?.description || ''}
                  </p>
                )}
              </div>
            )}

            <div>
              <label htmlFor="maxPlayers" className="block text-sm font-medium text-white mb-3">
                Número máximo de jugadores: <span className="text-cyan-400 font-bold text-lg">{maxPlayers}</span>
              </label>
              <input
                id="maxPlayers"
                type="range"
                min="2"
                max="8"
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(Number(e.target.value))}
                className="w-full h-3 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
              <div className="flex justify-between text-xs text-white/60 mt-2">
                <span>2 (Mínimo)</span>
                <span>8 (Máximo)</span>
              </div>
            </div>

            <div className="bg-cyan-500/20 border border-cyan-400/30 rounded-lg p-4">
              <p className="text-sm text-cyan-200">
                <strong>💡 Tip:</strong> La partida comenzará cuando tengas al menos 2 jugadores.
                Puedes agregar NPCs automáticamente desde la sala de espera para empezar rápido.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={handleCreate}
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 text-white py-3 px-6 rounded-lg hover:from-cyan-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-semibold shadow-lg"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Creando...
                </span>
              ) : (
                'Crear Partida'
              )}
            </button>
            <Link
              href="/dashboard"
              className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition font-semibold text-center border border-white/20"
            >
              Cancelar
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CreateLobbyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div>
      </div>
    }>
      <CreateLobbyContent />
    </Suspense>
  )
}
