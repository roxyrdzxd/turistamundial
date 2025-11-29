'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Lottie from 'lottie-react'

interface AvatarDisplayProps {
  avatarUrl: string | null
  username?: string | null
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export default function AvatarDisplay({ 
  avatarUrl, 
  username, 
  size = 'md',
  className = '' 
}: AvatarDisplayProps) {
  const [animationData, setAnimationData] = useState<any>(null)
  const [isLottie, setIsLottie] = useState(false)
  const [loading, setLoading] = useState(true)

  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-32 h-32',
    lg: 'w-48 h-48',
    xl: 'w-64 h-64'
  }

  useEffect(() => {
    if (!avatarUrl) {
      setLoading(false)
      return
    }

    // Verificar si es una URL de Lottie (JSON)
    if (avatarUrl.endsWith('.json') || avatarUrl.includes('lotties')) {
      setIsLottie(true)
      setLoading(true)
      
      fetch(avatarUrl)
        .then(res => res.json())
        .then(data => {
          setAnimationData(data)
          setLoading(false)
        })
        .catch(err => {
          console.error('Error cargando animación Lottie:', err)
          setIsLottie(false)
          setLoading(false)
        })
    } else {
      setIsLottie(false)
      setLoading(false)
    }
  }, [avatarUrl])

  if (loading) {
    return (
      <div className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center ${className}`}>
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
      </div>
    )
  }

  if (!avatarUrl) {
    return (
      <div className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center ${className}`}>
        <span className="text-white text-2xl font-bold">
          {username ? username.charAt(0).toUpperCase() : '👤'}
        </span>
      </div>
    )
  }

  if (isLottie && animationData) {
    return (
      <div className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-blue-400 to-purple-400 p-1 ${className}`}>
        <div className="w-full h-full rounded-full overflow-hidden bg-white/10">
          <Lottie
            animationData={animationData}
            loop={true}
            autoplay={true}
            style={{ width: '100%', height: '100%' }}
          />
        </div>
      </div>
    )
  }

  // Imagen normal
  return (
    <div className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-blue-400 to-purple-400 p-1 ${className}`}>
      <Image
        src={avatarUrl}
        alt="Avatar"
        width={128}
        height={128}
        className="w-full h-full rounded-full object-cover"
        unoptimized
      />
    </div>
  )
}

