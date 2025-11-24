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
 * Verifica si un jugador tiene todos los países de un continente
 */
export function hasMonopoly(
  continent: string,
  playerId: string,
  countries: Country[],
  playerCountries: PlayerCountry[]
): boolean {
  const continentCountries = countries.filter(c => c.continent === continent)
  const playerOwnedCountries = playerCountries.filter(
    pc => pc.player_id === playerId && !pc.is_mortgaged
  )

  const ownedCountryIds = new Set(playerOwnedCountries.map(pc => pc.country_id))
  const continentCountryIds = new Set(continentCountries.map(c => c.id))

  // Verificar que el jugador posee todos los países del continente
  for (const countryId of continentCountryIds) {
    if (!ownedCountryIds.has(countryId)) {
      return false
    }
  }

  return continentCountries.length > 0
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

  // Verificar monopolio
  if (!hasMonopoly(country.continent, playerId, gameState.countries, gameState.playerCountries)) {
    return { canBuild: false, reason: 'Necesitas tener todos los países del continente' }
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

  const rent = calculateRent(country, playerCountry)
  
  // Si tiene monopolio, duplicar la renta base
  if (hasMonopoly(country.continent, ownerId, gameState.countries, gameState.playerCountries)) {
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

/**
 * Verifica si un jugador puede pagar una cantidad
 */
export function canAfford(player: Player, amount: number): boolean {
  return player.money >= amount
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
  // Filtrar jugadores activos (no en bancarrota y online)
  const activePlayers = players.filter(p => 
    !p.is_bankrupt && 
    (p.is_online !== false) // Considerar online si no está definido (compatibilidad)
  )
  
  if (activePlayers.length === 0) return currentTurn

  const currentPlayer = players.find(p => p.turn_order === currentTurn)
  if (!currentPlayer) return currentTurn

  // Encontrar el siguiente jugador activo (no en bancarrota y online)
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

