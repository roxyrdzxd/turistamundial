'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

export default function JoinSessionPage() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.sessionId as string
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [session, setSession] = useState<any>(null)

  useEffect(() => {
    if (sessionId) {
      checkSession()
    }
  }, [sessionId])

  const checkSession = async () => {
    try {
      const response = await fetch(`/api/game/session/${sessionId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Sesión no encontrada')
      }

      setSession(data.session)

      // Verificar que la sesión esté en estado 'waiting'
      if (data.session.status !== 'waiting') {
        setError('Esta partida ya ha comenzado o ha finalizado')
        setLoading(false)
        return
      }

      // Verificar si hay espacio disponible
      if (data.session.current_players >= data.session.max_players) {
        setError('Esta partida está llena')
        setLoading(false)
        return
      }

      // Verificar si el usuario está autenticado
      const userResponse = await fetch('/api/auth/user')
      const userData = await userResponse.json()

      if (userData.data?.user) {
        // Usuario autenticado - verificar si ya está en la sesión
        const isInSession = data.session.players.some(
          (p: any) => p.user_id === userData.data.user.id
        )

        if (isInSession) {
          // Ya está en la sesión, redirigir al lobby
          router.push(`/lobby/${sessionId}`)
        } else {
          // Intentar unirse automáticamente
          joinSession()
        }
      } else {
        // Usuario no autenticado - mostrar opciones
        setLoading(false)
      }
    } catch (err: any) {
      setError(err.message || 'Error al verificar la sesión')
      setLoading(false)
    }
  }

  const joinSession = async () => {
    try {
      const response = await fetch('/api/game/join', {
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

      // Redirigir al lobby de la sesión
      router.push(`/lobby/${sessionId}`)
    } catch (err: any) {
      setError(err.message || 'Error al unirse a la sesión')
      setLoading(false)
    }
  }

  const handleLoginAndJoin = () => {
    // Guardar la sesión en localStorage para redirigir después del login
    localStorage.setItem('pendingJoinSession', sessionId)
    router.push('/login?redirect=/join/' + sessionId)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Verificando invitación...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold mb-4 text-red-600">Error</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link
            href="/lobby"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
          >
            Ver Partidas Disponibles
          </Link>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h1 className="text-2xl font-bold mb-4">Sesión no encontrada</h1>
          <p className="text-gray-600 mb-6">La sesión que buscas no existe o ha sido eliminada.</p>
          <Link
            href="/lobby"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
          >
            Ver Partidas Disponibles
          </Link>
        </div>
      </div>
    )
  }

  // Usuario no autenticado - mostrar opciones
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">🎮</div>
          <h1 className="text-2xl font-bold mb-2">Invitación a Partida</h1>
          <p className="text-gray-600">
            Has sido invitado a unirte a una partida de Turista Mundial
          </p>
        </div>

        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800">
            <span className="font-semibold">Anfitrión:</span> {session.host.username}
          </p>
          <p className="text-sm text-blue-800 mt-1">
            <span className="font-semibold">Jugadores:</span> {session.current_players} / {session.max_players}
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleLoginAndJoin}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 rounded-lg hover:from-blue-700 hover:to-purple-700 transition font-semibold"
          >
            Iniciar Sesión y Unirse
          </button>
          <Link
            href="/register"
            className="block w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-200 transition font-semibold text-center"
          >
            Crear Cuenta
          </Link>
          <Link
            href="/lobby"
            className="block w-full text-center text-gray-600 hover:text-gray-800 transition text-sm mt-2"
          >
            Ver todas las partidas
          </Link>
        </div>
      </div>
    </div>
  )
}

