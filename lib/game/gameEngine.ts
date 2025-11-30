// Motor del juego - Lógica principal de Turista Mundial

export interface Country {
  id: string
  name: string
  continent: string
  price: number
  base_rent: number
  house_price: number
  hotel_price: number
  position: number
  property_type?: string // 'city', 'stadium', 'attraction', 'transport', 'service', 'special'
  monopoly_group?: string // Para agrupar propiedades en monopolios
}

export interface PlayerCountry {
  id: string
  country_id: string
  player_id: string
  houses: number
  hotels: number
  is_mortgaged: boolean
}

export interface Player {
  id: string
  user_id: string
  position: number
  money: number
  color: string
  turn_order: number
  is_bankrupt: boolean
  is_online?: boolean
  last_seen?: string
}

export interface GameState {
  sessionId: string
  players: Player[]
  playerCountries: PlayerCountry[]
  countries: Country[]
  currentTurn: number
}

/**
 * Calcula el alquiler de un país basado en sus mejoras
 */
export function calculateRent(
  country: Country,
  playerCountry: PlayerCountry | null
): number {
  if (!playerCountry || playerCountry.is_mortgaged) {
    return 0
  }

  if (playerCountry.hotels > 0) {
    return country.base_rent * 5 // Hotel = 5x renta base
  }

  if (playerCountry.houses > 0) {
    return country.base_rent * (1 + playerCountry.houses) // Cada casa aumenta la renta
  }

  return country.base_rent
}

/**
 * Verifica si un jugador tiene todos los países de un continente o grupo de monopolio
 */
export function hasMonopoly(
  continentOrGroup: string,
  playerId: string,
  countries: Country[],
  playerCountries: PlayerCountry[],
  useMonopolyGroup: boolean = false
): boolean {
  // Si useMonopolyGroup es true, usar monopoly_group; si no, usar continent
  const filterKey = useMonopolyGroup ? 'monopoly_group' : 'continent'
  const filterValue = continentOrGroup
  
  const groupCountries = countries.filter(c => {
    if (useMonopolyGroup) {
      return c.monopoly_group === filterValue && c.property_type === 'city'
    } else {
      return c.continent === filterValue && c.property_type === 'city'
    }
  })
  
  const playerOwnedCountries = playerCountries.filter(
    pc => pc.player_id === playerId && !pc.is_mortgaged
  )

  const ownedCountryIds = new Set(playerOwnedCountries.map(pc => pc.country_id))
  const groupCountryIds = new Set(groupCountries.map(c => c.id))

  // Verificar que el jugador posee todos los países del grupo
  for (const countryId of groupCountryIds) {
    if (!ownedCountryIds.has(countryId)) {
      return false
    }
  }

  return groupCountries.length > 0
}

/**
 * Verifica si un jugador puede construir en un país
 */
export function canBuild(
  country: Country,
  playerId: string,
  gameState: GameState
): { canBuild: boolean; reason?: string; maxHouses?: number; maxHotels?: number } {
  const playerCountry = gameState.playerCountries.find(
    pc => pc.country_id === country.id && pc.player_id === playerId
  )

  if (!playerCountry) {
    return { canBuild: false, reason: 'No eres dueño de este país' }
  }

  if (playerCountry.is_mortgaged) {
    return { canBuild: false, reason: 'El país está hipotecado' }
  }

  // Verificar monopolio (usar monopoly_group si existe, si no usar continent)
  const monopolyGroup = country.monopoly_group || country.continent
  const useMonopolyGroup = !!country.monopoly_group
  
  if (!hasMonopoly(monopolyGroup, playerId, gameState.countries, gameState.playerCountries, useMonopolyGroup)) {
    return { canBuild: false, reason: 'Necesitas tener todos los países del grupo de monopolio' }
  }

  // Verificar límites de construcción
  if (playerCountry.hotels > 0) {
    return { canBuild: false, reason: 'Ya tienes un hotel (máximo)' }
  }

  if (playerCountry.houses >= 4) {
    // Puede construir hotel
    return { 
      canBuild: true, 
      maxHouses: 4, 
      maxHotels: 1,
      reason: 'Puedes construir un hotel'
    }
  }

  return { 
    canBuild: true, 
    maxHouses: 4 - playerCountry.houses,
    maxHotels: playerCountry.houses === 4 ? 1 : 0,
    reason: `Puedes construir hasta ${4 - playerCountry.houses} casas más`
  }
}

/**
 * Calcula el costo de construir
 */
export function getBuildCost(
  country: Country,
  houses: number,
  hotels: number
): number {
  let cost = 0
  cost += houses * country.house_price
  cost += hotels * country.hotel_price
  return cost
}

/**
 * Verifica si un jugador puede comprar un país
 */
export function canBuyCountry(
  country: Country,
  player: Player,
  gameState: GameState
): { canBuy: boolean; reason?: string } {
  // Verificar si el país ya está comprado
  const isOwned = gameState.playerCountries.some(
    pc => pc.country_id === country.id && !pc.is_mortgaged
  )

  if (isOwned) {
    return { canBuy: false, reason: 'Este país ya está comprado' }
  }

  // Verificar si el jugador tiene suficiente dinero
  if (player.money < country.price) {
    return { canBuy: false, reason: 'No tienes suficiente dinero' }
  }

  return { canBuy: true }
}

/**
 * Calcula el peaje a pagar cuando caes en un país de otro jugador
 */
export function calculateToll(
  country: Country,
  ownerId: string,
  gameState: GameState
): { amount: number; ownerId: string } | null {
  const playerCountry = gameState.playerCountries.find(
    pc => pc.country_id === country.id && pc.player_id === ownerId
  )

  if (!playerCountry || playerCountry.is_mortgaged) {
    return null
  }

  const propertyType = country.property_type || 'city'

  // Lógica especial para transporte
  if (propertyType === 'transport') {
    // Contar cuántas propiedades de transporte tiene el dueño
    const ownerTransportProperties = gameState.playerCountries.filter(
      pc => {
        const c = gameState.countries.find(ct => ct.id === pc.country_id)
        return pc.player_id === ownerId && 
               !pc.is_mortgaged && 
               c?.property_type === 'transport'
      }
    )
    
    const transportCount = Math.min(ownerTransportProperties.length, 4) // Máximo x4
    const multiplier = transportCount > 0 ? transportCount : 1
    
    return {
      amount: country.base_rent * multiplier,
      ownerId: ownerId
    }
  }

  // Lógica especial para atracciones turísticas
  if (propertyType === 'attraction') {
    // Contar cuántas propiedades de atracciones tiene el dueño
    const ownerAttractionProperties = gameState.playerCountries.filter(
      pc => {
        const c = gameState.countries.find(ct => ct.id === pc.country_id)
        return pc.player_id === ownerId && 
               !pc.is_mortgaged && 
               c?.property_type === 'attraction'
      }
    )
    
    const attractionCount = Math.min(ownerAttractionProperties.length, 4) // Máximo x4
    const multiplier = attractionCount > 0 ? attractionCount : 1
    
    return {
      amount: country.base_rent * multiplier,
      ownerId: ownerId
    }
  }

  // Lógica para ciudades (con monopolios)
  if (propertyType === 'city') {
    const rent = calculateRent(country, playerCountry)
    
    // Verificar monopolio usando monopoly_group si existe, si no usar continent
    const hasMonopolyGroup = country.monopoly_group && 
      hasMonopoly(country.monopoly_group, ownerId, gameState.countries, gameState.playerCountries, true)
    
    const hasContinentMonopoly = !country.monopoly_group && 
      hasMonopoly(country.continent, ownerId, gameState.countries, gameState.playerCountries, false)
    
    // Si tiene monopolio, duplicar la renta
    if (hasMonopolyGroup || hasContinentMonopoly) {
      return {
        amount: rent * 2,
        ownerId: ownerId
      }
    }

    return {
      amount: rent,
      ownerId: ownerId
    }
  }

  // Para otros tipos (stadium, service, special), usar renta base
  return {
    amount: country.base_rent || 0,
    ownerId: ownerId
  }
}

/**
 * Verifica si un jugador puede pagar una cantidad
 */
export function canAfford(player: Player, amount: number): boolean {
  return player.money >= amount
}

/**
 * Calcula el valor de hipoteca de una propiedad (50% del precio original)
 */
export function getMortgageValue(country: Country): number {
  return Math.floor(country.price * 0.5)
}

/**
 * Calcula el costo para deshipotecar (hipoteca + 10% de interés)
 */
export function getUnmortgageCost(country: Country): number {
  const mortgageValue = getMortgageValue(country)
  return Math.floor(mortgageValue * 1.1) // 110% del valor de hipoteca
}

/**
 * Calcula el valor de venta de casas/hoteles (50% del precio de construcción)
 */
export function getSellBuildValue(
  country: Country,
  houses: number,
  hotels: number
): number {
  const houseValue = Math.floor(country.house_price * 0.5) * houses
  const hotelValue = Math.floor(country.hotel_price * 0.5) * hotels
  return houseValue + hotelValue
}

/**
 * Calcula el valor total de las propiedades de un jugador
 */
export function getPlayerNetWorth(
  playerId: string,
  gameState: GameState
): number {
  const player = gameState.players.find(p => p.id === playerId)
  if (!player) return 0

  let total = player.money

  // Agregar valor de propiedades
  const ownedCountries = gameState.playerCountries.filter(
    pc => pc.player_id === playerId && !pc.is_mortgaged
  )

  for (const playerCountry of ownedCountries) {
    const country = gameState.countries.find(c => c.id === playerCountry.country_id)
    if (!country) continue

    // Valor de la propiedad
    total += country.price

    // Valor de mejoras
    total += playerCountry.houses * country.house_price
    total += playerCountry.hotels * country.hotel_price
  }

  return total
}

/**
 * Obtiene el siguiente jugador en el turno
 * Salta jugadores en bancarrota y desconectados
 */
export function getNextPlayer(
  currentTurn: number,
  players: Player[]
): number {
  // Filtrar jugadores activos (no en bancarrota)
  // NPCs pueden tener is_online === false, pero siguen siendo jugadores activos
  const activePlayers = players.filter(p => !p.is_bankrupt)
  
  if (activePlayers.length === 0) return currentTurn

  const currentPlayer = players.find(p => p.turn_order === currentTurn)
  if (!currentPlayer) return currentTurn

  // Encontrar el siguiente jugador activo (no en bancarrota)
  // Incluir NPCs en la rotación de turnos
  let nextTurn = (currentTurn + 1) % players.length
  let attempts = 0

  while (attempts < players.length) {
    const nextPlayer = players.find(p => p.turn_order === nextTurn)
    if (nextPlayer && 
        !nextPlayer.is_bankrupt && 
        (nextPlayer.is_online !== false)) { // Salta desconectados
      return nextTurn
    }
    nextTurn = (nextTurn + 1) % players.length
    attempts++
  }

  return currentTurn
}

/**
 * Verifica si el juego ha terminado
 */
export function isGameOver(gameState: GameState): {
  isOver: boolean
  winner?: Player
} {
  const activePlayers = gameState.players.filter(p => !p.is_bankrupt)

  if (activePlayers.length === 1) {
    return {
      isOver: true,
      winner: activePlayers[0]
    }
  }

  return { isOver: false }
}

/**
 * Obtiene países de un continente
 */
export function getContinentCountries(
  continent: string,
  countries: Country[]
): Country[] {
  return countries.filter(c => c.continent === continent)
}

/**
 * Obtiene países propiedad de un jugador
 */
export function getPlayerCountries(
  playerId: string,
  gameState: GameState
): Array<{ country: Country; playerCountry: PlayerCountry }> {
  return gameState.playerCountries
    .filter(pc => pc.player_id === playerId && !pc.is_mortgaged)
    .map(pc => {
      const country = gameState.countries.find(c => c.id === pc.country_id)
      return country ? { country, playerCountry: pc } : null
    })
    .filter((item): item is { country: Country; playerCountry: PlayerCountry } => item !== null)
}

