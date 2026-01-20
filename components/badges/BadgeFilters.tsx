'use client'

import { useState } from 'react'

interface BadgeFiltersProps {
  search: string
  selectedRarity: string[]
  selectedCity: string | null
  sortBy: string
  cities: Array<{ city: string; region: string; country: string; badge_count: number }>
  onSearchChange: (value: string) => void
  onRarityToggle: (rarity: string) => void
  onCityChange: (city: string | null) => void
  onSortChange: (sort: string) => void
  onReset: () => void
}

export default function BadgeFilters({
  search,
  selectedRarity,
  selectedCity,
  sortBy,
  cities,
  onSearchChange,
  onRarityToggle,
  onCityChange,
  onSortChange,
  onReset
}: BadgeFiltersProps) {
  const [showFilters, setShowFilters] = useState(false)

  const rarityOptions = [
    { value: 'common', label: 'Común', color: 'bg-gray-500' },
    { value: 'rare', label: 'Raro', color: 'bg-blue-500' },
    { value: 'epic', label: 'Épico', color: 'bg-purple-500' },
    { value: 'legendary', label: 'Legendario', color: 'bg-yellow-500' }
  ]

  const sortOptions = [
    { value: 'name', label: 'Nombre' },
    { value: 'rarity', label: 'Rareza' },
    { value: 'coins', label: 'Recompensa' },
    { value: 'popularity', label: 'Popularidad' }
  ]

  const hasActiveFilters = selectedRarity.length > 0 || selectedCity !== null

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 mb-6">
      {/* Barra de búsqueda */}
      <div className="mb-4">
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar insignias..."
            className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 pl-10 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
          <svg
            className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/50"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Botón para mostrar/ocultar filtros */}
      <button
        onClick={() => setShowFilters(!showFilters)}
        className="w-full flex items-center justify-between bg-white/10 hover:bg-white/15 rounded-lg px-4 py-2 text-white transition mb-4"
      >
        <span className="font-semibold">Filtros</span>
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <span className="bg-cyan-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {selectedRarity.length + (selectedCity ? 1 : 0)}
            </span>
          )}
          <svg
            className={`w-5 h-5 transition-transform ${showFilters ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Panel de filtros (colapsable) */}
      {showFilters && (
        <div className="space-y-4 animate-in slide-in-from-top-2">
          {/* Filtro por rareza */}
          <div>
            <label className="block text-sm font-semibold text-white/80 mb-2">Rareza</label>
            <div className="flex flex-wrap gap-2">
              {rarityOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => onRarityToggle(option.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                    selectedRarity.includes(option.value)
                      ? `${option.color} text-white shadow-lg`
                      : 'bg-white/10 text-white/70 hover:bg-white/15'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Filtro por ciudad */}
          {cities.length > 0 && (
            <div>
              <label className="block text-sm font-semibold text-white/80 mb-2">Ciudad</label>
              <select
                value={selectedCity || ''}
                onChange={(e) => onCityChange(e.target.value || null)}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="">Todas las ciudades</option>
                {cities.map((city) => (
                  <option key={city.city} value={city.city} className="bg-slate-800">
                    {city.city} {city.region && `(${city.region})`} - {city.badge_count} insignias
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Ordenamiento */}
          <div>
            <label className="block text-sm font-semibold text-white/80 mb-2">Ordenar por</label>
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value} className="bg-slate-800">
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Botón reset */}
          {hasActiveFilters && (
            <button
              onClick={onReset}
              className="w-full bg-red-500/20 hover:bg-red-500/30 text-red-300 px-4 py-2 rounded-lg font-semibold transition border border-red-500/30"
            >
              Limpiar Filtros
            </button>
          )}
        </div>
      )}
    </div>
  )
}
