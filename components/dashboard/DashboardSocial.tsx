'use client'

import { useEffect } from 'react'
import OnlineUsers from './OnlineUsers'
import FriendsList from './FriendsList'

export default function DashboardSocial() {
  useEffect(() => {
    // Actualizar estado online cuando el usuario está en el dashboard
    const updateOnlineStatus = async () => {
      try {
        await fetch('/api/users/update-online-status', {
          method: 'POST',
        })
      } catch (error) {
        console.error('Error actualizando estado online:', error)
      }
    }

    // Actualizar inmediatamente
    updateOnlineStatus()

    // Actualizar cada 30 segundos
    const interval = setInterval(updateOnlineStatus, 30000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      <OnlineUsers />
      <FriendsList />
    </div>
  )
}

