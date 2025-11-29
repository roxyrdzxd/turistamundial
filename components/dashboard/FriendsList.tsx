'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useToast } from '@/contexts/ToastContext'
import ReportUserButton from '../game/ReportUserButton'
import AvatarDisplay from '@/components/avatar/AvatarDisplay'

interface Friend {
  id: string
  username: string
  avatar_url?: string | null
  is_online: boolean
  last_seen: string
}

export default function FriendsList() {
  const [friends, setFriends] = useState<Friend[]>([])
  const [requests, setRequests] = useState<{ received: any[]; sent: any[] }>({ received: [], sent: [] })
  const [loading, setLoading] = useState(true)
  const toast = useToast()

  useEffect(() => {
    fetchFriends()
    fetchRequests()
    // Actualizar cada 30 segundos
    const interval = setInterval(() => {
      fetchFriends()
      fetchRequests()
    }, 30000)
    
    return () => clearInterval(interval)
  }, [])

  const fetchFriends = async () => {
    try {
      const response = await fetch('/api/friends/list')
      const data = await response.json()
      if (response.ok) {
        setFriends(data.friends || [])
      }
    } catch (error) {
      console.error('Error obteniendo amigos:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchRequests = async () => {
    try {
      const response = await fetch('/api/friends/requests')
      const data = await response.json()
      if (response.ok) {
        setRequests(data)
      }
    } catch (error) {
      console.error('Error obteniendo solicitudes:', error)
    }
  }

  const handleRespondRequest = async (requestId: string, action: 'accept' | 'reject') => {
    try {
      const response = await fetch('/api/friends/respond-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requestId, action }),
      })

      const data = await response.json()

      if (response.ok) {
        toast.showSuccess(data.message || 'Solicitud procesada')
        fetchFriends()
        fetchRequests()
      } else {
        toast.showError(data.error || 'Error al procesar solicitud')
      }
    } catch (error: any) {
      toast.showError('Error al procesar solicitud')
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-bold mb-4 text-gray-900">Amigos</h3>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  const hasRequests = requests.received.length > 0 || requests.sent.length > 0

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h3 className="text-xl font-bold mb-4 text-gray-900 flex items-center gap-2">
        <span>👥</span>
        Amigos ({friends.length})
      </h3>

      {/* Solicitudes pendientes */}
      {hasRequests && (
        <div className="mb-4 pb-4 border-b border-gray-200">
          {requests.received.length > 0 && (
            <div className="mb-3">
              <p className="text-sm font-semibold text-gray-700 mb-2">Solicitudes recibidas:</p>
              <div className="space-y-2">
                {requests.received.map((req: any) => (
                  <div
                    key={req.id}
                    className="flex items-center justify-between p-2 bg-blue-50 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <AvatarDisplay
                        avatarUrl={req.sender?.avatar_url || null}
                        username={req.sender?.username || 'Usuario'}
                        size="sm"
                      />
                      <span className="text-sm font-medium">{req.sender?.username}</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRespondRequest(req.id, 'accept')}
                        className="px-3 py-1 bg-green-600 text-white rounded text-xs font-semibold hover:bg-green-700"
                      >
                        ✓
                      </button>
                      <button
                        onClick={() => handleRespondRequest(req.id, 'reject')}
                        className="px-3 py-1 bg-red-600 text-white rounded text-xs font-semibold hover:bg-red-700"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Lista de amigos */}
      {friends.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-3xl">👤</span>
          </div>
          <p className="text-gray-600">Aún no tienes amigos</p>
          <p className="text-sm text-gray-500 mt-1">Envía solicitudes a jugadores en línea</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {friends.map((friend) => (
            <div
              key={friend.id}
              className="flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="relative flex-shrink-0">
                  <AvatarDisplay
                    avatarUrl={friend.avatar_url || null}
                    username={friend.username}
                    size="sm"
                    className="border-2 border-gray-300"
                  />
                  <div
                    className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white z-10 ${
                      friend.is_online ? 'bg-green-500' : 'bg-gray-400'
                    }`}
                  ></div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{friend.username}</p>
                  <p className="text-xs text-gray-500">
                    {friend.is_online ? 'En línea' : 'Desconectado'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href="/lobby/create"
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold transition"
                >
                  Invitar
                </Link>
                <ReportUserButton
                  reportedUserId={friend.id}
                  reportedUsername={friend.username}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

