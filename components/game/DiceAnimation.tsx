'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Lottie from 'lottie-react'

interface DiceAnimationProps {
  onComplete?: () => void
  result?: number
  die1?: number
  die2?: number
}

export default function DiceAnimation({ onComplete, result, die1, die2 }: DiceAnimationProps) {
  const [showAnimation, setShowAnimation] = useState(true)
  const [animationData, setAnimationData] = useState<any>(null)
  const [showResult, setShowResult] = useState(false)
  const animationRef = useRef<any>(null)

  const handleClose = useCallback(() => {
    setShowAnimation(false)
    setShowResult(false)
    if (onComplete) {
      onComplete()
    }
  }, [onComplete])

  useEffect(() => {
    // Cargar la animación desde Supabase Storage
    fetch('https://cgoisveithzvituzyoga.supabase.co/storage/v1/object/public/lotties/dice%206.json')
      .then(res => res.json())
      .then(data => {
        setAnimationData(data)
      })
      .catch(err => {
        console.error('Error cargando animación:', err)
      })
  }, [])

  useEffect(() => {
    if (!animationData) return

    // Mostrar resultado después de 2.5 segundos
    const showResultTimer = setTimeout(() => {
      if (result) {
        setShowResult(true)
      }
    }, 2500)

    // Cerrar automáticamente después de 8 segundos totales (5.5 segundos mostrando el resultado)
    const completeTimer = setTimeout(() => {
      handleClose()
    }, 8000)

    return () => {
      clearTimeout(showResultTimer)
      clearTimeout(completeTimer)
    }
  }, [animationData, result, handleClose])

  if (!showAnimation || !animationData) {
    return null
  }

  // Prevenir que el clic se propague al contenedor cuando se hace clic en el resultado
  const handleResultClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    handleClose()
  }

  return (
    <div className="relative w-full flex justify-center">
      <div className="relative">
        {/* Animación de dados - más pequeña */}
        <div className="w-48 h-48 md:w-64 md:h-64">
          <Lottie
            lottieRef={animationRef}
            animationData={animationData}
            loop={false}
            autoplay={true}
            style={{ width: '100%', height: '100%' }}
          />
        </div>
        
        {/* Resultado de los dados - overlay pequeño */}
        {showResult && result && (
          <div className="absolute inset-0 flex items-center justify-center animate-scaleIn" onClick={handleResultClick}>
            <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg p-2 shadow-2xl border-2 border-white cursor-pointer hover:scale-105 transition-transform scale-75">
              <div className="text-center">
                {die1 && die2 ? (
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <div className="bg-white rounded-lg w-7 h-7 flex items-center justify-center shadow-md">
                      <span className="text-base font-bold text-blue-600">{die1}</span>
                    </div>
                    <span className="text-white text-sm font-bold">+</span>
                    <div className="bg-white rounded-lg w-7 h-7 flex items-center justify-center shadow-md">
                      <span className="text-base font-bold text-blue-600">{die2}</span>
                    </div>
                    <span className="text-white text-sm font-bold">=</span>
                    <div className="bg-yellow-400 rounded-lg w-8 h-8 flex items-center justify-center shadow-md border-2 border-white">
                      <span className="text-lg font-bold text-gray-900">{result}</span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-yellow-400 rounded-lg w-9 h-9 flex items-center justify-center shadow-md border-2 border-white mx-auto mb-1">
                    <span className="text-xl font-bold text-gray-900">{result}</span>
                  </div>
                )}
                <p className="text-white text-[10px] font-semibold">
                  {result} espacios
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Indicador mientras se tiran los dados */}
        {!showResult && (
          <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-gray-600 text-sm font-semibold animate-pulse whitespace-nowrap">
            🎲 Tirando...
          </div>
        )}
      </div>
    </div>
  )
}

