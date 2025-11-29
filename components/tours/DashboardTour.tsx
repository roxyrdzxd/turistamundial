'use client'

import { useEffect, useRef } from 'react'
import { TourManager } from '@/lib/tours/tourManager'

export default function DashboardTour() {
  const tourStarted = useRef(false)

  useEffect(() => {
    // Esperar a que el DOM esté completamente cargado
    const timer = setTimeout(() => {
      // Verificar si el tour ya fue completado
      if (TourManager.isTourCompleted('dashboard')) {
        return
      }

      // Verificar que los elementos existan antes de iniciar el tour
      const elements = [
        '[data-tour="welcome"]',
        '[data-tour="create-game"]',
        '[data-tour="find-game"]',
        '[data-tour="wallet"]',
        '[data-tour="profile"]',
      ]

      const allElementsExist = elements.every(selector => {
        return document.querySelector(selector) !== null
      })

      if (allElementsExist && !tourStarted.current) {
        tourStarted.current = true
        
        const steps = [
          {
            element: '[data-tour="welcome"]',
            popover: {
              title: '👋 ¡Bienvenido a Turix!',
              description: 'Este es tu panel principal. Desde aquí podrás crear partidas, buscar juegos disponibles y gestionar tu cuenta.',
              side: 'bottom' as const,
            },
          },
          {
            element: '[data-tour="create-game"]',
            popover: {
              title: '➕ Crear Partida',
              description: 'Haz clic aquí para crear una nueva partida. Podrás elegir el tablero, número de jugadores y agregar NPCs si lo deseas.',
              side: 'right' as const,
            },
          },
          {
            element: '[data-tour="find-game"]',
            popover: {
              title: '🔍 Buscar Partidas',
              description: 'Encuentra partidas disponibles creadas por otros jugadores y únete rápidamente.',
              side: 'right' as const,
            },
          },
          {
            element: '[data-tour="wallet"]',
            popover: {
              title: '💰 Tu Wallet',
              description: 'Gestiona tus TuristaCoins, compra avatares y personaliza tu experiencia.',
              side: 'bottom' as const,
            },
          },
          {
            element: '[data-tour="profile"]',
              popover: {
                title: '👤 Tu Perfil',
                description: 'Personaliza tu nombre de usuario, avatar y revisa tus estadísticas.',
                side: 'bottom' as const,
              },
          },
        ]

        const tour = new TourManager('dashboard', steps, () => {
          console.log('Tour del dashboard completado')
        })

        // Iniciar el tour después de un pequeño delay para asegurar que todo esté renderizado
        setTimeout(() => {
          tour.start()
        }, 500)
      }
    }, 1000)

    return () => {
      clearTimeout(timer)
    }
  }, [])

  return null
}

