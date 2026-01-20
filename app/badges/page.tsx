'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import BadgeCard from '@/components/badges/BadgeCard'
import BadgeFilters from '@/components/badges/BadgeFilters'

interface Badge {
  id: string
  name: string
  description: string | null
  coins_reward: number
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  badge_url: string
  city: string | null
  region: string | null
  country: string | null
  is_collected: boolean
  total_collections: number
}

interface City {
  city: string
  region: string
  country: string
  badge_count: number
}

export default function BadgesPage() {
  const [badges, setBadges] = useState<Badge[]>([])
  const [cities, setCities] = useState<City[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedRarity, setSelectedRarity] = useState<string[]>([])
  const [selectedCity, setSelectedCity] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState('name')
  const [total, setTotal] = useState(0)
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null)

  useEffect(() => {
    fetchBadges()
    fetchCities()
  }, [search, selectedRarity, selectedCity, sortBy])

  const fetchBadges = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      if (selectedRarity.length > 0) params.append('rarity', selectedRarity.join(','))
      if (selectedCity) params.append('city', selectedCity)
      params.append('sort', sortBy)

      const response = await fetch(`/api/badges?${params.toString()}`)
      const data = await response.json()

      if (data.success) {
        setBadges(data.badges || [])
        setTotal(data.total || 0)
      }
    } catch (error) {
      console.error('Error al cargar insignias:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCities = async () => {
    try {
      const response = await fetch('/api/badges?cities=true')
      const data = await response.json()
      if (data.success && data.cities) {
        setCities(data.cities)
      }
    } catch (error) {
      console.error('Error al cargar ciudades:', error)
    }
  }

  const handleRarityToggle = (rarity: string) => {
    setSelectedRarity(prev =>
      prev.includes(rarity)
        ? prev.filter(r => r !== rarity)
        : [...prev, rarity]
    )
  }

  const handleReset = () => {
    setSearch('')
    setSelectedRarity([])
    setSelectedCity(null)
    setSortBy('name')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 pb-20 md:pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 mb-4 transition text-sm sm:text-base"
          >
            <span>←</span>
            <span>Volver al Dashboard</span>
          </Link>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Galería de Insignias</h1>
          <p className="text-white/70">Descubre todas las insignias disponibles y completa tu colección</p>
        </div>

        {/* Filtros */}
        <BadgeFilters
          search={search}
          selectedRarity={selectedRarity}
          selectedCity={selectedCity}
          sortBy={sortBy}
          cities={cities}
          onSearchChange={setSearch}
          onRarityToggle={handleRarityToggle}
          onCityChange={setSelectedCity}
          onSortChange={setSortBy}
          onReset={handleReset}
        />

        {/* Contador de resultados */}
        {!loading && (
          <div className="mb-4 text-white/70 text-sm">
            Mostrando {badges.length} de {total} insignias
          </div>
        )}

        {/* Grid de insignias */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-cyan-400 border-t-transparent mx-auto mb-4"></div>
              <p className="text-white/80">Cargando insignias...</p>
            </div>
          </div>
        ) : badges.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-2xl font-bold text-white mb-2">No se encontraron insignias</h3>
            <p className="text-white/70 mb-6">Intenta ajustar tus filtros de búsqueda</p>
            <button
              onClick={handleReset}
              className="px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg font-semibold transition"
            >
              Limpiar Filtros
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {badges.map((badge) => (
              <BadgeCard
                key={badge.id}
                badge={badge}
                onClick={() => setSelectedBadge(badge)}
              />
            ))}
          </div>
        )}

        {/* Modal de detalles (simple por ahora) */}
        {selectedBadge && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setSelectedBadge(null)}
          >
            <div
              className="bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 rounded-2xl p-6 max-w-md w-full border border-white/20"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-white">{selectedBadge.name}</h2>
                <button
                  onClick={() => setSelectedBadge(null)}
                  className="text-white/60 hover:text-white transition"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="flex justify-center mb-4">
                <div className="w-32 h-32 rounded-full border-4 border-white/30 bg-white/10 p-4">
                  <img
                    src={selectedBadge.badge_url}
                    alt={selectedBadge.name}
                    className="w-full h-full rounded-full object-cover"
                  />
                </div>
              </div>

              {selectedBadge.description && (
                <p className="text-white/80 mb-4 text-center">{selectedBadge.description}</p>
              )}

              <div className="space-y-2 text-sm text-white/70">
                <div className="flex justify-between">
                  <span>Recompensa:</span>
                  <span className="text-yellow-400 font-semibold">💰 {selectedBadge.coins_reward} TC</span>
                </div>
                {selectedBadge.city && (
                  <div className="flex justify-between">
                    <span>Ubicación:</span>
                    <span>{selectedBadge.city}{selectedBadge.region && `, ${selectedBadge.region}`}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Recolectada por:</span>
                  <span>{selectedBadge.total_collections} usuarios</span>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <Link
                  href="/explore"
                  className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-4 py-3 rounded-lg font-semibold text-center hover:from-cyan-600 hover:to-blue-700 transition"
                >
                  Ver en Mapa
                </Link>
                {selectedBadge.is_collected && (
                  <Link
                    href={`/badge/${selectedBadge.id}`}
                    className="flex-1 bg-gradient-to-r from-purple-500 to-pink-600 text-white px-4 py-3 rounded-lg font-semibold text-center hover:from-purple-600 hover:to-pink-700 transition"
                  >
                    Compartir
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
