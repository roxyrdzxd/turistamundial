'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import FriendRequestButton from './FriendRequestButton'

interface OnlineUser {
  id: string
  username: string
  avatar_url?: string | null
  is_online: boolean
  last_seen: string
}

export default function OnlineUsers() {
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchOnlineUsers = async () => {
      try {
        const response = await fetch('/api/users/online')
        const data = await response.json()
        
        if (response.ok) {
          setOnlineUsers(data.users || [])
        }
      } catch (error) {
        console.error('Error obteniendo usuarios en línea:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchOnlineUsers()
    // Actualizar cada 30 segundos
    const interval = setInterval(fetchOnlineUsers, 30000)
    
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-bold mb-4 text-gray-900">Jugadores en Línea</h3>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
          Jugadores en Línea
        </h3>
        <span className="text-sm text-gray-500">{onlineUsers.length} jugadores</span>
      </div>
      
      {onlineUsers.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-3xl">👥</span>
          </div>
          <p className="text-gray-600">No hay otros jugadores en línea</p>
          <p className="text-sm text-gray-500 mt-1">¡Sé el primero en crear una partida!</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {onlineUsers.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border border-blue-100 hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="relative flex-shrink-0">
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.username}
                      className="w-12 h-12 rounded-full border-2 border-blue-500 object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-green-500 flex items-center justify-center text-white font-bold text-lg border-2 border-blue-500">
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{user.username}</p>
                  <p className="text-xs text-gray-500">En línea ahora</p>
                </div>
              </div>
              <FriendRequestButton targetUserId={user.id} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

