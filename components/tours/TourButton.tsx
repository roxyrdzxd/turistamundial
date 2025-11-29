'use client'

import { useState } from 'react'
import { TourManager } from '@/lib/tours/tourManager'

interface TourButtonProps {
  tourId: string
  steps: Array<{
    element: string
    popover: {
      title: string
      description: string
      side?: 'top' | 'bottom' | 'left' | 'right'
      align?: 'start' | 'center' | 'end'
    }
  }>
  className?: string
  children?: React.ReactNode
}

export default function TourButton({ tourId, steps, className = '', children }: TourButtonProps) {
  const [isStarting, setIsStarting] = useState(false)

  const handleStartTour = () => {
    setIsStarting(true)
    
    // Reiniciar el tour para permitir verlo de nuevo
    TourManager.resetTour(tourId)
    
    // Esperar a que los elementos estén disponibles
    setTimeout(() => {
      const allElementsExist = steps.every(step => {
        return document.querySelector(step.element) !== null
      })

      if (allElementsExist) {
        const tour = new TourManager(tourId, steps, () => {
          setIsStarting(false)
        })
        tour.start()
      } else {
        console.warn('Algunos elementos del tour no están disponibles')
        setIsStarting(false)
      }
    }, 300)
  }

  return (
    <button
      onClick={handleStartTour}
      disabled={isStarting}
      className={`${className} ${isStarting ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {children || 'Iniciar Tour'}
    </button>
  )
}

