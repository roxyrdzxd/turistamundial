'use client'

import { useMemo, useState } from 'react'

interface Country {
  id: string
  name: string
  continent: string
  price: number
  position: number
}

interface Player {
  id: string
  user_id: string
  position: number
  color: string
  turn_order: number
  is_online?: boolean
  profile: {
    username: string
  }
}

interface PlayerCountry {
  country_id: string
  player_id: string
  houses: number
  hotels: number
  is_mortgaged: boolean
}

interface BoardOverviewProps {
  countries: Country[]
  players: Player[]
  currentUserId?: string | null
  currentTurn: number
  playerCountries?: PlayerCountry[]
}

const CONTINENT_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  'america': { bg: 'bg-red-100', border: 'border-red-500', text: 'text-red-800' },
  'europa': { bg: 'bg-blue-100', border: 'border-blue-500', text: 'text-blue-800' },
  'asia': { bg: 'bg-green-100', border: 'border-green-500', text: 'text-green-800' },
  'africa': { bg: 'bg-yellow-100', border: 'border-yellow-500', text: 'text-yellow-800' },
  'oceania': { bg: 'bg-purple-100', border: 'border-purple-500', text: 'text-purple-800' },
  'especial': { bg: 'bg-gray-100', border: 'border-gray-500', text: 'text-gray-800' },
  'blue': { bg: 'bg-blue-100', border: 'border-blue-500', text: 'text-blue-800' },
  'pink': { bg: 'bg-pink-100', border: 'border-pink-500', text: 'text-pink-800' },
  'orange': { bg: 'bg-orange-100', border: 'border-orange-500', text: 'text-orange-800' },
  'red': { bg: 'bg-red-100', border: 'border-red-500', text: 'text-red-800' },
  'yellow': { bg: 'bg-yellow-100', border: 'border-yellow-500', text: 'text-yellow-800' },
  'green': { bg: 'bg-green-100', border: 'border-green-500', text: 'text-green-800' },
  'purple': { bg: 'bg-purple-100', border: 'border-purple-500', text: 'text-purple-800' },
}

const PLAYER_COLORS: Record<string, string> = {
  red: '#ef4444',
  blue: '#3b82f6',
  green: '#10b981',
  yellow: '#eab308',
  purple: '#a855f7',
  orange: '#f97316',
  pink: '#ec4899',
  cyan: '#06b6d4',
}

const SPECIAL_SQUARES: Record<number, { name: string; emoji: string }> = {
  0: { name: 'Inicio', emoji: '🏁' },
  10: { name: 'Cárcel', emoji: '🚔' },
  20: { name: 'Aeropuerto', emoji: '✈️' },
  30: { name: 'Banco', emoji: '🏦' },
}

// Función para obtener el icono según el tipo de propiedad
const getPropertyIcon = (propertyType?: string): string => {
  switch (propertyType) {
    case 'city':
      return '🏙️' // Ciudad
    case 'stadium':
      return '🏟️' // Estadio
    case 'attraction':
      return '🎡' // Atracción turística
    case 'transport':
      return '🚇' // Transporte
    case 'service':
      return '⚡' // Servicio (AyD, CFE)
    case 'special':
      return '⭐' // Casilla especial
    default:
      return '🌍' // Por defecto (para compatibilidad con tablero tradicional)
  }
}

export default function BoardOverview({
  countries,
  players,
  currentUserId,
  currentTurn,
  playerCountries = [],
}: BoardOverviewProps) {
  // Estado para el continente seleccionado (filtro)
  const [selectedContinent, setSelectedContinent] = useState<string | null>(null)

  // Organizar países por continente
  const countriesByContinent = useMemo(() => {
    const grouped: Record<string, Country[]> = {}
    countries.forEach(country => {
      if (!grouped[country.continent]) {
        grouped[country.continent] = []
      }
      grouped[country.continent].push(country)
    })
    return grouped
  }, [countries])

  // Obtener jugadores en cada posición
  const playersByPosition = useMemo(() => {
    const grouped: Record<number, Player[]> = {}
    players.forEach(player => {
      if (!grouped[player.position]) {
        grouped[player.position] = []
      }
      grouped[player.position].push(player)
    })
    return grouped
  }, [players])

  // Obtener países comprados por jugador
  const ownedCountries = useMemo(() => {
    const owned: Record<string, PlayerCountry> = {}
    playerCountries.forEach(pc => {
      owned[pc.country_id] = pc
    })
    return owned
  }, [playerCountries])

  const getContinentColor = (continent: string) => {
    return CONTINENT_COLORS[continent] || CONTINENT_COLORS['especial']
  }

  const getPlayerColor = (color: string) => {
    return PLAYER_COLORS[color] || '#6b7280'
  }

  const getPlayersAtPosition = (position: number) => {
    return playersByPosition[position] || []
  }

  const isCountryOwned = (countryId: string) => {
    return ownedCountries[countryId]
  }

  const getOwner = (countryId: string) => {
    const playerCountry = ownedCountries[countryId]
    if (!playerCountry) return null
    return players.find(p => p.id === playerCountry.player_id)
  }

  // Ordenar países por posición para mostrar el tablero en orden
  const sortedCountries = useMemo(() => {
    return [...countries].sort((a, b) => a.position - b.position)
  }, [countries])

  // Filtrar países por continente seleccionado
  const filteredCountries = useMemo(() => {
    if (!selectedContinent) return sortedCountries
    return sortedCountries.filter(country => country.continent === selectedContinent)
  }, [sortedCountries, selectedContinent])

  // Función para alternar el filtro de continente
  const toggleContinentFilter = (continent: string) => {
    if (selectedContinent === continent) {
      setSelectedContinent(null) // Deseleccionar si ya está seleccionado
    } else {
      setSelectedContinent(continent) // Seleccionar el continente
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 overflow-hidden">
      <h3 className="text-xl font-bold mb-4 text-gray-900">Vista del Tablero</h3>
      
      {/* Tablero - 40 casillas en grid */}
      <div className="relative w-full max-w-5xl mx-auto overflow-x-auto">
        {selectedContinent && (
          <div className="mb-4 p-3 bg-blue-50 border-2 border-blue-500 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-blue-700 font-semibold">🔍 Filtrando por:</span>
              <span className="text-blue-800 font-bold capitalize">{selectedContinent}</span>
              <span className="text-blue-600 text-sm">
                ({filteredCountries.length} {filteredCountries.length === 1 ? 'país' : 'países'})
              </span>
            </div>
            <button
              onClick={() => setSelectedContinent(null)}
              className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-semibold"
            >
              ✕ Limpiar filtro
            </button>
          </div>
        )}
        <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-1.5 sm:gap-2 min-w-[400px]">
          {Array.from({ length: 40 }).map((_, index) => {
            const country = sortedCountries.find(c => c.position === index)
            // Si hay un filtro activo, solo mostrar países del continente seleccionado o casillas especiales
            const shouldShow = !selectedContinent || 
              (country && country.continent === selectedContinent) || 
              SPECIAL_SQUARES[index]
            const specialSquare = SPECIAL_SQUARES[index]
            const playersAtPos = getPlayersAtPosition(index)
            const continentColor = country ? getContinentColor(country.continent) : getContinentColor('especial')
            const owner = country ? getOwner(country.id) : null
            const isOwned = country ? isCountryOwned(country.id) : false
            const isCurrentPlayer = currentUserId ? playersAtPos.some(p => p.user_id === currentUserId) : false

            // Si hay filtro y esta casilla no debe mostrarse, mostrarla atenuada
            if (!shouldShow) {
              return (
                <div
                  key={index}
                  className="relative aspect-square rounded-lg border-2 border-gray-200 bg-gray-100 opacity-30"
                >
                  <div className="absolute top-0 left-0 text-[9px] sm:text-xs font-bold text-gray-400 bg-white/90 rounded-br-md px-1.5 py-0.5">
                    {index}
                  </div>
                </div>
              )
            }

            return (
              <div
                key={index}
                className={`
                  relative aspect-square rounded-lg border-2 p-1.5 sm:p-2
                  ${country ? continentColor.border : 'border-gray-400'}
                  ${country ? continentColor.bg : 'bg-white'}
                  transition-all hover:scale-110 hover:shadow-xl hover:z-10
                  ${isCurrentPlayer ? 'ring-4 ring-blue-500 ring-offset-2 shadow-xl' : ''}
                  ${isOwned && owner ? 'shadow-md' : 'shadow-sm'}
                `}
              >
                {/* Número de posición */}
                <div className="absolute top-0 left-0 text-[9px] sm:text-xs font-bold text-gray-700 bg-white/90 rounded-br-md px-1.5 py-0.5 shadow-sm border border-gray-200">
                  {index}
                </div>

                {/* Contenido de la casilla */}
                <div className="h-full flex flex-col items-center justify-center text-center">
                  {specialSquare ? (
                    <>
                      <div className="text-xl sm:text-3xl mb-1 drop-shadow-sm">{specialSquare.emoji}</div>
                      <div className="text-[9px] sm:text-xs font-bold text-gray-800 leading-tight px-1">
                        {specialSquare.name}
                      </div>
                    </>
                  ) : country ? (
                    <>
                      <div className="flex items-center justify-center gap-1 mb-0.5">
                        <span className="text-[10px] sm:text-sm">{getPropertyIcon(country.property_type)}</span>
                        <div className={`text-[9px] sm:text-xs font-bold ${continentColor.text} leading-tight px-1 line-clamp-2`}>
                          {country.name}
                        </div>
                      </div>
                      <div className="text-[8px] sm:text-[10px] font-semibold text-gray-700 bg-white/60 rounded px-1.5 py-0.5">
                        ${country.price.toLocaleString()}
                      </div>
                      {isOwned && owner && (
                        <div 
                          className="absolute bottom-0 left-0 right-0 h-1.5 rounded-b shadow-sm"
                          style={{ backgroundColor: getPlayerColor(owner.color) }}
                          title={`Propiedad de ${owner.profile.username}`}
                        />
                      )}
                    </>
                  ) : (
                    <div className="text-[8px] sm:text-xs text-gray-400">-</div>
                  )}

                  {/* Jugadores en esta posición */}
                  {playersAtPos.length > 0 && (
                    <div className="absolute -top-1.5 -right-1.5 flex gap-1 flex-wrap max-w-[70%] justify-end">
                      {playersAtPos.map((player, idx) => {
                        const isMyPlayer = currentUserId === player.user_id
                        const isCurrentTurn = player.turn_order === currentTurn
                        return (
                          <div
                            key={player.id}
                            className={`
                              w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 shadow-md
                              ${isMyPlayer ? 'border-blue-600 ring-2 ring-blue-300' : 'border-white'}
                              ${isCurrentTurn ? 'animate-pulse ring-2 ring-yellow-400' : ''}
                              ${!player.is_online ? 'opacity-50 grayscale' : ''}
                              transition-transform hover:scale-125
                            `}
                            style={{ backgroundColor: getPlayerColor(player.color) }}
                            title={`${player.profile.username}${isMyPlayer ? ' (Tú)' : ''}${!player.is_online ? ' (Desconectado)' : ''}`}
                          >
                            {isMyPlayer && (
                              <div className="w-full h-full flex items-center justify-center text-[7px] sm:text-[9px] font-bold text-white drop-shadow-sm">
                                T
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Leyenda de continentes */}
      <div className="mt-6 pt-5 border-t-2 border-gray-200">
        <h4 className="text-sm sm:text-base font-bold mb-4 text-gray-800 flex items-center gap-2">
          <span>🌍</span>
          Continentes
        </h4>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          {Object.entries(countriesByContinent).map(([continent, continentCountries]) => {
            const color = getContinentColor(continent)
            const isSelected = selectedContinent === continent
            return (
              <button
                key={continent}
                onClick={() => toggleContinentFilter(continent)}
                className={`
                  flex items-center gap-2.5 px-4 py-2 rounded-lg border-2 cursor-pointer
                  ${color.border} ${color.bg} shadow-sm hover:shadow-md transition-all
                  ${isSelected ? 'ring-4 ring-blue-500 ring-offset-2 scale-105' : 'hover:scale-105'}
                `}
                title={`Click para ${isSelected ? 'quitar el filtro' : 'filtrar por'} ${continent}`}
              >
                <div className={`w-5 h-5 rounded border-2 ${color.border} shadow-sm flex items-center justify-center`} style={{ backgroundColor: color.bg.replace('100', '300') }}>
                  {isSelected && <span className="text-white text-xs font-bold">✓</span>}
                </div>
                <span className={`text-xs sm:text-sm font-bold ${color.text} capitalize`}>
                  {continent} <span className="text-gray-600">({continentCountries.length})</span>
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Leyenda de jugadores */}
      <div className="mt-5 pt-5 border-t-2 border-gray-200">
        <h4 className="text-sm sm:text-base font-bold mb-4 text-gray-800 flex items-center gap-2">
          <span>👥</span>
          Jugadores
        </h4>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          {players.map(player => {
            const isMyPlayer = currentUserId === player.user_id
            const isCurrentTurn = player.turn_order === currentTurn
            return (
              <div
                key={player.id}
                className={`
                  flex items-center gap-2.5 px-4 py-2 rounded-lg border-2 shadow-sm hover:shadow-md transition-all
                  ${isMyPlayer ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-200' : 'border-gray-300 bg-gray-50'}
                  ${isCurrentTurn ? 'ring-2 ring-yellow-400 bg-yellow-50' : ''}
                  ${!player.is_online ? 'opacity-50 grayscale' : ''}
                `}
              >
                <div
                  className="w-5 h-5 rounded-full border-2 border-white shadow-sm"
                  style={{ backgroundColor: getPlayerColor(player.color) }}
                />
                <span className="text-xs sm:text-sm font-semibold text-gray-800">
                  {player.profile.username}
                  {isMyPlayer && <span className="ml-1 text-blue-700 font-bold">(Tú)</span>}
                  {isCurrentTurn && <span className="ml-1 text-yellow-600">⭐</span>}
                  {!player.is_online && <span className="ml-1 text-gray-500 text-xs">(Offline)</span>}
                </span>
                <span className="text-xs text-gray-600 font-medium bg-white/60 px-2 py-0.5 rounded">
                  Pos: {player.position}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

