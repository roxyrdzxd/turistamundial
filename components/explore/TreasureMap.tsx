'use client'

import { useEffect, useState, useRef } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/contexts/ToastContext'
import { getCurrentLocation, watchLocation, formatDistance, type Coordinates } from '@/lib/utils/geolocation'

// Fix para iconos de Leaflet en Next.js
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  })
}

interface Treasure {
  id: string
  name: string
  description: string | null
  coins_reward: number
  latitude: number
  longitude: number
  radius_meters: number
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  distance_meters: number
  can_collect: boolean
  already_collected: boolean
}

// Componente interno del mapa (solo se renderiza en cliente)
function MapContent({
  userLocation,
  treasures,
  onCollect,
  collecting,
}: {
  userLocation: Coordinates
  treasures: Treasure[]
  onCollect: (treasure: Treasure) => void
  collecting: string | null
}) {
  // Importar dinámicamente solo en el cliente
  const { MapContainer, TileLayer, Marker, Popup, Circle, useMap } = typeof window !== 'undefined' 
    ? require('react-leaflet')
    : { MapContainer: () => null, TileLayer: () => null, Marker: () => null, Popup: () => null, Circle: () => null, useMap: () => null }
  
  // Componente para centrar el mapa
  function MapCenter({ center }: { center: [number, number] }) {
    const map = useMap()
    useEffect(() => {
      map.setView(center, map.getZoom())
    }, [center, map])
    return null
  }

  const center: [number, number] = [userLocation.latitude, userLocation.longitude]

  const getRarityColor = (rarity: string): string => {
    switch (rarity) {
      case 'common':
        return '#10b981'
      case 'rare':
        return '#3b82f6'
      case 'epic':
        return '#8b5cf6'
      case 'legendary':
        return '#f59e0b'
      default:
        return '#6b7280'
    }
  }

  const getRarityName = (rarity: string): string => {
    switch (rarity) {
      case 'common':
        return 'Común'
      case 'rare':
        return 'Raro'
      case 'epic':
        return 'Épico'
      case 'legendary':
        return 'Legendario'
      default:
        return rarity
    }
  }

  return (
    <MapContainer
      center={center}
      zoom={15}
      style={{ height: '100%', width: '100%', zIndex: 0 }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapCenter center={center} />

      {/* Marcador de ubicación del usuario */}
      <Marker position={center}>
        <Popup>
          <div className="text-center">
            <p className="font-bold">Tu ubicación</p>
          </div>
        </Popup>
      </Marker>

      {/* Marcadores de tesoros */}
      {treasures.map((treasure) => {
        const position: [number, number] = [treasure.latitude, treasure.longitude]
        const color = getRarityColor(treasure.rarity)

        return (
          <div key={treasure.id}>
            <Circle
              center={position}
              radius={treasure.radius_meters}
              pathOptions={{
                color: color,
                fillColor: color,
                fillOpacity: 0.1,
                weight: 2,
              }}
            />
            <Marker
              position={position}
              icon={L.divIcon({
                className: 'custom-marker',
                html: `
                  <div style="
                    background-color: ${color};
                    width: 30px;
                    height: 30px;
                    border-radius: 50% 50% 50% 0;
                    transform: rotate(-45deg);
                    border: 3px solid white;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                  ">
                    <span style="
                      transform: rotate(45deg);
                      color: white;
                      font-weight: bold;
                      font-size: 16px;
                    ">💰</span>
                  </div>
                `,
                iconSize: [30, 30],
                iconAnchor: [15, 30],
              })}
            >
              <Popup>
                <div className="min-w-[200px]">
                  <div className="font-bold text-lg mb-2" style={{ color: color }}>
                    {treasure.name}
                  </div>
                  {treasure.description && (
                    <p className="text-sm text-gray-600 mb-2">{treasure.description}</p>
                  )}
                  <div className="space-y-1 text-sm">
                    <p>
                      <span className="font-semibold">Recompensa:</span> {treasure.coins_reward} TC
                    </p>
                    <p>
                      <span className="font-semibold">Rareza:</span>{' '}
                      <span style={{ color: color }}>{getRarityName(treasure.rarity)}</span>
                    </p>
                    <p>
                      <span className="font-semibold">Distancia:</span>{' '}
                      {formatDistance(treasure.distance_meters)}
                    </p>
                    <p>
                      <span className="font-semibold">Radio:</span> {treasure.radius_meters}m
                    </p>
                  </div>
                  {treasure.already_collected ? (
                    <div className="mt-3 p-2 bg-gray-200 rounded text-center text-sm text-gray-600">
                      Ya recolectado
                    </div>
                  ) : treasure.can_collect ? (
                    <button
                      onClick={() => onCollect(treasure)}
                      disabled={collecting === treasure.id}
                      className="mt-3 w-full bg-gradient-to-r from-cyan-600 to-blue-600 text-white py-2 px-4 rounded-lg font-semibold hover:from-cyan-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      {collecting === treasure.id ? 'Recolectando...' : 'Recolectar Tesoro'}
                    </button>
                  ) : (
                    <div className="mt-3 p-2 bg-yellow-100 rounded text-center text-sm text-yellow-800">
                      No disponible
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          </div>
        )
      })}
    </MapContainer>
  )
}

// Importar dinámicamente para evitar SSR
const DynamicMapContent = dynamic(() => Promise.resolve(MapContent), { ssr: false })

export default function TreasureMap() {
  const [userLocation, setUserLocation] = useState<(Coordinates & { accuracy?: number }) | null>(null)
  const [treasures, setTreasures] = useState<Treasure[]>([])
  const [loading, setLoading] = useState(true)
  const [collecting, setCollecting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null)
  const [isRecalibrating, setIsRecalibrating] = useState(false)
  const [showCelebration, setShowCelebration] = useState<{ rarity: string; coins: number } | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [lastNotificationTime, setLastNotificationTime] = useState<number>(0)
  const [isPanelMinimized, setIsPanelMinimized] = useState(false)
  const toast = useToast()
  const mapRef = useRef<L.Map | null>(null)
  const watchStopRef = useRef<(() => void) | null>(null)

  // Obtener usuario actual
  useEffect(() => {
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
    fetchUser()
  }, [])

  // Obtener ubicación inicial del usuario con alta precisión
  useEffect(() => {
    let cancelled = false
    let safetyTimeout: NodeJS.Timeout | null = null

    const fetchInitialLocation = async () => {
      try {
        setIsRecalibrating(true)
        
        // Timeout de seguridad: forzar que termine después de 10 segundos máximo
        safetyTimeout = setTimeout(() => {
          if (!cancelled) {
            setIsRecalibrating(false)
            console.warn('Timeout de seguridad: deteniendo calibración')
          }
        }, 10000)
        
        // Usar valores más tolerantes: 200m de precisión objetivo, 2 intentos, 8 segundos máximo
        const location = await getCurrentLocation(200, 2, 8000)
        
        if (cancelled) return
        
        if (safetyTimeout) {
          clearTimeout(safetyTimeout)
          safetyTimeout = null
        }
        
        setUserLocation(location)
        setLocationAccuracy(location.accuracy || null)
        setError(null)
        setIsRecalibrating(false) // Asegurar que se desactive
        
        // No mostrar advertencias automáticamente - el usuario ya ve la precisión en el panel
        // Solo mostrar si es extremadamente mala (>1000m) y solo una vez
        if (location.accuracy && location.accuracy > 1000) {
          // Usar un flag para mostrar solo una vez
          const hasShownWarning = sessionStorage.getItem('precision-warning-shown')
          if (!hasShownWarning) {
            toast.showWarning(
              `Precisión de ubicación: ${location.accuracy.toFixed(0)}m. Intenta moverte a un área abierta para mejor precisión.`
            )
            sessionStorage.setItem('precision-warning-shown', 'true')
          }
        }
      } catch (err: any) {
        if (cancelled) return
        
        if (safetyTimeout) {
          clearTimeout(safetyTimeout)
          safetyTimeout = null
        }
        
        console.error('Error al obtener ubicación:', err)
        setError('No se pudo obtener tu ubicación. Asegúrate de permitir el acceso a la ubicación.')
        // Fallback a ubicación por defecto solo si es necesario
        setUserLocation({ latitude: 25.6866, longitude: -100.3161 })
        setLocationAccuracy(null)
        setIsRecalibrating(false) // Asegurar que se desactive
      } finally {
        if (!cancelled && safetyTimeout) {
          clearTimeout(safetyTimeout)
        }
        if (!cancelled) {
          setIsRecalibrating(false)
        }
      }
    }

    fetchInitialLocation()

    return () => {
      cancelled = true
      if (safetyTimeout) {
        clearTimeout(safetyTimeout)
      }
      setIsRecalibrating(false)
    }
  }, [toast])

  // Monitorear ubicación continuamente para actualizaciones de precisión
  // Solo después de que la ubicación inicial se haya obtenido y NO esté calibrando
  useEffect(() => {
    if (!userLocation || isRecalibrating) {
      // Detener watch si está calibrando
      if (watchStopRef.current) {
        watchStopRef.current()
        watchStopRef.current = null
      }
      return
    }

    let lastUpdateTime = Date.now()
    const MIN_UPDATE_INTERVAL = 10000 // Solo actualizar cada 10 segundos mínimo
    let isUpdating = false

    // Iniciar monitoreo continuo (muy tolerante: 1000m para evitar actualizaciones constantes)
    const stopWatching = watchLocation(
      (location) => {
        // Prevenir múltiples actualizaciones simultáneas
        if (isUpdating) return
        
        const now = Date.now()
        
        // Throttle: solo actualizar si pasaron al menos 10 segundos desde la última actualización
        if (now - lastUpdateTime < MIN_UPDATE_INTERVAL) {
          return
        }

        isUpdating = true

        // Solo actualizar si la precisión mejoró significativamente (al menos 50% mejor)
        setUserLocation((prev) => {
          if (!prev || !prev.accuracy) {
            lastUpdateTime = now
            isUpdating = false
            return location
          }
          // Actualizar solo si la nueva precisión es al menos 50% mejor
          if (location.accuracy && location.accuracy < prev.accuracy * 0.5) {
            lastUpdateTime = now
            isUpdating = false
            return location
          }
          isUpdating = false
          return prev
        })
        
        setLocationAccuracy((prev) => {
          if (!prev || !location.accuracy) {
            return location.accuracy || null
          }
          // Actualizar solo si mejoró significativamente (50% mejor)
          if (location.accuracy < prev * 0.5) {
            return location.accuracy
          }
          return prev
        })
      },
      1000 // Muy tolerante: 1000m de precisión para monitoreo continuo (casi no filtra)
    )

    watchStopRef.current = stopWatching

    return () => {
      if (watchStopRef.current) {
        watchStopRef.current()
        watchStopRef.current = null
      }
    }
  }, [userLocation, isRecalibrating])

  // Función para recalibrar ubicación manualmente
  const handleRecalibrate = async () => {
    try {
      setIsRecalibrating(true)
      // Valores más tolerantes para recalibración: 100m objetivo, 3 intentos, 15 segundos máximo
      const location = await getCurrentLocation(100, 3, 15000)
      setUserLocation(location)
      setLocationAccuracy(location.accuracy || null)
      
      if (location.accuracy && location.accuracy <= 100) {
        toast.showSuccess(`Ubicación actualizada con precisión de ${location.accuracy.toFixed(0)}m`)
      } else if (location.accuracy) {
        if (location.accuracy > 200) {
          toast.showWarning(`Precisión: ${location.accuracy.toFixed(0)}m. Intenta moverte a un área abierta.`)
        } else {
          toast.showSuccess(`Ubicación actualizada (precisión: ${location.accuracy.toFixed(0)}m)`)
        }
      }
    } catch (err) {
      console.error('Error al recalibrar ubicación:', err)
      toast.showError('No se pudo actualizar la ubicación. Intenta de nuevo.')
    } finally {
      setIsRecalibrating(false)
    }
  }

  // Generar tesoros dinámicos cuando el usuario entra al mapa
  // Solo una vez cuando se obtiene la ubicación inicial
  const hasSpawnedTreasures = useRef(false)
  
  useEffect(() => {
    if (!userLocation || isRecalibrating || hasSpawnedTreasures.current) return

    const spawnTreasures = async () => {
      try {
        hasSpawnedTreasures.current = true // Marcar como ejecutado
        
        const response = await fetch('/api/treasures/spawn', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
            radius: 2000,
            minTreasures: 3
          }),
        })

        const data = await response.json()
        if (data.success && data.spawned_count > 0) {
          // Solo loggear si se generaron tesoros nuevos (una vez)
          console.log(`Generados ${data.spawned_count} tesoros nuevos. Total disponible: ${data.total_available}`)
        }
      } catch (err) {
        console.error('Error al generar tesoros:', err)
        hasSpawnedTreasures.current = false // Permitir reintento en caso de error
        // No mostrar error al usuario, solo log
      }
    }

    spawnTreasures()
  }, [userLocation, isRecalibrating])

  // Cargar tesoros cercanos
  useEffect(() => {
    if (!userLocation) return

    const fetchTreasures = async () => {
      try {
        setLoading(true)
        const response = await fetch(
          `/api/treasures/nearby?lat=${userLocation.latitude}&lng=${userLocation.longitude}&radius=2000`
        )
        const data = await response.json()

        if (data.success) {
          setTreasures(data.treasures || [])
        } else {
          console.error('Error al cargar tesoros:', data.error)
        }
      } catch (err) {
        console.error('Error al buscar tesoros:', err)
      } finally {
        setLoading(false)
      }
    }

    // Pequeño delay para asegurar que los tesoros se generen primero
    const timeout = setTimeout(() => {
      fetchTreasures()
    }, 500)

    const interval = setInterval(fetchTreasures, 30000)
    return () => {
      clearTimeout(timeout)
      clearInterval(interval)
    }
  }, [userLocation])

  // Notificaciones push cuando hay tesoros cerca
  useEffect(() => {
    if (!userLocation || !currentUserId) return

    const checkNearbyTreasures = async () => {
      try {
        const response = await fetch(
          `/api/treasures/nearby?lat=${userLocation.latitude}&lng=${userLocation.longitude}&radius=500`
        )
        const data = await response.json()

        if (data.success && data.treasures?.length > 0) {
          const availableTreasures = data.treasures.filter((t: Treasure) => t.can_collect)
          
          // Solo enviar notificación si hay tesoros disponibles y han pasado al menos 5 minutos desde la última
          const now = Date.now()
          if (availableTreasures.length > 0 && (now - lastNotificationTime) > 5 * 60 * 1000) {
            // Enviar notificación push
            try {
              await fetch('/api/notifications/send', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  userId: currentUserId,
                  title: '💰 ¡Tesoros cerca de ti!',
                  body: `Hay ${availableTreasures.length} tesoro(s) esperándote a menos de 500m`,
                  url: '/explore',
                  tag: 'treasure-nearby',
                  requireInteraction: false,
                }),
              })
              setLastNotificationTime(now)
            } catch (notifError) {
              console.error('Error enviando notificación:', notifError)
              // No mostrar error al usuario, solo log
            }
          }
        }
      } catch (err) {
        console.error('Error verificando tesoros cercanos:', err)
        // No mostrar error al usuario, solo log
      }
    }

    // Verificar cada 5 minutos
    const interval = setInterval(checkNearbyTreasures, 5 * 60 * 1000)
    
    // Verificar inmediatamente después de 30 segundos (para dar tiempo a que se generen tesoros)
    const initialTimeout = setTimeout(checkNearbyTreasures, 30000)
    
    return () => {
      clearInterval(interval)
      clearTimeout(initialTimeout)
    }
  }, [userLocation, currentUserId, lastNotificationTime])

  const handleCollectTreasure = async (treasure: Treasure) => {
    if (!userLocation || collecting) return

    // Validar que tenemos coordenadas válidas
    if (!userLocation.latitude || !userLocation.longitude || 
        isNaN(userLocation.latitude) || isNaN(userLocation.longitude)) {
      toast.showError('Ubicación no válida. Por favor, espera a que se calibre tu ubicación.')
      return
    }

    try {
      setCollecting(treasure.id)
      const response = await fetch('/api/treasures/collect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          treasureId: treasure.id,
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        // Error del servidor
        const errorMessage = data.error || data.details || data.hint || 'Error al recolectar tesoro'
        console.error('Error al recolectar tesoro:', {
          status: response.status,
          error: data,
          errorCode: data.code,
          errorDetails: data.details,
          errorHint: data.hint,
          treasureId: treasure.id,
          location: { lat: userLocation.latitude, lng: userLocation.longitude },
          fullResponse: JSON.stringify(data, null, 2)
        })
        
        // Mostrar mensaje más descriptivo
        let userMessage = errorMessage
        if (data.code) {
          userMessage += ` (Código: ${data.code})`
        }
        if (data.hint) {
          userMessage += `. ${data.hint}`
        }
        
        toast.showError(userMessage)
        setCollecting(null)
        return
      }

      if (data.success) {
        // Mostrar celebración según rareza
        const rarity = data.treasure_rarity || treasure.rarity
        setShowCelebration({ rarity, coins: data.coins_earned })
        
        // Mensaje personalizado según rareza
        const rarityMessages: Record<string, string> = {
          common: `¡Tesoro común recolectado! Ganaste ${data.coins_earned} TuristaCoins`,
          rare: `🎉 ¡Tesoro raro encontrado! Ganaste ${data.coins_earned} TuristaCoins`,
          epic: `🌟 ¡Tesoro épico descubierto! Ganaste ${data.coins_earned} TuristaCoins`,
          legendary: `💎 ¡TESORO LEGENDARIO! ¡Increíble! Ganaste ${data.coins_earned} TuristaCoins`
        }
        
        toast.showSuccess(rarityMessages[rarity] || `¡Tesoro recolectado! Ganaste ${data.coins_earned} TuristaCoins`)
        
        // Ocultar celebración después de 3 segundos
        setTimeout(() => {
          setShowCelebration(null)
        }, 3000)
        
        setTreasures((prev) =>
          prev.map((t) =>
            t.id === treasure.id ? { ...t, can_collect: false, already_collected: true } : t
          )
        )
      } else {
        toast.showError(data.error || 'No se pudo recolectar el tesoro')
      }
    } catch (err) {
      console.error('Error al recolectar tesoro:', err)
      toast.showError('Error al recolectar el tesoro')
    } finally {
      setCollecting(null)
    }
  }

  const getRarityColor = (rarity: string): string => {
    switch (rarity) {
      case 'common':
        return '#10b981'
      case 'rare':
        return '#3b82f6'
      case 'epic':
        return '#8b5cf6'
      case 'legendary':
        return '#f59e0b'
      default:
        return '#6b7280'
    }
  }

  if (!userLocation) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900">
        <div className="text-center text-white">
          {isRecalibrating ? (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
              <p className="mb-2">Obteniendo tu ubicación...</p>
              <p className="text-sm text-white/70 mb-4">Esto puede tardar unos segundos</p>
              <button
                onClick={() => {
                  setIsRecalibrating(false)
                  // Usar ubicación por defecto si el usuario cancela
                  setUserLocation({ latitude: 25.6866, longitude: -100.3161 })
                  setLocationAccuracy(null)
                  toast.showInfo('Usando ubicación aproximada. Puedes recalibrar después.')
                }}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm transition"
              >
                Usar ubicación aproximada
              </button>
            </>
          ) : (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
              <p>Obteniendo tu ubicación...</p>
              {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full h-screen">
      <DynamicMapContent
        userLocation={userLocation}
        treasures={treasures}
        onCollect={handleCollectTreasure}
        collecting={collecting}
      />

      {/* Efecto de celebración al recolectar tesoro */}
      {showCelebration && (
        <div className="fixed inset-0 z-[2000] pointer-events-none flex items-center justify-center">
          <div className="text-center">
            {/* Confeti animado para tesoros legendarios */}
            {showCelebration.rarity === 'legendary' && (
              <div className="absolute inset-0 overflow-hidden">
                {[...Array(50)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute animate-confetti"
                    style={{
                      left: `${Math.random() * 100}%`,
                      animationDelay: `${Math.random() * 2}s`,
                      animationDuration: `${2 + Math.random() * 2}s`,
                    }}
                  >
                    <span className="text-2xl">
                      {['💰', '💎', '⭐', '✨', '🌟'][Math.floor(Math.random() * 5)]}
                    </span>
                  </div>
                ))}
              </div>
            )}
            
            {/* Mensaje de celebración */}
            <div
              className={`bg-gradient-to-r ${
                showCelebration.rarity === 'legendary'
                  ? 'from-yellow-400 via-orange-500 to-red-500'
                  : showCelebration.rarity === 'epic'
                  ? 'from-purple-400 via-pink-500 to-purple-600'
                  : showCelebration.rarity === 'rare'
                  ? 'from-blue-400 via-cyan-500 to-blue-600'
                  : 'from-green-400 via-emerald-500 to-green-600'
              } text-white px-8 py-6 rounded-2xl shadow-2xl transform scale-0 animate-scale-in`}
            >
              <div className="text-6xl mb-4 animate-bounce">
                {showCelebration.rarity === 'legendary'
                  ? '💎'
                  : showCelebration.rarity === 'epic'
                  ? '🌟'
                  : showCelebration.rarity === 'rare'
                  ? '🎉'
                  : '💰'}
              </div>
              <h2 className="text-3xl font-bold mb-2">
                {showCelebration.rarity === 'legendary'
                  ? '¡TESORO LEGENDARIO!'
                  : showCelebration.rarity === 'epic'
                  ? '¡TESORO ÉPICO!'
                  : showCelebration.rarity === 'rare'
                  ? '¡TESORO RARO!'
                  : '¡TESORO RECOLECTADO!'}
              </h2>
              <p className="text-xl">
                +{showCelebration.coins} TuristaCoins
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Panel de información lateral (estilo Google Maps) */}
      <div className={`absolute top-20 left-4 z-[1000] bg-white/95 backdrop-blur-md rounded-xl shadow-xl transition-all duration-300 ${
        isPanelMinimized 
          ? 'w-12 h-12 p-2 overflow-hidden' 
          : 'w-64 max-h-[calc(100vh-6rem)] p-4 overflow-y-auto'
      }`}>
        {/* Botón para minimizar/maximizar */}
        <button
          onClick={() => setIsPanelMinimized(!isPanelMinimized)}
          className="absolute top-2 right-2 z-10 w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
          aria-label={isPanelMinimized ? 'Expandir panel' : 'Minimizar panel'}
        >
          {isPanelMinimized ? (
            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          )}
        </button>

        {!isPanelMinimized && (
          <>
            <div className="mb-3 pr-8">
              <h2 className="text-lg font-bold text-gray-800 mb-1">Tesoros</h2>
              <p className="text-xs text-gray-600">
                Encuentra tesoros cerca de ti y gana TuristaCoins
              </p>
            </div>

        {/* Precisión de ubicación */}
        {locationAccuracy !== null && (
          <div className="mb-3 p-2 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-gray-700">Precisión:</span>
              <span
                className={`text-xs font-bold ${
                  locationAccuracy <= 30
                    ? 'text-green-600'
                    : locationAccuracy <= 50
                    ? 'text-yellow-600'
                    : 'text-red-600'
                }`}
              >
                {locationAccuracy.toFixed(0)}m
              </span>
            </div>
            {locationAccuracy > 50 && (
              <p className="text-xs text-red-600 flex items-center gap-1">
                <span>⚠️</span>
                <span>Mueve a un área abierta</span>
              </p>
            )}
          </div>
        )}

        {/* Botón de recalibrar */}
        <button
          onClick={handleRecalibrate}
          disabled={isRecalibrating}
          className="w-full mb-3 px-3 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
          title="Recalibrar ubicación para mayor precisión"
        >
          {isRecalibrating ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              <span>Calibrando...</span>
            </>
          ) : loading && !isRecalibrating ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              <span>Cargando...</span>
            </>
          ) : (
            <>
              <span>📍</span>
              <span>Recalibrar</span>
            </>
          )}
        </button>

        {/* Leyenda de rarezas */}
        <div className="mb-3">
          <p className="text-xs font-semibold text-gray-700 mb-2">Rarezas:</p>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                style={{ backgroundColor: getRarityColor('common') }}
              ></div>
              <span className="text-xs text-gray-700">Común</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                style={{ backgroundColor: getRarityColor('rare') }}
              ></div>
              <span className="text-xs text-gray-700">Raro</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                style={{ backgroundColor: getRarityColor('epic') }}
              ></div>
              <span className="text-xs text-gray-700">Épico</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                style={{ backgroundColor: getRarityColor('legendary') }}
              ></div>
              <span className="text-xs text-gray-700">Legendario</span>
            </div>
          </div>
        </div>

        {/* Contador de tesoros */}
        {treasures.length > 0 && (
          <div className="pt-3 border-t border-gray-200">
            <p className="text-xs font-semibold text-gray-700 mb-1">Disponibles:</p>
            <p className="text-sm font-bold text-blue-600">
              {treasures.filter((t) => t.can_collect).length} tesoro{treasures.filter((t) => t.can_collect).length !== 1 ? 's' : ''}
            </p>
          </div>
        )}

        {/* Botón para ver estadísticas */}
        <div className="pt-3 border-t border-gray-200 mt-3">
          <Link
            href="/explore/stats"
            className="w-full px-3 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-semibold rounded-lg hover:from-purple-700 hover:to-pink-700 transition flex items-center justify-center gap-2"
          >
            <span>📊</span>
            <span>Ver Estadísticas</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
