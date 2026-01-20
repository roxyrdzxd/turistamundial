'use client'

import { useState } from 'react'
import { useToast } from '@/contexts/ToastContext'

interface ShareBadgeModalProps {
  badge: {
    id: string
    treasure: {
      id: string
      name: string
      badge_url: string
      rarity: 'common' | 'rare' | 'epic' | 'legendary'
    }
  }
  userReferralCode: string
  username: string
  onClose: () => void
}

export default function ShareBadgeModal({ badge, userReferralCode, username, onClose }: ShareBadgeModalProps) {
  const [copied, setCopied] = useState(false)
  const toast = useToast()
  
  const shareUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/badge/${badge.treasure.id}?ref=${userReferralCode}&badge=${badge.treasure.id}`
    : ''
  
  const getRarityMessage = () => {
    switch (badge.treasure.rarity) {
      case 'common':
        return '¡Conseguí una medalla común!'
      case 'rare':
        return '¡Encontré una medalla rara! 🎉'
      case 'epic':
        return '¡Medalla épica conseguida! 🌟'
      case 'legendary':
        return '¡MEDALLA LEGENDARIA! 💎 ¡Increíble!'
      default:
        return '¡Conseguí una medalla en TuristaMundial!'
    }
  }
  
  const getRarityEmoji = () => {
    switch (badge.treasure.rarity) {
      case 'common':
        return '🏅'
      case 'rare':
        return '🎉'
      case 'epic':
        return '🌟'
      case 'legendary':
        return '💎'
      default:
        return '🏆'
    }
  }
  
  const shareText = `${getRarityMessage()} ${badge.treasure.name} - ¡Únete a TuristaMundial y explora el mundo! 🌍`
  
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      toast.showSuccess('¡Enlace copiado al portapapeles!')
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      // Fallback
      const textArea = document.createElement('textarea')
      textArea.value = shareUrl
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      document.body.appendChild(textArea)
      textArea.select()
      try {
        document.execCommand('copy')
        setCopied(true)
        toast.showSuccess('¡Enlace copiado al portapapeles!')
        setTimeout(() => setCopied(false), 2000)
      } catch (e) {
        toast.showError('Error al copiar enlace')
      }
      document.body.removeChild(textArea)
    }
  }
  
  const shareOnSocial = async (platform: 'facebook' | 'twitter' | 'whatsapp' | 'telegram') => {
    const encodedText = encodeURIComponent(shareText)
    const encodedUrl = encodeURIComponent(shareUrl)
    
    let shareUrl_platform = ''
    switch (platform) {
      case 'facebook':
        shareUrl_platform = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`
        break
      case 'twitter':
        shareUrl_platform = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`
        break
      case 'whatsapp':
        shareUrl_platform = `https://wa.me/?text=${encodedText}%20${encodedUrl}`
        break
      case 'telegram':
        shareUrl_platform = `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`
        break
    }
    
    // Registrar el share en la base de datos
    try {
      await fetch('/api/badge/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          treasure_id: badge.treasure.id,
          platform
        })
      })
    } catch (error) {
      // No bloquear el share si falla el tracking
      console.error('Error registrando share:', error)
    }
    
    window.open(shareUrl_platform, '_blank', 'width=600,height=400')
    toast.showSuccess(`Compartiendo en ${platform === 'whatsapp' ? 'WhatsApp' : platform === 'telegram' ? 'Telegram' : platform.charAt(0).toUpperCase() + platform.slice(1)}...`)
  }
  
  const rarityColors = {
    common: 'from-gray-400 to-gray-600',
    rare: 'from-blue-400 to-blue-600',
    epic: 'from-purple-400 to-purple-600',
    legendary: 'from-yellow-400 to-orange-500'
  }
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 rounded-2xl shadow-2xl p-6 sm:p-8 max-w-md w-full mx-4 border border-white/20"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Compartir Medalla</h2>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Preview de la medalla */}
        <div className={`bg-gradient-to-r ${rarityColors[badge.treasure.rarity]} rounded-xl p-6 mb-6 text-center`}>
          <div className="flex justify-center mb-4">
            <div className="w-24 h-24 rounded-full border-4 border-white/30 bg-white/10 p-2">
              <img 
                src={badge.treasure.badge_url} 
                alt={badge.treasure.name}
                className="w-full h-full rounded-full object-cover"
              />
            </div>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">{badge.treasure.name}</h3>
          <p className="text-white/90 text-sm capitalize">{badge.treasure.rarity}</p>
          <p className="text-white/80 text-xs mt-2">Compartido por {username}</p>
        </div>
        
        {/* Botones de compartir */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => shareOnSocial('facebook')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2"
            >
              <span>📘</span>
              <span>Facebook</span>
            </button>
            <button
              onClick={() => shareOnSocial('twitter')}
              className="bg-sky-500 hover:bg-sky-600 text-white px-4 py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2"
            >
              <span>🐦</span>
              <span>Twitter</span>
            </button>
            <button
              onClick={() => shareOnSocial('whatsapp')}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2"
            >
              <span>💬</span>
              <span>WhatsApp</span>
            </button>
            <button
              onClick={() => shareOnSocial('telegram')}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2"
            >
              <span>✈️</span>
              <span>Telegram</span>
            </button>
          </div>
          
          {/* Copiar enlace */}
          <div className="flex gap-2">
            <input
              type="text"
              value={shareUrl}
              readOnly
              className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white text-sm"
            />
            <button
              onClick={copyToClipboard}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                copied
                  ? 'bg-green-600 text-white'
                  : 'bg-cyan-600 hover:bg-cyan-700 text-white'
              }`}
            >
              {copied ? '✓ Copiado' : '📋 Copiar'}
            </button>
          </div>
        </div>
        
        {/* Info sobre referidos */}
        <div className="mt-6 bg-green-500/20 rounded-lg p-4 border border-green-400/30">
          <p className="text-sm text-green-200">
            💰 <strong>Bonus:</strong> Si alguien se registra usando tu enlace, recibirás 200 TC + 50 TC extra por compartir esta medalla
          </p>
        </div>
      </div>
    </div>
  )
}
