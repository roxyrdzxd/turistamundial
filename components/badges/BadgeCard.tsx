'use client'

import Image from 'next/image'
import Link from 'next/link'

interface BadgeCardProps {
  badge: {
    id: string
    name: string
    description: string | null
    coins_reward: number
    rarity: 'common' | 'rare' | 'epic' | 'legendary'
    badge_url: string
    city: string | null
    region: string | null
    is_collected: boolean
    total_collections: number
  }
  onClick?: () => void
}

export default function BadgeCard({ badge, onClick }: BadgeCardProps) {
  const rarityColors = {
    common: {
      border: 'border-gray-400',
      bg: 'bg-gray-500/20',
      text: 'text-gray-300',
      name: 'Común'
    },
    rare: {
      border: 'border-blue-400',
      bg: 'bg-blue-500/20',
      text: 'text-blue-300',
      name: 'Raro'
    },
    epic: {
      border: 'border-purple-400',
      bg: 'bg-purple-500/20',
      text: 'text-purple-300',
      name: 'Épico'
    },
    legendary: {
      border: 'border-yellow-400',
      bg: 'bg-yellow-500/20',
      text: 'text-yellow-300',
      name: 'Legendario'
    }
  }

  const rarity = rarityColors[badge.rarity] || rarityColors.common

  return (
    <div
      onClick={onClick}
      className={`relative bg-white/10 backdrop-blur-md rounded-xl p-4 border-2 ${rarity.border} hover:bg-white/15 transition-all duration-300 cursor-pointer transform hover:scale-105 shadow-lg hover:shadow-xl ${
        badge.is_collected ? 'opacity-90' : ''
      }`}
    >
      {/* Indicador de recolectada */}
      {badge.is_collected && (
        <div className="absolute top-2 right-2 z-10">
          <div className="bg-green-500 rounded-full p-1.5 shadow-lg">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
      )}

      {/* Imagen de la medalla */}
      <div className="flex justify-center mb-3">
        <div className={`relative w-20 h-20 rounded-full border-3 ${rarity.border} ${rarity.bg} p-2 shadow-lg`}>
          <Image
            src={badge.badge_url}
            alt={badge.name}
            width={80}
            height={80}
            className="w-full h-full rounded-full object-cover"
            unoptimized
            onError={(e) => {
              e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"%3E%3Ccircle cx="32" cy="32" r="30" fill="%23ccc"/%3E%3C/svg%3E'
            }}
          />
        </div>
      </div>

      {/* Información */}
      <div className="text-center">
        <h3 className="font-bold text-white text-sm mb-1 line-clamp-1" title={badge.name}>
          {badge.name}
        </h3>
        
        {/* Badge de rareza */}
        <div className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold mb-2 ${rarity.bg} ${rarity.text} border ${rarity.border}`}>
          {rarity.name}
        </div>

        {/* Ubicación */}
        {badge.city && (
          <div className="flex items-center justify-center gap-1 text-xs text-white/70 mb-2">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="truncate">{badge.city}</span>
            {badge.region && <span className="text-white/50">, {badge.region}</span>}
          </div>
        )}

        {/* Recompensa y estadísticas */}
        <div className="flex items-center justify-center gap-3 text-xs">
          <div className="flex items-center gap-1 text-yellow-400">
            <span>💰</span>
            <span className="font-semibold">{badge.coins_reward} TC</span>
          </div>
          {badge.total_collections > 0 && (
            <div className="flex items-center gap-1 text-white/60">
              <span>👥</span>
              <span>{badge.total_collections}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
