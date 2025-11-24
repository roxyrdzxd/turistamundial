'use client'

import { useState, useEffect } from 'react'

interface Country {
  id: string
  name: string
  continent: string
  price: number
  base_rent: number
  house_price: number
  hotel_price: number
  position: number
}

interface PlayerCountry {
  country_id: string
  player_id: string
  houses: number
  hotels: number
  is_mortgaged: boolean
}

interface Player {
  id: string
  user_id: string
  position: number
  money: number
  color: string
  profile: {
    username: string
  }
}

interface CountryCarouselProps {
  countries: Country[]
  players: Player[]
  currentPlayer: Player | null
  playerCountries: PlayerCountry[]
  onCountrySelect?: (country: Country) => void
  isMyTurn?: boolean
  onBuyCountry?: (countryId: string) => void
  onBuyPropertyFromPlayer?: (playerCountryId: string) => void
  onEndTurn?: () => void
}

const CONTINENT_COLORS: Record<string, string> = {
  'america': '#ef4444',
  'europa': '#3b82f6',
  'asia': '#10b981',
  'africa': '#eab308',
  'oceania': '#a855f7',
  'especial': '#6b7280',
}

const CONTINENT_NAMES: Record<string, string> = {
  'america': 'América',
  'europa': 'Europa',
  'asia': 'Asia',
  'africa': 'África',
  'oceania': 'Oceanía',
  'especial': 'Especial',
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

const SPECIAL_SQUARES: Record<number, { name: string; emoji: string; description: string }> = {
  0: { name: 'Inicio', emoji: '🏁', description: 'Recibes $200 al pasar' },
  10: { name: 'Cárcel', emoji: '🚔', description: 'Solo de visita' },
  20: { name: 'Aeropuerto', emoji: '✈️', description: 'Puedes viajar gratis' },
  30: { name: 'Banco', emoji: '🏦', description: 'Paga $200 de impuesto' },
}

export default function CountryCarousel({
  countries,
  players,
  currentPlayer,
  playerCountries,
  onCountrySelect,
  isMyTurn = false,
  onBuyCountry,
  onBuyPropertyFromPlayer,
  onEndTurn,
}: CountryCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [touchStart, setTouchStart] = useState(0)
  const [touchEnd, setTouchEnd] = useState(0)

  // Encontrar la casilla actual del jugador
  const currentPosition = currentPlayer?.position || 0
  const currentCountry = countries.find(c => c.position === currentPosition)
  const specialSquare = SPECIAL_SQUARES[currentPosition]

  // Ordenar países por posición
  const sortedCountries = [...countries].sort((a, b) => a.position - b.position)

  // Encontrar el índice de la casilla actual
  useEffect(() => {
    if (currentPlayer) {
      const index = sortedCountries.findIndex(c => c.position === currentPosition)
      if (index !== -1) {
        setCurrentIndex(index)
      }
    }
  }, [currentPlayer?.position, sortedCountries, currentPosition])

  // Navegación
  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? sortedCountries.length - 1 : prev - 1))
  }

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === sortedCountries.length - 1 ? 0 : prev + 1))
  }

  const goToCurrent = () => {
    console.log('goToCurrent called, currentPosition:', currentPosition)
    console.log('sortedCountries length:', sortedCountries.length)
    
    // Buscar la casilla exacta
    let index = sortedCountries.findIndex(c => c.position === currentPosition)
    
    // Si no se encuentra exacta, buscar la más cercana después
    if (index === -1) {
      index = sortedCountries.findIndex(c => c.position > currentPosition)
    }
    
    // Si aún no se encuentra, buscar la más cercana antes
    if (index === -1) {
      // Encontrar la última casilla antes de la posición actual
      for (let i = sortedCountries.length - 1; i >= 0; i--) {
        if (sortedCountries[i].position < currentPosition) {
          index = i
          break
        }
      }
    }
    
    // Si aún no se encuentra, ir al inicio
    if (index === -1) {
      index = 0
    }
    
    console.log('Setting currentIndex to:', index)
    setCurrentIndex(index)
  }

  // Swipe gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return
    
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > 50
    const isRightSwipe = distance < -50

    if (isLeftSwipe) {
      goToNext()
    }
    if (isRightSwipe) {
      goToPrevious()
    }
  }

  const displayedCountry = sortedCountries[currentIndex]
  const isCurrentPosition = displayedCountry?.position === currentPosition
  const isSpecialSquare = SPECIAL_SQUARES[displayedCountry?.position || -1]

  // Información de propiedad
  const ownedCountry = displayedCountry
    ? playerCountries.find(pc => pc.country_id === displayedCountry.id)
    : null
  const owner = ownedCountry
    ? players.find(p => p.id === ownedCountry.player_id)
    : null
  const continentColor = displayedCountry
    ? CONTINENT_COLORS[displayedCountry.continent] || '#6b7280'
    : '#6b7280'

  // Calcular renta actual
  const calculateRent = () => {
    if (!displayedCountry || !ownedCountry) return displayedCountry?.base_rent || 0
    
    let rent = displayedCountry.base_rent
    if (ownedCountry.hotels > 0) {
      rent = displayedCountry.base_rent * 5 // Hotel = 5x renta base
    } else if (ownedCountry.houses > 0) {
      rent = displayedCountry.base_rent * (1 + ownedCountry.houses) // Cada casa aumenta la renta
    }
    return rent
  }

  const currentRent = calculateRent()

  // Determinar el color de la tarjeta según el estado
  const getCardColor = () => {
    if (isSpecialSquare) {
      return {
        bg: `linear-gradient(135deg, ${continentColor} 0%, ${continentColor}dd 100%)`,
        border: continentColor,
        textColor: 'text-white'
      }
    }
    
    if (!ownedCountry) {
      // Verde: Disponible para compra
      return {
        bg: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        border: '#10b981',
        textColor: 'text-white'
      }
    }
    
    if (ownedCountry.is_mortgaged) {
      // Amarillo: Hipotecada
      return {
        bg: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
        border: '#fbbf24',
        textColor: 'text-white'
      }
    }
    
    const isMyProperty = owner && currentPlayer && owner.id === currentPlayer.id
    
    if (isMyProperty) {
      // Azul: Mi propiedad
      return {
        bg: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
        border: '#3b82f6',
        textColor: 'text-white'
      }
    } else {
      // Rojo: Propiedad de otro jugador
      return {
        bg: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
        border: '#ef4444',
        textColor: 'text-white'
      }
    }
  }

  const cardColors = getCardColor()

  return (
    <div className="w-full">
      {/* Indicador de posición */}
      <div className="mb-4 flex items-center justify-center gap-2">
        <button
          onClick={goToPrevious}
          className="p-2 rounded-full bg-white shadow-lg hover:bg-gray-100 transition text-gray-700"
          aria-label="Casilla anterior"
        >
          ←
        </button>
        <div className="flex-1 text-center">
          <p className="text-sm text-gray-600">
            Casilla {displayedCountry?.position || 0} de 40
          </p>
          {isCurrentPosition && (
            <p className="text-xs text-blue-600 font-semibold mt-1">📍 Tu posición</p>
          )}
        </div>
        <button
          onClick={goToNext}
          className="p-2 rounded-full bg-white shadow-lg hover:bg-gray-100 transition text-gray-700"
          aria-label="Casilla siguiente"
        >
          →
        </button>
      </div>

      {/* Tarjeta de la casilla */}
      <div
        className="relative rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 transform hover:scale-[1.02]"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          background: cardColors.bg,
          border: `3px solid ${cardColors.border}`,
        }}
      >
        {/* Indicador de casilla actual */}
        {isCurrentPosition && (
          <div className="absolute top-2 right-2 bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-bold z-10 flex items-center gap-1">
            <span>📍</span>
            <span>Aquí estás</span>
          </div>
        )}

        <div className="p-6 sm:p-8">
          {/* Header de la casilla */}
          <div className="text-center mb-6">
            {isSpecialSquare ? (
              <>
                <div className="text-6xl mb-3">{isSpecialSquare.emoji}</div>
                <h2 className="text-3xl sm:text-4xl font-bold text-white mb-2 drop-shadow-lg">
                  {isSpecialSquare.name}
                </h2>
                <p className="text-white/90 text-sm sm:text-base">{isSpecialSquare.description}</p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 mx-auto mb-4 rounded-full shadow-lg flex items-center justify-center bg-white/20">
                  <span className="text-2xl">🌍</span>
                </div>
                <h2 className={`text-2xl sm:text-3xl font-bold mb-2 ${cardColors.textColor}`}>
                  {displayedCountry?.name || 'Cargando...'}
                </h2>
                <p className={`${cardColors.textColor} opacity-90 text-sm sm:text-base`}>
                  {displayedCountry ? CONTINENT_NAMES[displayedCountry.continent] : ''}
                </p>
              </>
            )}
          </div>

          {/* Información de propiedad */}
          {!isSpecialSquare && displayedCountry && (
            <div className="space-y-4">
              {/* Estado de propiedad */}
              {ownedCountry ? (
                <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 shadow-lg border-2 border-white/30">
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <p className={`font-semibold ${cardColors.textColor} text-sm sm:text-base`}>
                      {owner && currentPlayer && owner.id === currentPlayer.id 
                        ? '🏛️ Tu Propiedad' 
                        : 'Propiedad de:'}
                    </p>
                    {owner && (
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded-full border-2 border-white shadow-md"
                          style={{ backgroundColor: PLAYER_COLORS[owner.color] || '#gray' }}
                        />
                        <span className={`font-bold ${cardColors.textColor} text-sm sm:text-base`}>
                          {owner.profile.username}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Estado de hipoteca */}
                  {ownedCountry.is_mortgaged && (
                    <div className="bg-yellow-500/30 border-2 border-yellow-400 rounded-lg p-2 mb-3">
                      <p className={`${cardColors.textColor} text-sm font-semibold text-center`}>⚠️ HIPOTECADA</p>
                    </div>
                  )}

                  {/* Construcciones */}
                  <div className="space-y-2">
                    {ownedCountry.hotels > 0 ? (
                      <div className="flex items-center justify-between bg-white/20 rounded-lg p-2 border border-white/30">
                        <span className={`${cardColors.textColor} font-semibold text-sm sm:text-base`}>🏨 Hoteles: {ownedCountry.hotels}</span>
                        <span className={`${cardColors.textColor} opacity-90 text-xs sm:text-sm`}>Renta: ${currentRent.toLocaleString()}</span>
                      </div>
                    ) : ownedCountry.houses > 0 ? (
                      <div className="flex items-center justify-between bg-white/20 rounded-lg p-2 border border-white/30">
                        <span className={`${cardColors.textColor} font-semibold text-sm sm:text-base`}>🏠 Casas: {ownedCountry.houses}</span>
                        <span className={`${cardColors.textColor} opacity-90 text-xs sm:text-sm`}>Renta: ${currentRent.toLocaleString()}</span>
                      </div>
                    ) : (
                      <div className="bg-white/20 rounded-lg p-2 border border-white/30">
                        <p className={`${cardColors.textColor} text-sm text-center`}>Sin construcciones</p>
                        <p className={`${cardColors.textColor} opacity-75 text-xs text-center mt-1`}>Renta base: ${displayedCountry.base_rent.toLocaleString()}</p>
                      </div>
                    )}
                  </div>

                  {/* Si es tu propiedad */}
                  {owner && currentPlayer && owner.id === currentPlayer.id && (
                    <div className="mt-3 pt-3 border-t border-white/30 space-y-3">
                      <p className={`${cardColors.textColor} opacity-90 text-xs sm:text-sm text-center`}>
                        💡 Puedes construir casas/hoteles si tienes el monopolio del continente
                      </p>
                      {isMyTurn && onEndTurn && (
                        <button
                          onClick={onEndTurn}
                          className="w-full bg-white/50 text-white py-2 px-4 rounded-lg hover:bg-white/70 active:bg-white/80 transition font-semibold border-2 border-white/50 text-sm sm:text-base"
                        >
                          ✅ Pasar Turno
                        </button>
                      )}
                    </div>
                  )}

                  {/* Si no es tu propiedad */}
                  {owner && currentPlayer && owner.id !== currentPlayer.id && (
                    <div className="mt-3 pt-3 border-t border-white/30 bg-white/10 rounded-lg p-2">
                      {ownedCountry.is_for_sale && ownedCountry.sale_price ? (
                        <div className="space-y-2">
                          <p className={`${cardColors.textColor} font-semibold text-center text-sm sm:text-base`}>
                            🏪 Esta propiedad está en venta
                          </p>
                          <p className={`${cardColors.textColor} text-center text-lg sm:text-xl font-bold`}>
                            ${ownedCountry.sale_price.toLocaleString()}
                          </p>
                          {isMyTurn && onBuyPropertyFromPlayer && (
                            <button
                              onClick={() => {
                                onBuyPropertyFromPlayer(ownedCountry.id)
                              }}
                              className="w-full bg-white text-purple-600 py-2 px-4 rounded-lg hover:bg-purple-50 active:bg-purple-100 transition font-semibold shadow-lg border-2 border-white text-sm sm:text-base mt-2"
                            >
                              💰 Comprar por ${ownedCountry.sale_price.toLocaleString()}
                            </button>
                          )}
                        </div>
                      ) : (
                        <p className={`${cardColors.textColor} font-semibold text-center text-sm sm:text-base`}>
                          💰 Debes pagar ${currentRent.toLocaleString()} de peaje
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white/20 backdrop-blur-sm border-2 border-white/30 rounded-xl p-4 shadow-lg">
                  <div className="text-center">
                    <p className={`${cardColors.textColor} font-bold text-lg sm:text-xl mb-2`}>🏛️ Disponible para comprar</p>
                    <p className={`text-2xl sm:text-3xl font-bold ${cardColors.textColor} mb-3`}>
                      ${displayedCountry.price.toLocaleString()}
                    </p>
                    <div className="space-y-2 text-sm sm:text-base mb-4">
                      <p className={cardColors.textColor + ' opacity-90'}>💰 Renta base: ${displayedCountry.base_rent.toLocaleString()}</p>
                      <p className={cardColors.textColor + ' opacity-90'}>🏠 Precio casa: ${displayedCountry.house_price.toLocaleString()}</p>
                      <p className={cardColors.textColor + ' opacity-90'}>🏨 Precio hotel: ${displayedCountry.hotel_price.toLocaleString()}</p>
                    </div>
                    
                    {/* Botones de acción si es tu turno, la casilla está disponible y tienes dinero */}
                    {isMyTurn && !ownedCountry && currentPlayer && currentPlayer.money >= displayedCountry.price && onBuyCountry && (
                      <div className="flex gap-2 mt-4">
                        <button
                          onClick={() => {
                            console.log('Comprar clicked, countryId:', displayedCountry.id)
                            onBuyCountry(displayedCountry.id)
                          }}
                          className="flex-1 bg-white text-green-600 py-2 px-4 rounded-lg hover:bg-green-50 active:bg-green-100 transition font-semibold shadow-lg border-2 border-white text-sm sm:text-base"
                        >
                          ✅ Comprar ${displayedCountry.price.toLocaleString()}
                        </button>
                        {onEndTurn && (
                          <button
                            onClick={onEndTurn}
                            className="flex-1 bg-white/50 text-white py-2 px-4 rounded-lg hover:bg-white/70 active:bg-white/80 transition font-semibold border-2 border-white/50 text-sm sm:text-base"
                          >
                            ❌ Pasar
                          </button>
                        )}
                      </div>
                    )}
                    
                    {/* Mensaje si no tienes suficiente dinero */}
                    {isMyTurn && !ownedCountry && currentPlayer && currentPlayer.money < displayedCountry.price && (
                      <div className="mt-4 space-y-3">
                        <div className="bg-red-500/20 border-2 border-red-500/50 rounded-lg p-3">
                          <p className={`${cardColors.textColor} text-sm text-center font-semibold`}>
                            ⚠️ No tienes suficiente dinero (Tienes: ${currentPlayer.money.toLocaleString()}, Necesitas: ${displayedCountry.price.toLocaleString()})
                          </p>
                        </div>
                        {onEndTurn && (
                          <button
                            onClick={onEndTurn}
                            className="w-full bg-white/50 text-white py-2 px-4 rounded-lg hover:bg-white/70 active:bg-white/80 transition font-semibold border-2 border-white/50 text-sm sm:text-base"
                          >
                            ✅ Pasar Turno
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Información adicional */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg p-3 text-center">
                  <p className={`${cardColors.textColor} opacity-90 text-xs mb-1`}>Renta Base</p>
                  <p className={`font-bold ${cardColors.textColor} text-sm sm:text-base`}>${displayedCountry.base_rent.toLocaleString()}</p>
                </div>
                <div className="bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg p-3 text-center">
                  <p className={`${cardColors.textColor} opacity-90 text-xs mb-1`}>Precio</p>
                  <p className={`font-bold ${cardColors.textColor} text-sm sm:text-base`}>${displayedCountry.price.toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Barra de progreso del tablero */}
        <div className={`${cardColors.textColor === 'text-white' ? 'bg-white/20' : 'bg-gray-200/50'} px-4 py-2`}>
          <div className={`flex items-center justify-between text-xs ${cardColors.textColor} opacity-80 mb-1`}>
            <span>Inicio</span>
            <span>Final</span>
          </div>
          <div className={`w-full ${cardColors.textColor === 'text-white' ? 'bg-white/30' : 'bg-gray-300/50'} rounded-full h-2`}>
            <div
              className={`${cardColors.textColor === 'text-white' ? 'bg-white' : 'bg-gray-700'} rounded-full h-2 transition-all duration-300`}
              style={{ width: `${((displayedCountry?.position || 0) / 40) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Botón para ir a tu posición */}
      {!isCurrentPosition && currentPlayer && (
        <button
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            goToCurrent()
          }}
          className="mt-4 w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 active:bg-blue-800 transition font-semibold text-sm shadow-lg"
        >
          📍 Ir a mi posición (Casilla {currentPosition})
        </button>
      )}
    </div>
  )
}

