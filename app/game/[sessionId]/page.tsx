'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import GameBoard from '@/components/game/GameBoard'
import CountryCarousel from '@/components/game/CountryCarousel'
import DiceAnimation from '@/components/game/DiceAnimation'
import TransactionHistory from '@/components/game/TransactionHistory'
import Chat from '@/components/game/Chat'
import { useToast } from '@/contexts/ToastContext'

interface Player {
  id: string
  user_id: string
  position: number
  money: number
  color: string
  turn_order: number
  is_bankrupt: boolean
  is_online?: boolean
  last_seen?: string
  profile: {
    id: string
    username: string
  }
}

interface Session {
  id: string
  host_id: string
  status: 'waiting' | 'active' | 'finished'
  max_players: number
  current_players: number
  current_turn: number
  created_at: string
  started_at: string | null
  host: {
    id: string
    username: string
  }
  players: Player[]
}

export default function GamePage() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.sessionId as string

  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [playerCountries, setPlayerCountries] = useState<any[]>([])
  const [diceResult, setDiceResult] = useState<number | null>(null)
  const [rolling, setRolling] = useState(false)
  const [countries, setCountries] = useState<any[]>([])
  const [actionRequired, setActionRequired] = useState<string | null>(null)
  const [currentCountry, setCurrentCountry] = useState<any>(null)
  const [canBuyCountry, setCanBuyCountry] = useState(false)
  const [needsToPayToll, setNeedsToPayToll] = useState(false)
  const [tollAmount, setTollAmount] = useState(0)
  const [showDiceAnimation, setShowDiceAnimation] = useState(false)
  const [diceDetails, setDiceDetails] = useState<{ die1?: number; die2?: number }>({})
  const toast = useToast()

  // Declarar funciones antes de usarlas en useEffect
  const fetchCountries = async () => {
    try {
      const response = await fetch('/api/game/countries')
      const data = await response.json()
      if (data.countries) {
        setCountries(data.countries)
      }
    } catch (err) {
      console.error('Error obteniendo países:', err)
    }
  }

  const fetchUser = async () => {
    try {
      const response = await fetch('/api/auth/user')
      const data = await response.json()
      if (data.data?.user?.id) {
        setCurrentUserId(data.data.user.id)
      }
    } catch (err) {
      console.error('Error obteniendo usuario:', err)
    }
  }

  const fetchSession = useCallback(async () => {
    try {
      const response = await fetch(`/api/game/session/${sessionId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al cargar la sesión')
      }

      setSession(data.session)
      if (data.playerCountries) {
        setPlayerCountries(data.playerCountries)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  useEffect(() => {
    if (sessionId) {
      fetchUser()
      fetchSession()
      fetchCountries()
      // Refrescar cada 2 segundos
      const interval = setInterval(fetchSession, 2000)
      return () => clearInterval(interval)
    }
  }, [sessionId, fetchSession])

  // Sistema de heartbeat para mantener al jugador como online
  useEffect(() => {
    if (!session || !currentUserId || session.status !== 'active') {
      return
    }

    // Enviar heartbeat inmediatamente
    const sendHeartbeat = async () => {
      try {
        await fetch('/api/game/heartbeat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sessionId }),
        })
      } catch (err) {
        console.error('Error enviando heartbeat:', err)
      }
    }

    sendHeartbeat()

    // Enviar heartbeat cada 30 segundos
    const heartbeatInterval = setInterval(sendHeartbeat, 30000)

    // Cleanup al desmontar
    return () => {
      clearInterval(heartbeatInterval)
    }
  }, [sessionId, currentUserId, session?.status])

  // Detectar turnos de NPCs y jugadores desconectados, hacerlos jugar automáticamente
  const npcProcessingRef = useRef(false)
  
  useEffect(() => {
    if (!session || !currentUserId || session.status !== 'active') {
      npcProcessingRef.current = false
      return
    }

    const currentPlayer = session.players.find(
      p => p.turn_order === session.current_turn
    )

    if (!currentPlayer) {
      npcProcessingRef.current = false
      return
    }

    // Verificar si es un NPC
    const isNPC = currentPlayer.user_id.startsWith('npc-') || 
                  currentPlayer.profile.username.startsWith('Bot')

    // Verificar si el jugador está desconectado
    const isDisconnected = currentPlayer.is_online === false

    // Si es un NPC o está desconectado, y no es el usuario actual, hacer que se salte el turno
    if ((isNPC || isDisconnected) && currentPlayer.user_id !== currentUserId && !npcProcessingRef.current) {
      npcProcessingRef.current = true // Marcar que estamos procesando
      
      // Esperar un momento antes de procesar
      const processTimer = setTimeout(async () => {
        try {
          if (isNPC) {
            // Si es NPC, hacer que juegue
            const response = await fetch('/api/game/npc-turn', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ sessionId }),
            })

            const data = await response.json()

            if (response.ok) {
              toast.showInfo(`${currentPlayer.profile.username}: ${data.message}`)
              setTimeout(() => {
                npcProcessingRef.current = false
                fetchSession()
              }, 1500)
            } else {
              npcProcessingRef.current = false
              toast.showError(`Error en turno de NPC: ${data.error}`)
            }
          } else if (isDisconnected) {
            // Si está desconectado, saltar su turno automáticamente
            const response = await fetch('/api/game/end-turn', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ sessionId }),
            })

            const data = await response.json()

            if (response.ok) {
              toast.showInfo(`Turno de ${currentPlayer.profile.username} saltado (desconectado)`)
              setTimeout(() => {
                npcProcessingRef.current = false
                fetchSession()
              }, 1000)
            } else {
              npcProcessingRef.current = false
            }
          }
        } catch (err: any) {
          console.error('Error procesando turno:', err)
          npcProcessingRef.current = false
        }
      }, isDisconnected ? 1000 : 2000) // Menos tiempo si está desconectado

      return () => {
        clearTimeout(processTimer)
        npcProcessingRef.current = false
      }
    } else if (!isNPC && !isDisconnected && currentPlayer.user_id === currentUserId) {
      npcProcessingRef.current = false
    }
  }, [session?.current_turn, session?.status, currentUserId, sessionId, fetchSession, toast])

  const handleRollDice = async () => {
    if (!session || rolling) return

    const currentPlayer = session.players.find(
      p => p.turn_order === session.current_turn
    )

    if (!currentPlayer || currentPlayer.user_id !== currentUserId) {
      toast.showWarning('No es tu turno')
      return
    }

    setRolling(true)
    setActionRequired(null)
    setCurrentCountry(null)
    setCanBuyCountry(false)
    setNeedsToPayToll(false)
    setShowDiceAnimation(true)
    
    try {
      // Esperar un momento para que la animación se vea
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const response = await fetch('/api/game/roll-dice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al tirar dados')
      }

      toast.showSuccess(`Has tirado ${data.diceResult}!`)

      // Guardar detalles de los dados para la animación
      setDiceDetails({
        die1: data.die1,
        die2: data.die2,
      })

      // Establecer el resultado inmediatamente para que la animación lo muestre
      setDiceResult(data.diceResult)
      
      // Marcar que se tiraron dados en este turno
      if (session) {
        lastTurnDiceRolledRef.current = session.current_turn
      }
      
      // Actualizar la posición del jugador en el estado local inmediatamente
      if (session && data.newPosition !== undefined) {
        setSession(prev => {
          if (!prev) return prev
          return {
            ...prev,
            players: prev.players.map(p => 
              p.user_id === currentUserId 
                ? { ...p, position: data.newPosition }
                : p
            )
          }
        })
      }
      
      // Guardar datos para mostrar acciones después
      const actionData = {
        country: data.country,
        actionRequired: data.actionRequired,
        canBuy: data.canBuy || false,
        needsToPayToll: data.needsToPayToll || false,
        tollAmount: data.tollAmount || 0,
      }

      // Establecer datos inmediatamente (sin esperar la animación)
      setCurrentCountry(actionData.country)
      setActionRequired(actionData.actionRequired)
      setCanBuyCountry(actionData.canBuy)
      setNeedsToPayToll(actionData.needsToPayToll)
      setTollAmount(actionData.tollAmount)

      // Refrescar la sesión inmediatamente para obtener datos actualizados
      fetchSession()

      // Refrescar nuevamente después de la animación para asegurar que todo esté actualizado
      setTimeout(() => {
        fetchSession()
      }, 4200) // Después de que la animación se cierre
    } catch (err: any) {
      setShowDiceAnimation(false)
      toast.showError(err.message)
    } finally {
      setRolling(false)
    }
  }

  const handleDiceAnimationComplete = () => {
    // Cuando la animación termine, mostrar las acciones
    if (session) {
      // Obtener los datos del último resultado
      fetchSession()
      
      // Pequeño delay para asegurar que los datos estén actualizados
      setTimeout(() => {
        // Las acciones se mostrarán automáticamente cuando se actualice la sesión
      }, 500)
    }
  }

  // Ref para rastrear el último turno en el que el usuario tiró dados
  const lastTurnDiceRolledRef = useRef<number | null>(null)

  // Resetear estados cuando es tu turno de nuevo
  useEffect(() => {
    if (!session || !currentUserId) return

    const currentPlayer = session.players.find(
      p => p.turn_order === session.current_turn
    )

    // Si es tu turno
    if (currentPlayer && currentPlayer.user_id === currentUserId) {
      // Si es un turno nuevo (diferente al último en el que tiraste dados)
      if (lastTurnDiceRolledRef.current !== session.current_turn) {
        // Resetear estados del turno anterior
        setDiceResult(null)
        setActionRequired(null)
        setCurrentCountry(null)
        setCanBuyCountry(false)
        setNeedsToPayToll(false)
        setTollAmount(0)
        setShowDiceAnimation(false)
        setRolling(false)
      }
    } else {
      // Si no es tu turno, resetear el ref cuando cambia el turno
      if (lastTurnDiceRolledRef.current !== null) {
        lastTurnDiceRolledRef.current = null
      }
    }
  }, [session?.current_turn, currentUserId, session])

  // Actualizar acciones cuando cambie la sesión y tengamos datos del resultado
  useEffect(() => {
    if (session && diceResult && !showDiceAnimation) {
      // Buscar el país en la posición actual del jugador
      const currentPlayer = session.players.find(
        p => p.user_id === currentUserId
      )
      
      if (currentPlayer) {
        const countryAtPosition = countries.find(
          c => c.position === currentPlayer.position
        )
        
        if (countryAtPosition) {
          setCurrentCountry(countryAtPosition)
          // Las acciones se determinarán cuando se actualice la sesión
        }
      }
    }
  }, [session, diceResult, showDiceAnimation, countries, currentUserId])

  const handleBuyCountry = async (countryId?: string) => {
    const countryToBuy = countryId ? countries.find(c => c.id === countryId) : currentCountry
    if (!countryToBuy) return

    try {
      const response = await fetch('/api/game/buy-country', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId, countryId: countryToBuy.id }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al comprar país')
      }

      toast.showSuccess(data.message)
      setCanBuyCountry(false)
      setActionRequired(null)
      setCurrentCountry(null)
      fetchSession()
    } catch (err: any) {
      toast.showError(err.message)
    }
  }

  const handlePayToll = async () => {
    try {
      const response = await fetch('/api/game/pay-toll', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al pagar peaje')
      }

      if (data.bankrupt) {
        toast.showError('Has quedado en bancarrota')
      } else {
        toast.showSuccess(data.message)
      }

      setNeedsToPayToll(false)
      setActionRequired(null)
      fetchSession()
    } catch (err: any) {
      toast.showError(err.message)
    }
  }

  const handleEndTurn = async () => {
    try {
      const response = await fetch('/api/game/end-turn', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al finalizar turno')
      }

      toast.showInfo('Turno finalizado')

      setActionRequired(null)
      setDiceResult(null)
      setCurrentCountry(null)
      setCanBuyCountry(false)
      setNeedsToPayToll(false)
      fetchSession()
    } catch (err: any) {
      toast.showError(err.message)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Cargando partida...</p>
        </div>
      </div>
    )
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md">
          <h1 className="text-2xl font-bold mb-4 text-red-600">Error</h1>
          <p className="text-gray-600 mb-4">{error || 'Sesión no encontrada'}</p>
          <Link
            href="/dashboard"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
          >
            Volver al Dashboard
          </Link>
        </div>
      </div>
    )
  }

  if (session.status !== 'active') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <h1 className="text-2xl font-bold mb-4">Partida no iniciada</h1>
          <p className="text-gray-600 mb-6">
            {session.status === 'waiting' 
              ? 'La partida aún no ha comenzado'
              : 'La partida ha finalizado'}
          </p>
          <Link
            href={`/lobby/${sessionId}`}
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
          >
            Volver al Lobby
          </Link>
        </div>
      </div>
    )
  }

  const currentPlayer = session.players.find(
    p => p.turn_order === session.current_turn
  )
  const isMyTurn = currentPlayer?.user_id === currentUserId
  const myPlayer = session.players.find(p => p.user_id === currentUserId)
  const isHost = session.host_id === currentUserId

  const handleClose = async () => {
    if (!isHost) return

    if (!confirm('¿Estás seguro de que quieres cerrar esta partida? Esta acción no se puede deshacer.')) {
      return
    }

    try {
      const response = await fetch('/api/game/close-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al cerrar la partida')
      }

      toast.showToast('Partida cerrada correctamente', 'success')
      // Redirigir al lobby
      router.push('/lobby')
    } catch (err: any) {
      toast.showToast(err.message || 'Error al cerrar la partida', 'error')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4 transition"
          >
            <span>←</span>
            <span>Volver al Dashboard</span>
          </Link>
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">🌍 Turista Mundial</h1>
                <p className="text-gray-600">
                  Turno: {currentPlayer?.profile.username || 'Cargando...'}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm text-gray-500">Sesión</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {session.current_players} jugadores
                  </p>
                </div>
                {isHost && (
                  <button
                    onClick={handleClose}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold text-sm shadow-lg"
                    title="Cerrar partida"
                  >
                    🚪 Cerrar
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 items-start">
          {/* Tablero / Área Principal */}
          <div className="lg:col-span-2 order-1">
            <div className="bg-white rounded-xl shadow-lg p-3 sm:p-6 mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-2xl font-bold mb-3 sm:mb-4 text-center">Casilla Actual</h2>
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-2 sm:p-4">
                {countries.length > 0 && myPlayer ? (
                  <CountryCarousel
                    countries={countries}
                    players={session.players}
                    currentPlayer={myPlayer}
                    playerCountries={playerCountries}
                    isMyTurn={isMyTurn}
                    onBuyCountry={handleBuyCountry}
                    onEndTurn={handleEndTurn}
                  />
                ) : (
                  <div className="min-h-[400px] flex items-center justify-center">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                      <p className="text-gray-600">Cargando casilla...</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Acciones del Turno */}
            {isMyTurn && (
              <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 space-y-3 sm:space-y-4">
                <h3 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">Tu Turno</h3>
                
                {/* Animación de dados - pequeña, arriba del botón */}
                {showDiceAnimation && (
                  <div className="mb-4">
                    <DiceAnimation
                      result={diceResult || undefined}
                      die1={diceDetails.die1}
                      die2={diceDetails.die2}
                      onComplete={() => {
                        setShowDiceAnimation(false)
                      }}
                    />
                  </div>
                )}
                
                {!diceResult && !showDiceAnimation && (
                  <button
                    onClick={handleRollDice}
                    disabled={rolling}
                    className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-4 px-6 rounded-lg hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-semibold text-lg shadow-lg"
                  >
                    {rolling ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Tirando dados...
                      </span>
                    ) : (
                      '🎲 Tirar Dados'
                    )}
                  </button>
                )}

                {diceResult && !showDiceAnimation && (
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-5xl font-bold text-blue-600 mb-2">{diceResult}</p>
                    <p className="text-gray-600">Resultado de los dados</p>
                  </div>
                )}

                {/* Acciones después de tirar dados */}
                {(actionRequired === 'can_buy' || canBuyCountry) && currentCountry && (
                  <div className="bg-green-50 border-2 border-green-500 rounded-lg p-4">
                    <p className="font-semibold text-green-800 mb-2">
                      🏛️ {currentCountry.name} está disponible
                    </p>
                    <p className="text-sm text-green-700 mb-3">
                      Precio: ${currentCountry.price.toLocaleString()}
                    </p>
                    {myPlayer && myPlayer.money >= currentCountry.price ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleBuyCountry()}
                          className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition font-semibold"
                        >
                          ✅ Comprar
                        </button>
                        <button
                          onClick={handleEndTurn}
                          className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition font-semibold"
                        >
                          ❌ Pasar
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="bg-red-500/20 border-2 border-red-500/50 rounded-lg p-3">
                          <p className="text-sm text-red-800 font-semibold text-center">
                            ⚠️ No tienes suficiente dinero para comprar
                            {myPlayer && (
                              <span className="block mt-1 text-xs">
                                (Tienes: ${myPlayer.money.toLocaleString()}, Necesitas: ${currentCountry.price.toLocaleString()})
                              </span>
                            )}
                          </p>
                        </div>
                        <button
                          onClick={handleEndTurn}
                          className="w-full bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition font-semibold"
                        >
                          ✅ Pasar Turno
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {actionRequired === 'pay_toll' && needsToPayToll && (
                  <div className="bg-red-50 border-2 border-red-500 rounded-lg p-4">
                    <p className="font-semibold text-red-800 mb-2">
                      💰 Debes pagar peaje
                    </p>
                    <p className="text-sm text-red-700 mb-3">
                      Cantidad: ${tollAmount.toLocaleString()}
                    </p>
                    <button
                      onClick={handlePayToll}
                      className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition font-semibold"
                    >
                      💵 Pagar Peaje
                    </button>
                  </div>
                )}

                {actionRequired === 'start_bonus' && (
                  <div className="bg-yellow-50 border-2 border-yellow-500 rounded-lg p-4">
                    <p className="font-semibold text-yellow-800">
                      🎉 ¡Has pasado por el inicio! +$200
                    </p>
                  </div>
                )}

                {actionRequired === 'bank_tax' && (
                  <div className="bg-orange-50 border-2 border-orange-500 rounded-lg p-4">
                    <p className="font-semibold text-orange-800">
                      🏦 Has pagado impuesto al banco: -$200
                    </p>
                  </div>
                )}

                {actionRequired && !canBuyCountry && !needsToPayToll && actionRequired !== 'start_bonus' && actionRequired !== 'bank_tax' && (
                  <button
                    onClick={handleEndTurn}
                    className="w-full bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition font-semibold"
                  >
                    ✅ Finalizar Turno
                  </button>
                )}
              </div>
            )}

            {!isMyTurn && currentPlayer && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
                <p className="text-center text-yellow-800 font-semibold">
                  ⏳ Esperando turno de {currentPlayer.profile.username}
                </p>
              </div>
            )}
          </div>

          {/* Panel Lateral - Mobile First */}
          <div className="space-y-4 sm:space-y-6 self-start">
            {/* Historial de Transacciones */}
            <TransactionHistory sessionId={sessionId} />

            {/* Mi Información */}
            {myPlayer && (() => {
              // Obtener propiedades del jugador actual
              const myProperties = playerCountries
                .filter(pc => pc.player_id === myPlayer.id)
                .map(pc => {
                  const country = countries.find(c => c.id === pc.country_id)
                  return country ? { ...pc, country } : null
                })
                .filter((item): item is any => item !== null)

              return (
                <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl shadow-lg p-4 sm:p-6 text-white">
                  <h3 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">Tu Información</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-1 gap-3 sm:space-y-3 mb-4">
                    <div>
                      <p className="text-xs sm:text-sm opacity-90">Jugador</p>
                      <p className="text-base sm:text-lg font-semibold truncate">{myPlayer.profile.username}</p>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm opacity-90">Dinero</p>
                      <p className="text-xl sm:text-2xl font-bold">${myPlayer.money.toLocaleString()}</p>
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <p className="text-xs sm:text-sm opacity-90">Posición</p>
                      <p className="text-base sm:text-lg font-semibold">Casilla {myPlayer.position}</p>
                    </div>
                  </div>

                  {/* Propiedades Compradas */}
                  <div className="mt-4 pt-4 border-t border-white/20">
                    <h4 className="text-sm sm:text-base font-semibold mb-2 flex items-center gap-2">
                      <span>🏛️</span>
                      <span>Mis Propiedades ({myProperties.length})</span>
                    </h4>
                    {myProperties.length === 0 ? (
                      <p className="text-xs sm:text-sm opacity-80 text-center py-2">
                        No tienes propiedades aún
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-[200px] overflow-y-auto">
                        {myProperties.map((prop: any) => (
                          <div
                            key={prop.id}
                            className="bg-white/10 hover:bg-white/20 rounded-lg p-2 sm:p-3 transition-colors"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm sm:text-base truncate">
                                  {prop.country.name}
                                </p>
                                <div className="flex items-center gap-2 mt-1 text-xs opacity-90">
                                  <span>📍 Casilla {prop.country.position}</span>
                                  {prop.is_mortgaged && (
                                    <span className="bg-yellow-500/30 text-yellow-200 px-2 py-0.5 rounded text-xs">
                                      ⚠️ Hipotecada
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-1 ml-2">
                                {prop.hotels > 0 ? (
                                  <div className="flex items-center gap-1">
                                    <span className="text-lg">🏨</span>
                                    <span className="text-xs font-semibold">{prop.hotels}</span>
                                  </div>
                                ) : prop.houses > 0 ? (
                                  <div className="flex items-center gap-1">
                                    <span className="text-sm">🏠</span>
                                    <span className="text-xs font-semibold">{prop.houses}</span>
                                  </div>
                                ) : null}
                                <p className="text-xs opacity-75">
                                  ${prop.country.base_rent.toLocaleString()}/renta
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })()}

            {/* Lista de Jugadores */}
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 order-3">
              <h3 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">Jugadores</h3>
              <div className="space-y-3">
                {session.players
                  .sort((a, b) => a.turn_order - b.turn_order)
                  .map((player) => {
                    const isCurrentTurn = player.turn_order === session.current_turn
                    const isMe = player.user_id === currentUserId
                    const isNPC = player.user_id.startsWith('npc-') || player.profile.username.startsWith('Bot')

                    return (
                      <div
                        key={player.id}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          isCurrentTurn
                            ? 'border-yellow-400 bg-yellow-50'
                            : 'border-gray-200'
                        }`}
                        style={{
                          borderLeftColor: getColorHex(player.color),
                          borderLeftWidth: '4px',
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                              style={{ backgroundColor: getColorHex(player.color) }}
                            >
                              {isNPC ? '🤖' : player.profile.username.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold flex items-center gap-2">
                                {player.profile.username}
                                {isMe && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Tú</span>}
                                {isNPC && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">NPC</span>}
                              </p>
                              <div className="flex items-center gap-3 mt-1">
                                <p className="text-sm text-gray-600">
                                  💰 ${player.money.toLocaleString()}
                                </p>
                                <p className="text-sm text-gray-600 flex items-center gap-1">
                                  📍 Casilla {player.position}
                                </p>
                              </div>
                            </div>
                          </div>
                          {isCurrentTurn && (
                            <span className="text-2xl">🎯</span>
                          )}
                        </div>
                        {isCurrentTurn && (
                          <p className="text-xs text-yellow-700 mt-2 font-semibold">
                            Turno actual
                          </p>
                        )}
                      </div>
                    )
                  })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Component */}
      {currentUserId && (
        <Chat sessionId={sessionId} currentUserId={currentUserId} />
      )}
    </div>
  )
}

function getColorHex(color: string): string {
  const colors: Record<string, string> = {
    red: '#ef4444',
    blue: '#3b82f6',
    green: '#10b981',
    yellow: '#eab308',
    purple: '#a855f7',
    orange: '#f97316',
    pink: '#ec4899',
    cyan: '#06b6d4',
  }
  return colors[color] || '#gray'
}

