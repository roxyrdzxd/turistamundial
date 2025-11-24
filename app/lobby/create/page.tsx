'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

function CreateLobbyContent() {
  const [maxPlayers, setMaxPlayers] = useState(8)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const addNPCs = searchParams.get('npcs') === 'true'

  const handleCreateWithNPCs = async () => {
    setLoading(true)
    setError(null)

    try {
      // Crear sesión
      const response = await fetch('/api/game/create-session', {
        method: 'POST',
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
      const response = await fetch('/api/game/create-session', {
        method: 'POST',
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="mb-6">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4 transition"
            >
              <span>←</span>
              <span>Volver al Dashboard</span>
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Crear Nueva Partida</h1>
            <p className="text-gray-600">Configura tu sesión de juego</p>
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
              <p className="font-semibold">Error</p>
              <p>{error}</p>
            </div>
          )}

          <div className="space-y-6 mb-8">
            <div>
              <label htmlFor="maxPlayers" className="block text-sm font-medium text-gray-700 mb-3">
                Número máximo de jugadores: <span className="text-blue-600 font-bold text-lg">{maxPlayers}</span>
              </label>
              <input
                id="maxPlayers"
                type="range"
                min="2"
                max="8"
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(Number(e.target.value))}
                className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-2">
                <span>2 (Mínimo)</span>
                <span>8 (Máximo)</span>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>💡 Tip:</strong> La partida comenzará cuando tengas al menos 2 jugadores.
                Puedes agregar NPCs automáticamente desde la sala de espera para empezar rápido.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={handleCreate}
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-3 px-6 rounded-lg hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-semibold shadow-lg"
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
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-semibold text-center"
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    }>
      <CreateLobbyContent />
    </Suspense>
  )
}
