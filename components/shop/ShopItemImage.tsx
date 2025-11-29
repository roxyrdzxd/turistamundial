'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Lottie from 'lottie-react'

interface ShopItemImageProps {
  imageUrl: string | null
  category: string
  fallbackIcon?: string
  className?: string
}

export default function ShopItemImage({ 
  imageUrl, 
  category,
  fallbackIcon = '🛍️',
  className = '' 
}: ShopItemImageProps) {
  const [animationData, setAnimationData] = useState<any>(null)
  const [isLottie, setIsLottie] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!imageUrl) {
      setLoading(false)
      return
    }

    // Verificar si es una URL de Lottie (JSON)
    if (imageUrl.endsWith('.json') || imageUrl.includes('lotties')) {
      setIsLottie(true)
      setLoading(true)
      
      fetch(imageUrl)
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
  }, [imageUrl])

  if (loading) {
    return (
      <div className={`w-full h-48 bg-gradient-to-br from-cyan-500/20 to-pink-500/20 flex items-center justify-center border-b border-white/20 ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    )
  }

  if (!imageUrl) {
    return (
      <div className={`w-full h-48 bg-gradient-to-br from-cyan-500/20 to-pink-500/20 flex items-center justify-center border-b border-white/20 ${className}`}>
        <span className="text-6xl">{fallbackIcon}</span>
      </div>
    )
  }

  if (isLottie && animationData) {
    return (
      <div className={`w-full h-48 bg-gradient-to-br from-cyan-500/20 to-pink-500/20 flex items-center justify-center border-b border-white/20 overflow-hidden ${className}`}>
        <div className="w-full h-full flex items-center justify-center">
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
    <Image
      src={imageUrl}
      alt="Item"
      width={400}
      height={192}
      className={`w-full h-48 object-cover ${className}`}
      unoptimized
    />
  )
}

