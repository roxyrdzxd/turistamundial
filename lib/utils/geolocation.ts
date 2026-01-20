/**
 * Utilidades para geolocalización
 */

export interface Coordinates {
  latitude: number
  longitude: number
  accuracy?: number // Precisión en metros (opcional)
}

/**
 * Calcula la distancia entre dos puntos geográficos usando la fórmula de Haversine
 * @returns Distancia en metros
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3 // Radio de la Tierra en metros
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}

/**
 * Obtiene la ubicación actual del usuario con alta precisión
 * @param maxAccuracy Máxima precisión aceptable en metros (por defecto 100m, más tolerante)
 * @param maxAttempts Número máximo de intentos para obtener una ubicación precisa
 * @param maxTotalTime Tiempo máximo total en milisegundos (por defecto 20 segundos)
 */
export async function getCurrentLocation(
  maxAccuracy: number = 100, // Más tolerante por defecto
  maxAttempts: number = 3, // Menos intentos
  maxTotalTime: number = 20000 // 20 segundos máximo total
): Promise<Coordinates & { accuracy?: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocalización no soportada'))
      return
    }

    let attempts = 0
    let bestPosition: GeolocationPosition | null = null
    let bestAccuracy = Infinity
    const startTime = Date.now()
    let timeoutId: NodeJS.Timeout | null = null

    // Timeout total para evitar bucles infinitos
    const totalTimeout = setTimeout(() => {
      if (bestPosition) {
        console.warn(
          `Timeout: Precisión de ubicación: ${bestAccuracy.toFixed(0)}m (objetivo: ${maxAccuracy}m). Usando la mejor lectura disponible.`
        )
        resolve({
          latitude: bestPosition.coords.latitude,
          longitude: bestPosition.coords.longitude,
          accuracy: bestAccuracy,
        })
      } else {
        reject(new Error('Timeout: No se pudo obtener ubicación en el tiempo esperado'))
      }
    }, maxTotalTime)

    const tryGetLocation = () => {
      // Verificar si ya pasó el tiempo máximo
      if (Date.now() - startTime >= maxTotalTime) {
        clearTimeout(totalTimeout)
        if (bestPosition) {
          resolve({
            latitude: bestPosition.coords.latitude,
            longitude: bestPosition.coords.longitude,
            accuracy: bestAccuracy,
          })
        } else {
          reject(new Error('No se pudo obtener ubicación en el tiempo esperado'))
        }
        return
      }

      attempts++

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const accuracy = position.coords.accuracy || Infinity
          
          // Si la precisión es mejor que la anterior, guardarla
          if (accuracy < bestAccuracy) {
            bestPosition = position
            bestAccuracy = accuracy
          }

          // Si la precisión es aceptable, resolver inmediatamente
          if (accuracy <= maxAccuracy) {
            clearTimeout(totalTimeout)
            resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: accuracy,
            })
            return
          }

          // Si aún no alcanzamos el máximo de intentos, intentar de nuevo
          if (attempts < maxAttempts) {
            // Esperar menos tiempo entre intentos (500ms en lugar de 1000ms)
            timeoutId = setTimeout(tryGetLocation, 500)
          } else {
            // Si ya intentamos varias veces, usar la mejor ubicación obtenida
            clearTimeout(totalTimeout)
            if (bestPosition) {
            // No loggear warnings repetidamente - silenciar para evitar spam en consola
            // El usuario ya ve la precisión en la UI
              resolve({
                latitude: bestPosition.coords.latitude,
                longitude: bestPosition.coords.longitude,
                accuracy: bestAccuracy,
              })
            } else {
              reject(new Error('No se pudo obtener una ubicación'))
            }
          }
        },
        (error) => {
          // Si ya tenemos una ubicación, usarla aunque haya error
          if (bestPosition && attempts >= 2) {
            clearTimeout(totalTimeout)
            // Silenciar warning - usar mejor ubicación disponible
            resolve({
              latitude: bestPosition.coords.latitude,
              longitude: bestPosition.coords.longitude,
              accuracy: bestAccuracy,
            })
            return
          }

          if (attempts < maxAttempts) {
            // Reintentar en caso de error temporal
            timeoutId = setTimeout(tryGetLocation, 500)
          } else {
            clearTimeout(totalTimeout)
            if (bestPosition) {
              // Usar la mejor ubicación disponible incluso si hay error
              resolve({
                latitude: bestPosition.coords.latitude,
                longitude: bestPosition.coords.longitude,
                accuracy: bestAccuracy,
              })
            } else {
              reject(error)
            }
          }
        },
        {
          enableHighAccuracy: true, // Usar GPS en lugar de red
          timeout: 10000, // Reducir timeout individual a 10 segundos
          maximumAge: 5000, // Permitir usar ubicación en caché de hasta 5 segundos (más rápido)
        }
      )
    }

    tryGetLocation()

    // Cleanup en caso de que se cancele
    return () => {
      clearTimeout(totalTimeout)
      if (timeoutId) clearTimeout(timeoutId)
    }
  })
}

/**
 * Monitorea la ubicación del usuario continuamente con alta precisión
 * @param callback Función que se llama cada vez que se actualiza la ubicación
 * @param maxAccuracy Máxima precisión aceptable en metros
 * @returns Función para detener el monitoreo
 */
export function watchLocation(
  callback: (location: Coordinates & { accuracy?: number }) => void,
  maxAccuracy: number = 1000
): () => void {
  if (!navigator.geolocation) {
    throw new Error('Geolocalización no soportada')
  }

  let bestPosition: GeolocationPosition | null = null
  let bestAccuracy = Infinity
  let lastCallbackTime = 0
  const MIN_CALLBACK_INTERVAL = 10000 // Mínimo 10 segundos entre callbacks (muy restrictivo)

  const watchId = navigator.geolocation.watchPosition(
    (position) => {
      const accuracy = position.coords.accuracy || Infinity
      const now = Date.now()

      // Actualizar mejor posición si es más precisa
      if (accuracy < bestAccuracy) {
        bestPosition = position
        bestAccuracy = accuracy
      }

      // Throttle muy restrictivo: solo llamar al callback si pasó suficiente tiempo
      if (now - lastCallbackTime < MIN_CALLBACK_INTERVAL) {
        return
      }

      // Solo llamar al callback si la precisión mejoró significativamente (60% mejor)
      // O si es la primera vez y tenemos una lectura
      if (bestPosition && (accuracy <= maxAccuracy || (bestAccuracy < Infinity && accuracy < bestAccuracy * 0.4))) {
        lastCallbackTime = now
        callback({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: accuracy,
        })
      }
    },
    (error) => {
      // No loggear errores, silenciar completamente
      // Solo errores críticos
    },
    {
      enableHighAccuracy: false, // Usar red en lugar de GPS (más rápido, menos preciso)
      timeout: 5000, // Timeout más corto
      maximumAge: 30000, // Permitir caché de hasta 30 segundos (muy permisivo)
    }
  )

  // Retornar función para detener el monitoreo
  return () => {
    navigator.geolocation.clearWatch(watchId)
  }
}

/**
 * Formatea la distancia en metros a texto legible
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`
  }
  return `${(meters / 1000).toFixed(1)}km`
}
