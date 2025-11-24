'use client'

import { useMemo } from 'react'

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

export default function BoardOverview({
  countries,
  players,
  currentUserId,
  currentTurn,
  playerCountries = [],
}: BoardOverviewProps) {
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

  return (
    <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 overflow-hidden">
      <h3 className="text-xl font-bold mb-4 text-gray-900">Vista del Tablero</h3>
      
      {/* Tablero - 40 casillas en grid */}
      <div className="relative w-full max-w-5xl mx-auto overflow-x-auto">
        <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-1.5 sm:gap-2 min-w-[400px]">
          {Array.from({ length: 40 }).map((_, index) => {
            const country = sortedCountries.find(c => c.position === index)
            const specialSquare = SPECIAL_SQUARES[index]
            const playersAtPos = getPlayersAtPosition(index)
            const continentColor = country ? getContinentColor(country.continent) : getContinentColor('especial')
            const owner = country ? getOwner(country.id) : null
            const isOwned = country ? isCountryOwned(country.id) : false
            const isCurrentPlayer = currentUserId ? playersAtPos.some(p => p.user_id === currentUserId) : false

            return (
              <div
                key={index}
                className={`
                  relative aspect-square rounded-lg border-2 p-1 sm:p-2
                  ${country ? continentColor.border : 'border-gray-400'}
                  ${country ? continentColor.bg : 'bg-gray-50'}
                  transition-all hover:scale-105 hover:shadow-lg
                  ${isCurrentPlayer ? 'ring-4 ring-blue-400 ring-offset-2' : ''}
                `}
              >
                {/* Número de posición */}
                <div className="absolute top-0 left-0 text-[8px] sm:text-xs font-bold text-gray-600 bg-white/80 rounded-br px-1">
                  {index}
                </div>

                {/* Contenido de la casilla */}
                <div className="h-full flex flex-col items-center justify-center text-center">
                  {specialSquare ? (
                    <>
                      <div className="text-lg sm:text-2xl mb-1">{specialSquare.emoji}</div>
                      <div className="text-[8px] sm:text-xs font-semibold text-gray-800 leading-tight">
                        {specialSquare.name}
                      </div>
                    </>
                  ) : country ? (
                    <>
                      <div className={`text-[8px] sm:text-xs font-bold ${continentColor.text} leading-tight mb-1`}>
                        {country.name}
                      </div>
                      <div className="text-[7px] sm:text-[10px] text-gray-600">
                        ${country.price.toLocaleString()}
                      </div>
                      {isOwned && owner && (
                        <div 
                          className="absolute bottom-0 left-0 right-0 h-1 rounded-b"
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
                    <div className="absolute -top-1 -right-1 flex gap-0.5 flex-wrap max-w-[60%] justify-end">
                      {playersAtPos.map((player, idx) => {
                        const isMyPlayer = currentUserId === player.user_id
                        const isCurrentTurn = player.turn_order === currentTurn
                        return (
                          <div
                            key={player.id}
                            className={`
                              w-3 h-3 sm:w-4 sm:h-4 rounded-full border-2
                              ${isMyPlayer ? 'border-blue-600' : 'border-white'}
                              ${isCurrentTurn ? 'animate-pulse ring-2 ring-yellow-400' : ''}
                              ${!player.is_online ? 'opacity-50 grayscale' : ''}
                            `}
                            style={{ backgroundColor: getPlayerColor(player.color) }}
                            title={`${player.profile.username}${isMyPlayer ? ' (Tú)' : ''}${!player.is_online ? ' (Desconectado)' : ''}`}
                          >
                            {isMyPlayer && (
                              <div className="w-full h-full flex items-center justify-center text-[6px] sm:text-[8px] font-bold text-white">
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
      <div className="mt-6 pt-4 border-t border-gray-200">
        <h4 className="text-sm font-semibold mb-3 text-gray-700">Continentes</h4>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          {Object.entries(countriesByContinent).map(([continent, continentCountries]) => {
            const color = getContinentColor(continent)
            return (
              <div
                key={continent}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 ${color.border} ${color.bg}`}
              >
                <div className={`w-4 h-4 rounded border-2 ${color.border}`} style={{ backgroundColor: color.bg.replace('100', '300') }} />
                <span className={`text-xs sm:text-sm font-semibold ${color.text} capitalize`}>
                  {continent} ({continentCountries.length})
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Leyenda de jugadores */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <h4 className="text-sm font-semibold mb-3 text-gray-700">Jugadores</h4>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          {players.map(player => {
            const isMyPlayer = currentUserId === player.user_id
            const isCurrentTurn = player.turn_order === currentTurn
            const playerPos = getPlayersAtPosition(player.position)
            return (
              <div
                key={player.id}
                className={`
                  flex items-center gap-2 px-3 py-1.5 rounded-lg border-2
                  ${isMyPlayer ? 'border-blue-600 bg-blue-50' : 'border-gray-300 bg-gray-50'}
                  ${isCurrentTurn ? 'ring-2 ring-yellow-400' : ''}
                  ${!player.is_online ? 'opacity-50 grayscale' : ''}
                `}
              >
                <div
                  className="w-4 h-4 rounded-full border-2 border-white"
                  style={{ backgroundColor: getPlayerColor(player.color) }}
                />
                <span className="text-xs sm:text-sm font-semibold text-gray-800">
                  {player.profile.username}
                  {isMyPlayer && ' (Tú)'}
                  {isCurrentTurn && ' ⭐'}
                  {!player.is_online && ' (Offline)'}
                </span>
                <span className="text-xs text-gray-500">
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

