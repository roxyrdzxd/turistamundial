export type GameStatus = 'waiting' | 'active' | 'finished'

export type PlayerColor = 
  | 'red' 
  | 'blue' 
  | 'green' 
  | 'yellow' 
  | 'purple' 
  | 'orange' 
  | 'pink' 
  | 'cyan'

export interface Player {
  id: string
  userId: string
  username: string
  position: number
  money: number
  color: PlayerColor
  turnOrder: number
  isBankrupt: boolean
  countries: string[] // country IDs
}

export interface Country {
  id: string
  name: string
  continent: string
  price: number
  baseRent: number
  housePrice: number
  hotelPrice: number
  position: number
}

export interface PlayerCountry {
  countryId: string
  houses: number
  hotels: number
  isMortgaged: boolean
}

export interface GameSession {
  id: string
  hostId: string
  status: GameStatus
  maxPlayers: number
  currentPlayers: number
  currentTurn: number
  players: Player[]
  countries: Country[]
  playerCountries: Record<string, PlayerCountry>
}

export type MoveType = 
  | 'roll' 
  | 'buy' 
  | 'build' 
  | 'pay' 
  | 'mortgage' 
  | 'unmortgage' 
  | 'chance' 
  | 'jail'

export interface GameMove {
  id: string
  sessionId: string
  playerId: string
  moveType: MoveType
  moveData: Record<string, any>
  createdAt: string
}

export interface ChanceCard {
  id: string
  type: 'suerte' | 'destino'
  title: string
  description: string
  actionType: string
  actionData: Record<string, any>
}

export interface BoardSpace {
  position: number
  type: 'country' | 'tax' | 'chance' | 'jail' | 'go' | 'free_parking' | 'go_to_jail' | 'airport'
  name: string
  countryId?: string
  taxAmount?: number
}

