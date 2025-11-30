'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import GameBoard from '@/components/game/GameBoard'
import BoardOverview from '@/components/game/BoardOverview'
import CountryCarousel from '@/components/game/CountryCarousel'
import DiceAnimation from '@/components/game/DiceAnimation'
import TransactionHistory from '@/components/game/TransactionHistory'
import Chat from '@/components/game/Chat'
import PropertySaleModal from '@/components/game/PropertySaleModal'
import BankModal from '@/components/game/BankModal'
import SoundSettings from '@/components/game/SoundSettings'
import FloatingDiceButton from '@/components/game/FloatingDiceButton'
import MobileBottomNav from '@/components/game/MobileBottomNav'
import DesktopBottomNav from '@/components/game/DesktopBottomNav'
import FloatingActions from '@/components/game/FloatingActions'
import { useToast } from '@/contexts/ToastContext'
import { hasMonopoly, canBuild } from '@/lib/game/gameEngine'
import { soundManager } from '@/lib/audio/soundManager'
import { createClient } from '@/lib/supabase/client'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

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
  const [propertyForSale, setPropertyForSale] = useState<any>(null)
  const [showDiceAnimation, setShowDiceAnimation] = useState(false)
  const [diceDetails, setDiceDetails] = useState<{ die1?: number; die2?: number }>({})
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const timeLeftRef = useRef<number | null>(null)
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const toast = useToast()
  
  // Estados para navegación móvil y desktop
  const [showBoardOverview, setShowBoardOverview] = useState(false)
  const [showProperties, setShowProperties] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [chatUnreadCount, setChatUnreadCount] = useState(0)
  const [activeDesktopTab, setActiveDesktopTab] = useState<string | null>(null)
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)

  // Declarar funciones antes de usarlas en useEffect
  const fetchCountries = async () => {
    try {
      const response = await fetch(`/api/game/countries?sessionId=${sessionId}`)
      const data = await response.json()
      if (data.countries) {
        setCountries(data.countries)
      }
    } catch (err) {
      console.error('Error obteniendo países:', err)
    }
  }

  const fetchUser = useCallback(async () => {
    // Solo obtener el usuario si no lo tenemos ya
    if (currentUserId) {
      return
    }
    
    try {
      const response = await fetch('/api/auth/user')
      const data = await response.json()
      if (data.data?.user?.id) {
        setCurrentUserId(data.data.user.id)
      }
    } catch (err) {
      console.error('Error obteniendo usuario:', err)
    }
  }, [currentUserId])

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

  // Cargar datos iniciales solo una vez al montar
  useEffect(() => {
    if (!sessionId) return

    // Cargar datos iniciales
    fetchUser()
    fetchSession()
    fetchCountries()
  }, [sessionId, fetchUser, fetchSession]) // Incluir funciones memoizadas en dependencias // Solo ejecutar cuando cambie sessionId

  // Suscripciones de tiempo real (separadas para mejor control)
  useEffect(() => {
    if (!sessionId) return

    const supabase = createClient()
    const channel = supabase
      .channel(`game-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'session_players',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          // Actualizar la sesión cuando cambie la posición de un jugador
          fetchSession()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'game_sessions',
          filter: `id=eq.${sessionId}`,
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          // Actualizar cuando cambie el turno o estado de la sesión
          fetchSession()
        }
      )
      .subscribe()
    
    return () => {
      supabase.removeChannel(channel)
    }
  }, [sessionId, fetchSession]) // fetchSession está memoizado con useCallback

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

    // Verificar si es un NPC: los NPCs nunca están online
    // Si el jugador no está online (o is_online es undefined/null) y no es el usuario actual, es un NPC
    const isNPC = (currentPlayer.is_online === false || currentPlayer.is_online === undefined || currentPlayer.is_online === null) && currentPlayer.user_id !== currentUserId

    // Verificar si el jugador está desconectado (solo para jugadores reales)
    const isDisconnected = currentPlayer.is_online === false && !isNPC

    console.log('[NPC Detection]', {
      currentTurn: session.current_turn,
      currentPlayer: currentPlayer.profile?.username || currentPlayer.user_id,
      is_online: currentPlayer.is_online,
      isNPC,
      isDisconnected,
      isProcessing: npcProcessingRef.current,
      isCurrentUser: currentPlayer.user_id === currentUserId
    })

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
              // No mostrar toast para NPCs para que parezcan jugadores reales
              // toast.showInfo(`${currentPlayer.profile.username}: ${data.message}`)
              console.log('[NPC Turn] Turno procesado exitosamente:', data)
              // Actualizar inmediatamente para reflejar el movimiento
              // El fetchSession actualizará el current_turn y disparará el siguiente turno
              setTimeout(() => {
                npcProcessingRef.current = false
                fetchSession()
              }, 500) // Reducido a 500ms para actualización más rápida
            } else {
              console.error('[NPC Turn] Error en respuesta:', data)
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
  }, [session?.current_turn, session?.status, currentUserId, sessionId, fetchSession, toast, session?.players])

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
      soundManager?.play('dice_roll')

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

      // Detener el cronómetro ya que el jugador tiró los dados
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
        timerIntervalRef.current = null
      }
      setTimeLeft(null)
      timeLeftRef.current = null
      
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
        propertyForSale: data.propertyForSale || null,
      }

      // Establecer datos inmediatamente (sin esperar la animación)
      setCurrentCountry(actionData.country)
      setActionRequired(actionData.actionRequired)
      setCanBuyCountry(actionData.canBuy)
      setNeedsToPayToll(actionData.needsToPayToll)
      setTollAmount(actionData.tollAmount)
      setPropertyForSale(actionData.propertyForSale)
      
      // Reproducir sonido de bonus si pasó por inicio
      if (data.actionRequired === 'start_bonus') {
        soundManager?.play('money_received')
      }

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

  // Cronómetro de turno - 40 segundos máximo
  useEffect(() => {
    if (!session || !currentUserId) return

    // Calcular si es el turno del jugador
    const currentPlayer = session.players.find(
      p => p.turn_order === session.current_turn
    )
    const isMyTurnNow = currentPlayer?.user_id === currentUserId

    // Limpiar el cronómetro anterior
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current)
      timerIntervalRef.current = null
    }
    setTimeLeft(null)
    timeLeftRef.current = null

    // Solo iniciar el cronómetro si:
    // 1. La sesión está activa
    // 2. Es el turno del jugador actual
    // 3. El jugador no ha tirado los dados aún en este turno
    if (
      session.status === 'active' &&
      isMyTurnNow &&
      lastTurnDiceRolledRef.current !== session.current_turn &&
      !diceResult
    ) {
      // Iniciar cronómetro con 40 segundos
      timeLeftRef.current = 40
      setTimeLeft(40)

      timerIntervalRef.current = setInterval(() => {
        if (timeLeftRef.current !== null && timeLeftRef.current > 0) {
          timeLeftRef.current = timeLeftRef.current - 1
          setTimeLeft(timeLeftRef.current)
        } else {
          // Tiempo agotado - pasar turno automáticamente
          if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current)
            timerIntervalRef.current = null
          }
          setTimeLeft(null)
          timeLeftRef.current = null
          
          // Pasar turno automáticamente
          toast.showWarning('Tiempo agotado. Pasando al siguiente jugador...')
          handleEndTurn()
        }
      }, 1000)
    }

    // Cleanup al desmontar o cambiar de turno
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
        timerIntervalRef.current = null
      }
    }
  }, [session?.current_turn, session?.status, currentUserId, diceResult, sessionId, fetchSession, toast])

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

  const handleBuyPropertyFromPlayer = async (playerCountryId: string) => {
    try {
      const response = await fetch('/api/game/buy-property-from-player', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          playerCountryId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al comprar propiedad')
      }

      toast.showSuccess(data.message || 'Propiedad comprada exitosamente')
      soundManager?.play('buy_property')
      setActionRequired(null)
      setPropertyForSale(null)
      setCurrentCountry(null)
      setCanBuyCountry(false)
      fetchSession()
    } catch (err: any) {
      toast.showError(err.message)
      soundManager?.play('error')
    }
  }

  const handleSellProperty = async (playerCountryId: string, salePrice: number, isForSale: boolean) => {
    try {
      const response = await fetch('/api/game/sell-property', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          playerCountryId,
          salePrice,
          isForSale,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al actualizar estado de venta')
      }

      toast.showSuccess(data.message || 'Estado de venta actualizado')
      fetchSession()
    } catch (err: any) {
      toast.showError(err.message)
      soundManager?.play('error')
    }
  }

  const handleMortgage = async (playerCountryId: string) => {
    try {
      const response = await fetch('/api/game/mortgage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          playerCountryId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al hipotecar propiedad')
      }

      toast.showSuccess(data.message)
      soundManager?.play('money_received')
      fetchSession()
    } catch (err: any) {
      toast.showError(err.message)
      soundManager?.play('error')
    }
  }

  const handleUnmortgage = async (playerCountryId: string) => {
    try {
      const response = await fetch('/api/game/unmortgage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          playerCountryId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al deshipotecar propiedad')
      }

      toast.showSuccess(data.message)
      soundManager?.play('pay_toll')
      fetchSession()
    } catch (err: any) {
      toast.showError(err.message)
      soundManager?.play('error')
    }
  }

  const handleBuild = async (countryId: string, houses: number, hotels: number) => {
    try {
      const response = await fetch('/api/game/build', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          countryId,
          houses,
          hotels,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al construir')
      }

      toast.showSuccess(data.message)
      soundManager?.play('buy_property')
      fetchSession()
    } catch (err: any) {
      toast.showError(err.message)
      soundManager?.play('error')
    }
  }

  const handleSellBuild = async (playerCountryId: string, houses: number, hotels: number) => {
    try {
      const response = await fetch('/api/game/sell-build', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          playerCountryId,
          houses,
          hotels,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al vender construcciones')
      }

      toast.showSuccess(data.message)
      soundManager?.play('money_received')
      fetchSession()
    } catch (err: any) {
      toast.showError(err.message)
      soundManager?.play('error')
    }
  }

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
      soundManager?.play('buy_property')
      setCanBuyCountry(false)
      setActionRequired(null)
      setCurrentCountry(null)
      fetchSession()
    } catch (err: any) {
      toast.showError(err.message)
      soundManager?.play('error')
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
        soundManager?.play('error')
      } else {
        toast.showSuccess(data.message)
        soundManager?.play('pay_toll')
      }

      setNeedsToPayToll(false)
      setActionRequired(null)
      fetchSession()
    } catch (err: any) {
      toast.showError(err.message)
      soundManager?.play('error')
    }
  }

  const handleEndTurn = async () => {
    // Limpiar el cronómetro
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current)
      timerIntervalRef.current = null
    }
    setTimeLeft(null)
    timeLeftRef.current = null

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

      if (data.usedExtraTurn) {
        toast.showSuccess('Has usado tu turno extra. Puedes tirar los dados de nuevo.')
        // No resetear el estado completamente, solo permitir tirar dados de nuevo
        setDiceResult(null)
        setActionRequired(null)
        setCurrentCountry(null)
        setCanBuyCountry(false)
        setNeedsToPayToll(false)
      } else {
        toast.showInfo('Turno finalizado')
        setActionRequired(null)
        setDiceResult(null)
        setCurrentCountry(null)
        setCanBuyCountry(false)
        setNeedsToPayToll(false)
      }
      fetchSession()
    } catch (err: any) {
      toast.showError(err.message)
      soundManager?.play('error')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-cyan-400 border-t-transparent mx-auto mb-4"></div>
          <p className="text-white/80 text-lg">Cargando partida...</p>
        </div>
      </div>
    )
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <div className="bg-white/10 backdrop-blur-md rounded-xl shadow-lg p-8 max-w-md border border-white/20">
          <h1 className="text-2xl font-bold mb-4 text-red-400">Error</h1>
          <p className="text-white/80 mb-4">{error || 'Sesión no encontrada'}</p>
          <Link
            href="/dashboard"
            className="inline-block bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-6 py-3 rounded-lg hover:from-cyan-600 hover:to-blue-700 transition"
          >
            Volver al Dashboard
          </Link>
        </div>
      </div>
    )
  }

  if (session.status !== 'active') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <div className="bg-white/10 backdrop-blur-md rounded-xl shadow-lg p-8 max-w-md text-center border border-white/20">
          <h1 className="text-2xl font-bold mb-4 text-white">Partida no iniciada</h1>
          <p className="text-white/80 mb-6">
            {session.status === 'waiting' 
              ? 'La partida aún no ha comenzado'
              : 'La partida ha finalizado'}
          </p>
          <Link
            href={`/lobby/${sessionId}`}
            className="inline-block bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-6 py-3 rounded-lg hover:from-cyan-600 hover:to-blue-700 transition"
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

  const handleCloseClick = () => {
    if (!isHost) return
    setShowCloseConfirm(true)
  }

  const handleCloseConfirm = async () => {
    setShowCloseConfirm(false)
    
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 relative pb-20 md:pb-20">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 py-2 sm:py-3">
        {/* Header */}
        <div className="mb-2">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 mb-1 transition text-xs sm:text-sm"
          >
            <span>←</span>
            <span>Volver</span>
          </Link>
          <div className="bg-white/10 backdrop-blur-md rounded-lg shadow-md p-2 sm:p-3 border border-white/20">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-white mb-1">Turix</h1>
                <div className="flex items-center gap-2">
                  <p className="text-white/80 text-xs sm:text-sm">
                    Turno: {currentPlayer?.profile.username || 'Cargando...'}
                  </p>
                  {isMyTurn && timeLeft !== null && timeLeft > 0 && (
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full font-semibold ${
                      timeLeft <= 10 
                        ? 'bg-red-500/20 text-red-300 animate-pulse border border-red-400/30' 
                        : timeLeft <= 20 
                        ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-400/30' 
                        : 'bg-green-500/20 text-green-300 border border-green-400/30'
                    }`}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{timeLeft}s</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <p className="text-xs text-white/60">Sesión</p>
                  <p className="text-sm font-semibold text-white">
                    {session.current_players} jugadores
                  </p>
                </div>
                {isHost && (
                  <button
                    onClick={handleCloseClick}
                    className="px-2 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold text-xs shadow-md"
                    title="Cerrar partida"
                  >
                    🚪 Cerrar
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 sm:gap-3 items-start">
          {/* Tablero / Área Principal */}
          <div className="lg:col-span-2 order-1">
            <div className="bg-white/10 backdrop-blur-md rounded-lg shadow-md p-2 sm:p-3 mb-2 border border-white/20">
              <h2 className="text-sm sm:text-base font-bold mb-1 sm:mb-2 text-center text-white">
                Casilla Actual {myPlayer ? `- Casilla ${myPlayer.position}` : ''}
              </h2>
              <div className="bg-gradient-to-br from-white/5 to-white/10 rounded-lg p-1 sm:p-2">
                {countries.length > 0 && myPlayer ? (
                  <CountryCarousel
                    countries={countries}
                    players={session.players}
                    currentPlayer={myPlayer}
                    playerCountries={playerCountries}
                    isMyTurn={isMyTurn}
                    onBuyCountry={handleBuyCountry}
                    onBuyPropertyFromPlayer={handleBuyPropertyFromPlayer}
                    onEndTurn={handleEndTurn}
                    actionRequired={actionRequired}
                  />
                ) : (
                  <div className="min-h-[200px] flex items-center justify-center">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mx-auto mb-2"></div>
                      <p className="text-white/80 text-sm">Cargando casilla...</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Acciones del Turno */}
            {isMyTurn && (
              <div className="hidden md:block bg-white/10 backdrop-blur-md rounded-lg shadow-md p-2 sm:p-3 space-y-2 order-2 lg:order-2 border border-white/20">
                <h3 className="text-sm sm:text-base font-bold mb-1 sm:mb-2 text-white">Tu Turno</h3>
                
                {/* Animación de dados - pequeña, arriba del botón */}
                {showDiceAnimation && (
                  <div className="mb-2">
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
                    className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-2 px-3 rounded-lg hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-semibold text-sm shadow-md"
                  >
                    {rolling ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Tirando dados...
                      </span>
                    ) : (
                      '🎲 Tirar Dados'
                    )}
                  </button>
                )}

                {diceResult && !showDiceAnimation && (
                  <div className="text-center p-2 bg-cyan-500/20 rounded-lg border border-cyan-400/30">
                    <p className="text-3xl font-bold text-cyan-400 mb-1">{diceResult}</p>
                    <p className="text-white/70 text-xs">Resultado de los dados</p>
                  </div>
                )}

                {/* Propiedad en venta */}
                {actionRequired === 'can_buy_from_player' && propertyForSale && currentCountry && (
                  <div className="bg-purple-50 border-2 border-purple-500 rounded-lg p-2">
                    <p className="font-semibold text-purple-800 mb-1 text-xs sm:text-sm">
                      🏪 {currentCountry.name} está en venta
                    </p>
                    <p className="text-xs text-purple-700 mb-2">
                      Precio: ${propertyForSale.salePrice.toLocaleString()}
                    </p>
                    {myPlayer && myPlayer.money >= propertyForSale.salePrice ? (
                      <button
                        onClick={() => handleBuyPropertyFromPlayer(propertyForSale.playerCountryId)}
                        className="w-full bg-purple-600 text-white py-1.5 px-3 rounded-lg hover:bg-purple-700 transition font-semibold text-xs sm:text-sm"
                      >
                        💰 Comprar
                      </button>
                    ) : (
                      <div className="bg-red-500/20 border-2 border-red-500/50 rounded-lg p-2">
                        <p className="text-xs text-red-800 font-semibold text-center">
                          ⚠️ No tienes suficiente dinero
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Acciones después de tirar dados */}
                {/* No mostrar información de compra si estamos en una casilla especial (0, 10, 20, 30) */}
                {(actionRequired === 'can_buy' || canBuyCountry) && currentCountry && !propertyForSale && myPlayer && ![0, 10, 20, 30].includes(myPlayer.position) && (
                  <div className="bg-green-50 border-2 border-green-500 rounded-lg p-2">
                    <p className="font-semibold text-green-800 mb-1 text-xs sm:text-sm">
                      🏛️ {currentCountry.name} disponible
                    </p>
                    <p className="text-xs text-green-700 mb-2">
                      Precio: ${currentCountry.price.toLocaleString()}
                    </p>
                    {myPlayer && myPlayer.money >= currentCountry.price ? (
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => handleBuyCountry()}
                          className="flex-1 bg-green-600 text-white py-1.5 px-2 rounded-lg hover:bg-green-700 transition font-semibold text-xs"
                        >
                          ✅ Comprar
                        </button>
                        <button
                          onClick={handleEndTurn}
                          className="flex-1 bg-white/10 hover:bg-white/20 text-white py-1.5 px-2 rounded-lg transition font-semibold text-xs border border-white/20"
                        >
                          ❌ Pasar
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <div className="bg-red-500/20 border-2 border-red-500/50 rounded-lg p-2">
                          <p className="text-xs text-red-800 font-semibold text-center">
                            ⚠️ No tienes suficiente dinero
                          </p>
                        </div>
                        <button
                          onClick={handleEndTurn}
                          className="w-full bg-gray-600 text-white py-1.5 px-3 rounded-lg hover:bg-gray-700 transition font-semibold text-xs"
                        >
                          ✅ Pasar Turno
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {actionRequired === 'pay_toll' && needsToPayToll && (
                  <div className="bg-red-50 border-2 border-red-500 rounded-lg p-2">
                    <p className="font-semibold text-red-800 mb-1 text-xs sm:text-sm">
                      💰 Debes pagar peaje
                    </p>
                    <p className="text-xs text-red-700 mb-2">
                      Cantidad: ${tollAmount.toLocaleString()}
                    </p>
                    <button
                      onClick={handlePayToll}
                      className="w-full bg-red-600 text-white py-1.5 px-3 rounded-lg hover:bg-red-700 transition font-semibold text-xs"
                    >
                      💵 Pagar Peaje
                    </button>
                  </div>
                )}

                {actionRequired === 'start_bonus' && (
                  <div className="bg-yellow-50 border-2 border-yellow-500 rounded-lg p-2">
                    <p className="font-semibold text-yellow-800 text-xs sm:text-sm">
                      🎉 ¡Has pasado por el inicio! +$100
                    </p>
                  </div>
                )}

                {actionRequired === 'jail_fine' && (
                  <div className="bg-red-50 border-2 border-red-500 rounded-lg p-2">
                    <p className="font-semibold text-red-800 text-xs sm:text-sm">
                      🚔 Has pagado multa en la cárcel: -$150
                    </p>
                  </div>
                )}

                {actionRequired === 'airport_extra_turn' && (
                  <div className="bg-blue-50 border-2 border-blue-500 rounded-lg p-2">
                    <p className="font-semibold text-blue-800 text-xs sm:text-sm">
                      ✈️ ¡Aeropuerto! Turno extra
                    </p>
                  </div>
                )}

                {actionRequired === 'bank_bonus' && (
                  <div className="bg-green-50 border-2 border-green-500 rounded-lg p-2">
                    <p className="font-semibold text-green-800 text-xs sm:text-sm">
                      🏦 ¡Bono del banco! +$300
                    </p>
                  </div>
                )}

                {actionRequired === 'bank_tax' && (
                  <div className="bg-orange-50 border-2 border-orange-500 rounded-lg p-2">
                    <p className="font-semibold text-orange-800 text-xs sm:text-sm">
                      🏦 Has pagado impuesto: -$200
                    </p>
                  </div>
                )}

                {/* Botón para usar turno extra del aeropuerto */}
                {actionRequired === 'airport_extra_turn' && (
                  <button
                    onClick={handleEndTurn}
                    className="w-full bg-blue-600 text-white py-1.5 px-3 rounded-lg hover:bg-blue-700 transition font-semibold text-xs"
                  >
                    ✈️ Usar Turno Extra
                  </button>
                )}

                {actionRequired && !canBuyCountry && !needsToPayToll && !propertyForSale && 
                 actionRequired !== 'start_bonus' && actionRequired !== 'bank_tax' && 
                 actionRequired !== 'bank_bonus' && actionRequired !== 'jail_fine' && 
                 actionRequired !== 'airport_extra_turn' && actionRequired !== 'can_buy_from_player' && (
                  <button
                    onClick={handleEndTurn}
                    className="w-full bg-gray-600 text-white py-1.5 px-3 rounded-lg hover:bg-gray-700 transition font-semibold text-xs"
                  >
                    ✅ Finalizar Turno
                  </button>
                )}
              </div>
            )}

            {!isMyTurn && currentPlayer && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2">
                <p className="text-center text-yellow-800 font-semibold text-xs sm:text-sm">
                  ⏳ Esperando turno de {currentPlayer.profile.username}
                </p>
              </div>
            )}
          </div>

          {/* Panel Lateral - Mobile First */}
          <div className="space-y-2 self-start">
            {/* Mi Información - Siempre visible */}
            {myPlayer && (
              <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg shadow-md p-2 sm:p-3 text-white">
                <h3 className="text-xs sm:text-sm font-bold mb-1 sm:mb-2">Tu Información</h3>
                <div className="flex flex-row sm:flex-col gap-2 sm:gap-1.5 sm:space-y-1.5">
                  <div className="flex-1 sm:flex-none">
                    <p className="text-xs opacity-90">Jugador</p>
                    <p className="text-xs sm:text-sm font-semibold truncate">{myPlayer.profile.username}</p>
                  </div>
                  <div className="flex-1 sm:flex-none">
                    <p className="text-xs opacity-90">Dinero</p>
                    <p className="text-sm sm:text-base font-bold">${myPlayer.money.toLocaleString()}</p>
                  </div>
                  <div className="flex-1 sm:flex-none">
                    <p className="text-xs opacity-90">Posición</p>
                    <p className="text-xs sm:text-sm font-semibold">Casilla {myPlayer.position}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Historial de Transacciones - Solo visible cuando se hace clic en desktop */}
            {showHistory && (
              <div className="hidden md:block">
                <div className="bg-white/10 backdrop-blur-md rounded-lg shadow-md p-3 mb-2 border border-white/20">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-bold text-white">Historial</h3>
                    <button
                      onClick={() => {
                        setShowHistory(false)
                        setActiveDesktopTab(null)
                      }}
                      className="text-white/60 hover:text-white"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <TransactionHistory sessionId={sessionId} />
                </div>
              </div>
            )}

            {/* Mis Propiedades - Solo visible cuando se hace clic en desktop */}
            {showProperties && myPlayer && (() => {
              // Mapeo de colores a nombres de continentes
              const continentNames: Record<string, string> = {
                'blue': 'América del Norte',
                'pink': 'Europa',
                'orange': 'Asia',
                'red': 'América del Sur',
                'yellow': 'África',
                'green': 'Oceanía',
                'purple': 'Especial',
                'america': 'América',
                // Monopolios del tablero Nuevo León
                'Capital Regia': 'Capital Regia',
                'Ruta Citrícola': 'Ruta Citrícola',
                'Corredor Industrial': 'Corredor Industrial',
                'Tierras Nuevas': 'Tierras Nuevas',
                'Transporte': 'Transporte',
                'Atracciones Turísticas': 'Atracciones Turísticas',
                'Atracciones deportivas': 'Atracciones deportivas',
                'europa': 'Europa',
                'asia': 'Asia',
                'africa': 'África',
                'oceania': 'Oceanía',
                'especial': 'Especial',
              }

              // Obtener propiedades del jugador actual
              const myProperties = playerCountries
                .filter(pc => pc.player_id === myPlayer.id)
                .map(pc => {
                  const country = countries.find(c => c.id === pc.country_id)
                  return country ? { ...pc, country } : null
                })
                .filter((item): item is any => item !== null)

              // Agrupar propiedades por monopoly_group (si existe) o por continente
              const propertiesByGroup = myProperties.reduce((acc: Record<string, any[]>, prop: any) => {
                // Si tiene monopoly_group, usar ese; si no, usar continent
                const groupKey = prop.country.monopoly_group || prop.country.continent
                if (!acc[groupKey]) {
                  acc[groupKey] = []
                }
                acc[groupKey].push(prop)
                return acc
              }, {})

              // Calcular progreso de monopolio para cada grupo
              const groupProgress = Object.keys(propertiesByGroup).map(groupKey => {
                // Determinar si es un monopoly_group o un continent
                const firstProp = propertiesByGroup[groupKey][0]
                const isMonopolyGroup = !!firstProp.country.monopoly_group
                
                // Obtener países del grupo
                const groupCountries = countries.filter(c => {
                  if (isMonopolyGroup) {
                    // Para grupos de monopolio, incluir todas las propiedades del grupo
                    // (ciudades, estadios, transporte, atracciones, etc.)
                    return c.monopoly_group === groupKey
                  } else {
                    return c.continent === groupKey
                  }
                })
                
                const ownedCount = propertiesByGroup[groupKey].length
                const totalCount = groupCountries.length
                
                // Verificar monopolio usando el método correcto
                const hasMonopolyStatus = isMonopolyGroup
                  ? hasMonopoly(groupKey, myPlayer.id, countries, playerCountries, true)
                  : hasMonopoly(groupKey, myPlayer.id, countries, playerCountries, false)
                
                // Obtener nombre del grupo
                const groupName = isMonopolyGroup 
                  ? groupKey // Usar el nombre del monopolio directamente
                  : (continentNames[groupKey] || groupKey)
                
                return {
                  groupKey,
                  groupName,
                  isMonopolyGroup,
                  properties: propertiesByGroup[groupKey].sort((a, b) => a.country.position - b.country.position),
                  ownedCount,
                  totalCount,
                  hasMonopoly: hasMonopolyStatus,
                }
              }).sort((a, b) => a.groupName.localeCompare(b.groupName))

              return (
                <div className="hidden md:block bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg shadow-md p-2 sm:p-3 text-white">
                  <div className="flex items-center justify-between mb-1.5">
                    <h4 className="text-xs sm:text-sm font-semibold flex items-center gap-1.5">
                      <span>🏛️</span>
                      <span>Mis Propiedades ({myProperties.length})</span>
                    </h4>
                    <button
                      onClick={() => {
                        setShowProperties(false)
                        setActiveDesktopTab(null)
                      }}
                      className="text-white/80 hover:text-white"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  {myProperties.length === 0 ? (
                      <p className="text-xs opacity-80 text-center py-1">
                        No tienes propiedades aún
                      </p>
                    ) : (
                      <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
                        {groupProgress.map(({ groupKey, groupName, properties, ownedCount, totalCount, hasMonopoly }) => (
                          <div key={groupKey} className="bg-white/10 hover:bg-white/20 rounded p-1.5 transition-colors">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-xs">🌍 {groupName}</span>
                                {hasMonopoly && (
                                  <span className="bg-green-500/30 text-green-200 px-1 py-0.5 rounded text-xs font-semibold">
                                    ✅
                                  </span>
                                )}
                              </div>
                              <span className="text-xs opacity-90">
                                {ownedCount}/{totalCount}
                              </span>
                            </div>
                            {!hasMonopoly && (
                              <p className="text-xs opacity-80 mb-1">
                                Faltan {totalCount - ownedCount}
                              </p>
                            )}
                            <div className="space-y-1">
                              {properties.map((prop: any) => {
                                // Verificar si puede construir
                                const gameState = {
                                  sessionId,
                                  players: session.players,
                                  playerCountries,
                                  countries,
                                  currentTurn: session.current_turn,
                                }
                                const buildCheck = canBuild(prop.country, myPlayer.id, gameState)
                                
                                return (
                                  <div
                                    key={prop.id}
                                    className="bg-white/5 hover:bg-white/10 rounded p-1 transition-colors"
                                  >
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-xs truncate">
                                          {prop.country.name}
                                        </p>
                                        <div className="flex items-center gap-1 mt-0.5 text-xs opacity-90 flex-wrap">
                                          <span>📍 {prop.country.position}</span>
                                          {prop.is_mortgaged && (
                                            <span className="bg-yellow-500/30 text-yellow-200 px-1 py-0.5 rounded text-xs">
                                              ⚠️
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex flex-col items-end gap-0.5 ml-1">
                                        {prop.hotels > 0 ? (
                                          <div className="flex items-center gap-0.5">
                                            <span className="text-sm">🏨</span>
                                            <span className="text-xs font-semibold">{prop.hotels}</span>
                                          </div>
                                        ) : prop.houses > 0 ? (
                                          <div className="flex items-center gap-0.5">
                                            <span className="text-xs">🏠</span>
                                            <span className="text-xs font-semibold">{prop.houses}</span>
                                          </div>
                                        ) : null}
                                      </div>
                                    </div>
                                    <div className="mt-2 pt-2 border-t border-white/20">
                                      <BankModal
                                        property={{
                                          id: prop.id,
                                          country: prop.country,
                                          houses: prop.houses || 0,
                                          hotels: prop.hotels || 0,
                                          is_mortgaged: prop.is_mortgaged || false,
                                        }}
                                        playerMoney={myPlayer.money}
                                        canBuild={buildCheck.canBuild || false}
                                        maxHouses={buildCheck.maxHouses || 0}
                                        maxHotels={buildCheck.maxHotels || 0}
                                        onMortgage={() => {
                                          handleMortgage(prop.id)
                                        }}
                                        onUnmortgage={() => {
                                          handleUnmortgage(prop.id)
                                        }}
                                        onBuild={(houses, hotels) => {
                                          handleBuild(prop.country.id, houses, hotels)
                                        }}
                                        onSellBuild={(houses, hotels) => {
                                          handleSellBuild(prop.id, houses, hotels)
                                        }}
                                      />
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                </div>
              )
            })()}

            {/* Monopolios de Continentes */}
            {(() => {
              // Mapeo de colores a nombres de continentes
              const continentNames: Record<string, string> = {
                'blue': 'América del Norte',
                'pink': 'Europa',
                'orange': 'Asia',
                'red': 'América del Sur',
                'yellow': 'África',
                'green': 'Oceanía',
                'purple': 'Especial',
                // Monopolios del tablero Nuevo León
                'Capital Regia': 'Capital Regia',
                'Ruta Citrícola': 'Ruta Citrícola',
                'Corredor Industrial': 'Corredor Industrial',
                'Tierras Nuevas': 'Tierras Nuevas',
                'Transporte': 'Transporte',
                'Atracciones Turísticas': 'Atracciones Turísticas',
                'Atracciones deportivas': 'Atracciones deportivas',
              }
              
              // Calcular monopolios de todos los jugadores
              const monopolies: Array<{ playerId: string; playerName: string; playerColor: string; groups: string[] }> = []
              
              if (session && countries.length > 0 && playerCountries.length > 0) {
                // Obtener todos los grupos únicos (monopoly_group o continent)
                const allGroups = new Set<string>()
                countries.forEach(c => {
                  if (c.monopoly_group && c.property_type === 'city') {
                    allGroups.add(c.monopoly_group)
                  } else {
                    allGroups.add(c.continent)
                  }
                })
                
                // Para cada jugador, verificar qué grupos tiene en monopolio
                session.players.forEach(player => {
                  const playerMonopolies: string[] = []
                  
                  allGroups.forEach(groupKey => {
                    // Determinar si es un monopoly_group o un continent
                    const sampleCountry = countries.find(c => 
                      (c.monopoly_group === groupKey && c.property_type === 'city') || 
                      (c.continent === groupKey && !c.monopoly_group)
                    )
                    const isMonopolyGroup = sampleCountry?.monopoly_group === groupKey
                    
                    if (hasMonopoly(groupKey, player.id, countries, playerCountries, isMonopolyGroup)) {
                      // Obtener nombre del grupo
                      const groupName = isMonopolyGroup 
                        ? groupKey // Usar el nombre del monopolio directamente
                        : (continentNames[groupKey] || groupKey)
                      playerMonopolies.push(groupName)
                    }
                  })
                  
                  if (playerMonopolies.length > 0) {
                    monopolies.push({
                      playerId: player.id,
                      playerName: player.profile.username,
                      playerColor: player.color,
                      groups: playerMonopolies
                    })
                  }
                })
              }
              
              const continentIcons: Record<string, string> = {
                'América del Norte': '🌎',
                'América del Sur': '🌎',
                'Europa': '🌍',
                'Asia': '🌏',
                'África': '🌍',
                'Oceanía': '🌏',
                'Especial': '⭐',
                // Monopolios del tablero Nuevo León
                'Capital Regia': '🏛️',
                'Ruta Citrícola': '🍊',
                'Corredor Industrial': '🏭',
                'Tierras Nuevas': '🌾',
                'Transporte': '🚇',
                'Atracciones Turísticas': '🎡',
                'Atracciones deportivas': '⚽',
              }
              
              const continentColors: Record<string, string> = {
                'América del Norte': 'from-blue-500 to-blue-600',
                'América del Sur': 'from-red-500 to-red-600',
                'Europa': 'from-pink-500 to-pink-600',
                'Asia': 'from-orange-500 to-orange-600',
                'África': 'from-yellow-500 to-yellow-600',
                'Oceanía': 'from-green-500 to-green-600',
                'Especial': 'from-purple-500 to-purple-600',
                // Monopolios del tablero Nuevo León
                'Capital Regia': 'from-blue-500 to-blue-600',
                'Ruta Citrícola': 'from-orange-500 to-orange-600',
                'Corredor Industrial': 'from-pink-500 to-pink-600',
                'Tierras Nuevas': 'from-yellow-500 to-yellow-600',
                'Transporte': 'from-purple-500 to-purple-600',
                'Atracciones Turísticas': 'from-green-500 to-green-600',
                'Atracciones deportivas': 'from-yellow-500 to-yellow-600',
              }
              
              return monopolies.length > 0 ? (
                <div className="bg-white/10 backdrop-blur-md rounded-xl shadow-lg p-4 sm:p-6 order-2 border border-white/20">
                  <h3 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 flex items-center gap-2 text-white">
                    <span className="text-2xl">👑</span>
                    Monopolios de Continentes
                  </h3>
                  <div className="space-y-3">
                    {monopolies.map((monopoly) => (
                      <div
                        key={monopoly.playerId}
                        className="border-2 rounded-lg p-3"
                        style={{
                          borderColor: getColorHex(monopoly.playerColor),
                          backgroundColor: `${getColorHex(monopoly.playerColor)}20`,
                        }}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: getColorHex(monopoly.playerColor) }}
                          />
                          <p className="font-semibold text-white">{monopoly.playerName}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {monopoly.groups.map((group) => (
                            <div
                              key={group}
                              className={`bg-gradient-to-r ${continentColors[group] || 'from-gray-500 to-gray-600'} text-white px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1 shadow-md`}
                            >
                              <span>{continentIcons[group] || '🌍'}</span>
                              <span>{group}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null
            })()}

            {/* Vista del Tablero - Solo visible en desktop */}
            <div className="lg:col-span-2 order-2 lg:order-3 hidden md:block">
              <div className="bg-white/10 backdrop-blur-md rounded-xl shadow-lg p-4 sm:p-6 border border-white/20">
                <BoardOverview
                  countries={countries}
                  players={session.players}
                  currentUserId={currentUserId}
                  currentTurn={session.current_turn}
                  playerCountries={playerCountries}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Component */}
      {currentUserId && (
        <Chat 
          sessionId={sessionId} 
          currentUserId={currentUserId}
          onUnreadCountChange={setChatUnreadCount}
          forceOpen={showChat}
          onOpenChange={(isOpen) => {
            if (!isOpen) {
              setShowChat(false)
            }
          }}
        />
      )}
      
      {/* Configuración de sonido */}
      <SoundSettings />

      {/* Componentes móviles flotantes */}
      {isMyTurn && (
        <>
          <FloatingDiceButton
            isMyTurn={isMyTurn}
            diceResult={diceResult}
            rolling={rolling}
            showDiceAnimation={showDiceAnimation}
            onRollDice={handleRollDice}
            die1={diceDetails.die1}
            die2={diceDetails.die2}
          />
          <FloatingActions
            isMyTurn={isMyTurn}
            onEndTurn={handleEndTurn}
            onOpenProperties={() => {
              setShowProperties(true)
              setShowBoardOverview(false)
              setShowHistory(false)
              setShowChat(false)
            }}
            canEndTurn={!showDiceAnimation && (actionRequired === null || actionRequired === 'start_bonus' || actionRequired === 'bank_tax' || actionRequired === 'bank_bonus' || actionRequired === 'jail_fine' || actionRequired === 'airport_extra_turn' || (!canBuyCountry && !needsToPayToll && !propertyForSale))}
          />
        </>
      )}

      {/* Navegación inferior móvil */}
      <MobileBottomNav
        onShowBoard={() => {
          setShowBoardOverview(true)
          setShowProperties(false)
          setShowHistory(false)
          setShowChat(false)
        }}
        onShowProperties={() => {
          setShowProperties(true)
          setShowBoardOverview(false)
          setShowHistory(false)
          setShowChat(false)
        }}
        onShowHistory={() => {
          setShowHistory(true)
          setShowBoardOverview(false)
          setShowProperties(false)
          setShowChat(false)
        }}
        onShowChat={() => {
          // El chat se maneja internamente, solo necesitamos abrir/cerrar
          // No podemos controlar directamente el estado del chat desde aquí
          // pero podemos hacer scroll hacia el botón del chat
          setShowChat(!showChat)
          setShowBoardOverview(false)
          setShowProperties(false)
          setShowHistory(false)
        }}
        unreadChatCount={chatUnreadCount}
      />

      {/* Navegación inferior desktop */}
      <DesktopBottomNav
        onShowBoard={() => {
          if (activeDesktopTab === 'board') {
            setShowBoardOverview(false)
            setActiveDesktopTab(null)
          } else {
            setShowBoardOverview(true)
            setShowProperties(false)
            setShowHistory(false)
            setShowChat(false)
            setActiveDesktopTab('board')
          }
        }}
        onShowProperties={() => {
          if (activeDesktopTab === 'properties') {
            setShowProperties(false)
            setActiveDesktopTab(null)
          } else {
            setShowProperties(true)
            setShowBoardOverview(false)
            setShowHistory(false)
            setShowChat(false)
            setActiveDesktopTab('properties')
          }
        }}
        onShowHistory={() => {
          if (activeDesktopTab === 'history') {
            setShowHistory(false)
            setActiveDesktopTab(null)
          } else {
            setShowHistory(true)
            setShowBoardOverview(false)
            setShowProperties(false)
            setShowChat(false)
            setActiveDesktopTab('history')
          }
        }}
        onShowChat={() => {
          if (activeDesktopTab === 'chat') {
            setShowChat(false)
            setActiveDesktopTab(null)
          } else {
            setShowChat(true)
            setShowBoardOverview(false)
            setShowProperties(false)
            setShowHistory(false)
            setActiveDesktopTab('chat')
          }
        }}
        unreadChatCount={chatUnreadCount}
        activeTab={activeDesktopTab}
      />

      {/* Modales móviles para propiedades e historial */}
      {showProperties && myPlayer && (
        <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 z-50 md:hidden overflow-y-auto pb-20">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-white">Mis Propiedades</h2>
              <button
                onClick={() => setShowProperties(false)}
                className="text-white/60 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {(() => {
              // Mapeo de colores a nombres de continentes
              const continentNames: Record<string, string> = {
                'blue': 'América del Norte',
                'pink': 'Europa',
                'orange': 'Asia',
                'red': 'América del Sur',
                'yellow': 'África',
                'green': 'Oceanía',
                'purple': 'Especial',
                'america': 'América',
                // Monopolios del tablero Nuevo León
                'Capital Regia': 'Capital Regia',
                'Ruta Citrícola': 'Ruta Citrícola',
                'Corredor Industrial': 'Corredor Industrial',
                'Tierras Nuevas': 'Tierras Nuevas',
                'Transporte': 'Transporte',
                'Atracciones Turísticas': 'Atracciones Turísticas',
                'Atracciones deportivas': 'Atracciones deportivas',
                'europa': 'Europa',
                'asia': 'Asia',
                'africa': 'África',
                'oceania': 'Oceanía',
                'especial': 'Especial',
              }

              const myProperties = playerCountries
                .filter(pc => pc.player_id === myPlayer.id)
                .map(pc => {
                  const country = countries.find(c => c.id === pc.country_id)
                  return country ? { ...pc, country } : null
                })
                .filter((item): item is any => item !== null)

              if (myProperties.length === 0) {
                return (
                  <div className="text-center py-8">
                    <p className="text-white/60">No tienes propiedades aún</p>
                  </div>
                )
              }

              // Agrupar propiedades por monopoly_group (si existe) o por continente
              const propertiesByGroup = myProperties.reduce((acc: Record<string, any[]>, prop: any) => {
                // Si tiene monopoly_group, usar ese; si no, usar continent
                const groupKey = prop.country.monopoly_group || prop.country.continent
                if (!acc[groupKey]) {
                  acc[groupKey] = []
                }
                acc[groupKey].push(prop)
                return acc
              }, {})

              // Calcular progreso de monopolio para cada grupo
              const groupProgress = Object.keys(propertiesByGroup).map(groupKey => {
                // Determinar si es un monopoly_group o un continent
                const firstProp = propertiesByGroup[groupKey][0]
                const isMonopolyGroup = !!firstProp.country.monopoly_group
                
                // Obtener países del grupo
                const groupCountries = countries.filter(c => {
                  if (isMonopolyGroup) {
                    // Para grupos de monopolio, incluir todas las propiedades del grupo
                    // (ciudades, estadios, transporte, atracciones, etc.)
                    return c.monopoly_group === groupKey
                  } else {
                    return c.continent === groupKey
                  }
                })
                
                const ownedCount = propertiesByGroup[groupKey].length
                const totalCount = groupCountries.length
                
                // Verificar monopolio usando el método correcto
                const hasMonopolyStatus = isMonopolyGroup
                  ? hasMonopoly(groupKey, myPlayer.id, countries, playerCountries, true)
                  : hasMonopoly(groupKey, myPlayer.id, countries, playerCountries, false)
                
                // Obtener nombre del grupo
                const groupName = isMonopolyGroup 
                  ? groupKey // Usar el nombre del monopolio directamente
                  : (continentNames[groupKey] || groupKey)
                
                return {
                  groupKey,
                  groupName,
                  isMonopolyGroup,
                  properties: propertiesByGroup[groupKey].sort((a, b) => a.country.position - b.country.position),
                  ownedCount,
                  totalCount,
                  hasMonopoly: hasMonopolyStatus,
                }
              }).sort((a, b) => a.groupName.localeCompare(b.groupName))

              return (
                <div className="space-y-6">
                  {groupProgress.map(({ groupKey, groupName, properties, ownedCount, totalCount, hasMonopoly }) => (
                    <div key={groupKey} className="bg-white/10 backdrop-blur-md rounded-lg shadow-md p-4 border-2 border-white/20">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="text-2xl flex-shrink-0">🌍</span>
                          <h3 className="font-bold text-lg text-white truncate">{groupName}</h3>
                          {hasMonopoly && (
                            <span className="bg-green-500/30 text-green-100 border border-green-400/50 px-2 py-1 rounded-full text-xs font-semibold flex-shrink-0">
                              ✅ Monopolio
                            </span>
                          )}
                        </div>
                        <span className="text-sm font-semibold text-white bg-cyan-500/30 px-3 py-1 rounded-full border border-cyan-400/50 flex-shrink-0 ml-2">
                          {ownedCount}/{totalCount}
                        </span>
                      </div>
                      {!hasMonopoly && (
                        <div className="mb-3 p-3 bg-yellow-500/30 border border-yellow-400/50 rounded-lg">
                          <p className="text-sm text-yellow-100 font-semibold">
                            ⚠️ Faltan {totalCount - ownedCount} {totalCount - ownedCount === 1 ? 'propiedad' : 'propiedades'} para el monopolio
                          </p>
                        </div>
                      )}
                      <div className="space-y-3">
                        {properties.map((prop: any) => (
                          <div key={prop.id} className="bg-white/15 backdrop-blur-sm rounded-lg shadow p-4 border border-white/30">
                            <h4 className="font-bold text-base mb-2 text-white">{prop.country.name}</h4>
                            <div className="space-y-2 text-sm">
                              <p className="text-white/90">📍 Casilla {prop.country.position}</p>
                              <p className="text-white/90">💰 Renta base: ${prop.country.base_rent.toLocaleString()}</p>
                              {prop.houses > 0 && <p className="text-white/90">🏠 Casas: {prop.houses}</p>}
                              {prop.hotels > 0 && <p className="text-white/90">🏨 Hoteles: {prop.hotels}</p>}
                              {prop.is_mortgaged && <p className="text-yellow-200 font-semibold">⚠️ Hipotecada</p>}
                              {prop.is_for_sale && (
                                <p className="text-purple-200 font-semibold">🏪 En venta: ${prop.sale_price?.toLocaleString()}</p>
                              )}
                            </div>
                            <div className="mt-3 pt-3 border-t border-white/30 flex gap-2">
                              {(() => {
                                // Verificar si puede construir
                                const gameState = {
                                  sessionId,
                                  players: session.players,
                                  playerCountries,
                                  countries,
                                  currentTurn: session.current_turn,
                                }
                                const buildCheck = canBuild(prop.country, myPlayer.id, gameState)
                                
                                return (
                                  <BankModal
                                    property={{
                                      id: prop.id,
                                      country: prop.country,
                                      houses: prop.houses || 0,
                                      hotels: prop.hotels || 0,
                                      is_mortgaged: prop.is_mortgaged || false,
                                    }}
                                    playerMoney={myPlayer.money}
                                    canBuild={buildCheck.canBuild || false}
                                    maxHouses={buildCheck.maxHouses || 0}
                                    maxHotels={buildCheck.maxHotels || 0}
                                    onMortgage={() => {
                                      handleMortgage(prop.id)
                                      setShowProperties(false)
                                    }}
                                    onUnmortgage={() => {
                                      handleUnmortgage(prop.id)
                                      setShowProperties(false)
                                    }}
                                    onBuild={(houses, hotels) => {
                                      handleBuild(prop.country.id, houses, hotels)
                                      setShowProperties(false)
                                    }}
                                    onSellBuild={(houses, hotels) => {
                                      handleSellBuild(prop.id, houses, hotels)
                                      setShowProperties(false)
                                    }}
                                  />
                                )
                              })()}
                              {!prop.is_mortgaged && (
                                prop.is_for_sale ? (
                                  <button className="flex-1 bg-red-500/80 hover:bg-red-500 text-white text-sm py-2 px-3 rounded-lg transition font-semibold">
                                    Retirar de venta
                                  </button>
                                ) : (
                                  <PropertySaleModal
                                    property={prop}
                                    onSell={() => setShowProperties(false)}
                                  />
                                )
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )
            })()}
          </div>
        </div>
      )}

      {showHistory && (
        <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 z-50 md:hidden overflow-y-auto pb-20">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-white">Historial</h2>
              <button
                onClick={() => setShowHistory(false)}
                className="text-white/60 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <TransactionHistory sessionId={sessionId} />
          </div>
        </div>
      )}

      {showBoardOverview && (
        <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 z-50 md:hidden overflow-y-auto pb-20">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-white">Vista del Tablero</h2>
              <button
                onClick={() => setShowBoardOverview(false)}
                className="text-white/60 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {session && (
              <BoardOverview
                countries={countries}
                players={session.players}
                currentUserId={currentUserId}
                currentTurn={session.current_turn}
                playerCountries={playerCountries}
              />
            )}
          </div>
        </div>
      )}

      {/* Modal de confirmación para cerrar partida */}
      {showCloseConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowCloseConfirm(false)}>
          <div className="bg-white/10 backdrop-blur-md rounded-xl shadow-2xl p-6 max-w-md w-full border border-white/20" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-white mb-4">¿Cerrar partida?</h2>
            <p className="text-white/80 mb-6">
              ¿Estás seguro de que quieres cerrar esta partida? Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleCloseConfirm}
                className="flex-1 bg-gradient-to-r from-red-600 to-red-700 text-white py-2.5 px-4 rounded-lg hover:from-red-700 hover:to-red-800 transition font-semibold shadow-lg"
              >
                Aceptar
              </button>
              <button
                onClick={() => setShowCloseConfirm(false)}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white py-2.5 px-4 rounded-lg transition font-semibold border border-white/20"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
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

