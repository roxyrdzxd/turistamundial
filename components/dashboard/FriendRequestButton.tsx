'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/contexts/ToastContext'

interface FriendRequestButtonProps {
  targetUserId: string
}

export default function FriendRequestButton({ targetUserId }: FriendRequestButtonProps) {
  const [status, setStatus] = useState<'none' | 'pending' | 'friends' | 'loading'>('loading')
  const toast = useToast()

  useEffect(() => {
    checkFriendshipStatus()
  }, [targetUserId])

  const checkFriendshipStatus = async () => {
    try {
      // Verificar si ya son amigos
      const friendsResponse = await fetch('/api/friends/list')
      const friendsData = await friendsResponse.json()
      
      if (friendsData.friends?.some((f: any) => f.id === targetUserId)) {
        setStatus('friends')
        return
      }

      // Verificar si hay solicitud pendiente
      const requestsResponse = await fetch('/api/friends/requests')
      const requestsData = await requestsResponse.json()
      
      const hasPendingRequest = [
        ...(requestsData.received || []),
        ...(requestsData.sent || []),
      ].some((req: any) => 
        (req.sender?.id === targetUserId || req.receiver?.id === targetUserId) &&
        req.status === 'pending'
      )

      if (hasPendingRequest) {
        setStatus('pending')
      } else {
        setStatus('none')
      }
    } catch (error) {
      console.error('Error verificando estado de amistad:', error)
      setStatus('none')
    }
  }

  const handleSendRequest = async () => {
    try {
      const response = await fetch('/api/friends/send-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ receiverId: targetUserId }),
      })

      const data = await response.json()

      if (response.ok) {
        setStatus('pending')
        toast.showSuccess(data.message || 'Solicitud enviada')
      } else {
        toast.showError(data.error || 'Error al enviar solicitud')
      }
    } catch (error: any) {
      toast.showError('Error al enviar solicitud')
    }
  }

  if (status === 'loading') {
    return (
      <div className="w-8 h-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (status === 'friends') {
    return (
      <div className="flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-xs font-semibold">
        <span>✓</span>
        <span>Amigo</span>
      </div>
    )
  }

  if (status === 'pending') {
    return (
      <div className="flex items-center gap-1 px-3 py-1.5 bg-yellow-100 text-yellow-700 rounded-lg text-xs font-semibold">
        <span>⏳</span>
        <span>Pendiente</span>
      </div>
    )
  }

  return (
    <button
      onClick={handleSendRequest}
      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition shadow-sm hover:shadow-md"
    >
      + Amigo
    </button>
  )
}

