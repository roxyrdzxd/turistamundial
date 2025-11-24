'use client'

import { useEffect, useState } from 'react'

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

interface GameBoardProps {
  countries: Country[]
  players: Player[]
  currentTurn: number
  playerCountries?: PlayerCountry[]
}

const CONTINENT_COLORS: Record<string, string> = {
  'america': '#ef4444',    // red
  'europa': '#3b82f6',     // blue
  'asia': '#10b981',      // green
  'africa': '#eab308',    // yellow
  'oceania': '#a855f7',   // purple
  'especial': '#6b7280',  // gray
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

export default function GameBoard({ countries, players, currentTurn, playerCountries = [] }: GameBoardProps) {
  const [animatedPositions, setAnimatedPositions] = useState<Record<string, number>>({})
  const [boardSize, setBoardSize] = useState(300)

  useEffect(() => {
    // Calcular tamaño del tablero basado en el viewport (mobile-first)
    const updateSize = () => {
      const vh = window.innerHeight
      const vw = window.innerWidth
      // Mobile-first: más pequeño en móviles
      if (vw < 640) {
        // Mobile
        const size = Math.min(vh * 0.4, vw * 0.95, 350)
        setBoardSize(size)
      } else if (vw < 1024) {
        // Tablet
        const size = Math.min(vh * 0.5, vw * 0.85, 500)
        setBoardSize(size)
      } else {
        // Desktop
        const size = Math.min(vh * 0.7, vw * 0.9, 800)
        setBoardSize(size)
      }
    }
    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [])

  useEffect(() => {
    // Animar cambios de posición
    players.forEach(player => {
      setAnimatedPositions(prev => ({
        ...prev,
        [player.id]: player.position
      }))
    })
  }, [players])

  // Organizar países en un tablero cuadrado estilo Monopoly
  // 11 casillas por lado, con esquinas más grandes
  const getPositionStyle = (position: number) => {
    const totalSpaces = 40
    const sideLength = 11 // casillas por lado (9 regulares + 2 esquinas)
    const cornerSize = boardSize * 0.15 // tamaño de las esquinas
    const regularSpaceSize = (boardSize - cornerSize * 2) / 9
    
    let x = 0
    let y = 0
    let width = regularSpaceSize
    let height = regularSpaceSize
    
    if (position === 0) {
      // Esquina inicio (inferior derecha)
      x = boardSize - cornerSize
      y = boardSize - cornerSize
      width = cornerSize
      height = cornerSize
    } else if (position <= 9) {
      // Lado inferior (derecha a izquierda)
      x = boardSize - cornerSize - (position * regularSpaceSize)
      y = boardSize - regularSpaceSize
    } else if (position === 10) {
      // Esquina cárcel (inferior izquierda)
      x = 0
      y = boardSize - cornerSize
      width = cornerSize
      height = cornerSize
    } else if (position <= 19) {
      // Lado izquierdo (abajo a arriba)
      x = 0
      y = boardSize - cornerSize - ((position - 10) * regularSpaceSize)
    } else if (position === 20) {
      // Esquina parking (superior izquierda)
      x = 0
      y = 0
      width = cornerSize
      height = cornerSize
    } else if (position <= 29) {
      // Lado superior (izquierda a derecha)
      x = cornerSize + ((position - 20) * regularSpaceSize)
      y = 0
    } else if (position === 30) {
      // Esquina ir a cárcel (superior derecha)
      x = boardSize - cornerSize
      y = 0
      width = cornerSize
      height = cornerSize
    } else {
      // Lado derecho (arriba a abajo)
      x = boardSize - regularSpaceSize
      y = cornerSize + ((position - 30) * regularSpaceSize)
    }
    
    return {
      left: `${x}px`,
      top: `${y}px`,
      width: `${width}px`,
      height: `${height}px`,
    }
  }

  const getPlayerPosition = (player: Player) => {
    const country = countries.find(c => c.position === player.position)
    if (!country) return null
    
    const posStyle = getPositionStyle(player.position)
    const spaceSize = boardSize / 11
    
    // Calcular offset para múltiples jugadores en la misma casilla
    const playersOnSameSpace = players.filter(p => p.position === player.position)
    const playerIndex = playersOnSameSpace.findIndex(p => p.id === player.id)
    const offsetX = (playerIndex % 2) * (spaceSize * 0.3)
    const offsetY = Math.floor(playerIndex / 2) * (spaceSize * 0.3)
    
    return {
      left: `calc(${posStyle.left} + ${offsetX}px)`,
      top: `calc(${posStyle.top} + ${offsetY}px)`,
    }
  }

  return (
    <div className="relative w-full flex items-center justify-center p-2 sm:p-4" style={{ minHeight: `${boardSize}px` }}>
      <div 
        className="relative bg-gradient-to-br from-green-50 via-blue-50 to-yellow-50 rounded-xl sm:rounded-2xl shadow-xl sm:shadow-2xl overflow-hidden border-2 sm:border-4 border-gray-800 transform transition-transform duration-300"
        style={{ 
          width: `${boardSize}px`, 
          height: `${boardSize}px`,
          maxWidth: '100%',
          flexShrink: 0,
        }}
      >
        {/* Fondo decorativo */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.3),transparent_70%)]"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(16,185,129,0.3),transparent_70%)]"></div>
        </div>

        {/* Casillas del tablero */}
        {countries.map((country) => {
          const posStyle = getPositionStyle(country.position)
          const isCorner = country.position === 0 || country.position === 10 || 
                          country.position === 20 || country.position === 30
          const continentColor = CONTINENT_COLORS[country.continent] || '#6b7280'
          
          // Buscar si el país está comprado
          const ownedCountry = playerCountries.find(pc => pc.country_id === country.id)
          const owner = ownedCountry ? players.find(p => p.id === ownedCountry.player_id) : null
          const ownerColor = owner ? PLAYER_COLORS[owner.color] || undefined : undefined
          
          return (
            <div
              key={country.id}
              className="absolute border-2 border-gray-700 rounded-lg transition-all hover:scale-110 hover:z-20 hover:shadow-2xl"
              style={{
                ...posStyle,
                backgroundColor: ownedCountry && !ownedCountry.is_mortgaged 
                  ? `${ownerColor}30` 
                  : `${continentColor}20`,
                borderColor: ownedCountry && !ownedCountry.is_mortgaged 
                  ? ownerColor || continentColor
                  : continentColor,
                borderWidth: ownedCountry && !ownedCountry.is_mortgaged ? '3px' : '2px',
                boxShadow: isCorner 
                  ? `0 0 20px ${continentColor}40` 
                  : ownedCountry && !ownedCountry.is_mortgaged
                  ? `0 0 10px ${ownerColor}60`
                  : 'none',
              }}
              title={`${country.name} - $${country.price.toLocaleString()}${ownedCountry ? ` - Propiedad de ${owner?.profile.username || 'Jugador'}` : ''}`}
            >
              <div className="w-full h-full p-0.5 flex flex-col items-center justify-center text-xs font-semibold relative overflow-hidden group">
                {/* Fondo con gradiente */}
                <div 
                  className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity"
                  style={{ backgroundColor: ownedCountry && !ownedCountry.is_mortgaged && ownerColor ? ownerColor : continentColor }}
                />
                {/* Indicador de color del continente */}
                <div 
                  className="absolute top-0 left-0 right-0 h-1"
                  style={{ backgroundColor: ownedCountry && !ownedCountry.is_mortgaged && ownerColor ? ownerColor : continentColor }}
                />
                {/* Indicador de propiedad comprada */}
                {ownedCountry && !ownedCountry.is_mortgaged && owner && (
                  <div 
                    className="absolute bottom-0 left-0 right-0 h-1.5"
                    style={{ backgroundColor: ownerColor }}
                  />
                )}
                {/* Indicador de hipoteca */}
                {ownedCountry && ownedCountry.is_mortgaged && (
                  <div className="absolute inset-0 bg-gray-400 opacity-50 flex items-center justify-center">
                    <span className="text-[8px] font-bold text-white">H</span>
                  </div>
                )}
                {/* Contenido */}
                <div className="relative z-10 w-full h-full flex flex-col items-center justify-center">
                  <div 
                    className="w-3 h-3 rounded-full mb-0.5 shadow-md"
                    style={{ backgroundColor: ownedCountry && !ownedCountry.is_mortgaged ? ownerColor : continentColor }}
                  />
                  <span className="text-[8px] sm:text-[9px] leading-tight text-center text-gray-900 font-bold px-0.5">
                    {country.name.length > 8 ? country.name.substring(0, 8) + '...' : country.name}
                  </span>
                  <span className="text-[7px] sm:text-[8px] text-gray-700 mt-0.5 font-semibold">
                    ${(country.price / 1000).toFixed(0)}k
                  </span>
                  {/* Indicadores de casas/hoteles */}
                  {ownedCountry && !ownedCountry.is_mortgaged && (
                    <div className="flex gap-0.5 mt-0.5">
                      {ownedCountry.hotels > 0 ? (
                        <span className="text-[8px]">🏨</span>
                      ) : (
                        Array.from({ length: ownedCountry.houses }).map((_, i) => (
                          <span key={i} className="text-[6px]">🏠</span>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}

        {/* Casillas especiales (esquinas) */}
        {[
          { pos: 0, emoji: '🏁', label: 'Inicio', color: 'from-green-400 to-green-600' },
          { pos: 10, emoji: '🚔', label: 'Cárcel', color: 'from-red-400 to-red-600' },
          { pos: 20, emoji: '✈️', label: 'Aeropuerto', color: 'from-blue-400 to-blue-600' },
          { pos: 30, emoji: '🏦', label: 'Banco', color: 'from-yellow-400 to-yellow-600' },
        ].map((corner) => {
          const posStyle = getPositionStyle(corner.pos)
          
          return (
            <div
              key={`corner-${corner.pos}`}
              className={`absolute border-4 border-white rounded-xl bg-gradient-to-br ${corner.color} shadow-2xl z-10 transform hover:scale-105 transition-transform`}
              style={posStyle}
            >
              <div className="w-full h-full flex flex-col items-center justify-center text-white font-bold">
                <span className="text-4xl mb-2 drop-shadow-lg">{corner.emoji}</span>
                <span className="text-sm text-center px-2 drop-shadow-md">{corner.label}</span>
              </div>
            </div>
          )
        })}

        {/* Fichas de jugadores */}
        {players.map((player) => {
          const playerPos = getPlayerPosition(player)
          if (!playerPos) return null
          
          const isCurrentTurn = player.turn_order === currentTurn
          const playerColor = PLAYER_COLORS[player.color] || '#gray'
          
          return (
            <div
              key={player.id}
              className={`absolute z-30 transition-all duration-500 ease-out ${
                isCurrentTurn ? 'animate-pulse' : ''
              }`}
              style={{
                ...playerPos,
                transform: isCurrentTurn ? 'scale(1.2)' : 'scale(1)',
              }}
            >
              <div
                className="w-8 h-8 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white font-bold text-xs"
                style={{ 
                  backgroundColor: playerColor,
                  boxShadow: isCurrentTurn 
                    ? `0 0 20px ${playerColor}, 0 0 40px ${playerColor}80`
                    : `0 2px 8px rgba(0,0,0,0.3)`,
                }}
                title={player.profile.username}
              >
                {player.profile.username.charAt(0).toUpperCase()}
              </div>
              {isCurrentTurn && (
                <div className="absolute -top-2 -right-2 w-4 h-4 bg-yellow-400 rounded-full animate-ping" />
              )}
            </div>
          )
        })}

        {/* Centro del tablero */}
        <div 
          className="absolute bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 rounded-full shadow-2xl flex items-center justify-center text-white overflow-hidden"
          style={{
            left: `${boardSize * 0.25}px`,
            top: `${boardSize * 0.25}px`,
            width: `${boardSize * 0.5}px`,
            height: `${boardSize * 0.5}px`,
          }}
        >
          {/* Efecto de rotación animado */}
          <div className="absolute inset-0 bg-[conic-gradient(from_0deg,transparent,rgba(255,255,255,0.1),transparent)] animate-spin-slow"></div>
          
          {/* Contenido central */}
          <div className="relative z-10 text-center">
            <div className="text-7xl mb-3 animate-bounce-slow">🌍</div>
            <div className="text-2xl font-bold mb-1 drop-shadow-lg">TURISTA</div>
            <div className="text-2xl font-bold drop-shadow-lg">MUNDIAL</div>
            <div className="text-xs mt-2 opacity-80">Juego Virtual</div>
          </div>
        </div>

        {/* Efectos de partículas decorativas */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-blue-400 rounded-full opacity-30 animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${i * 0.5}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

