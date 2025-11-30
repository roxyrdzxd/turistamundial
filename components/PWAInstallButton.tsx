'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function PWAInstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showButton, setShowButton] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const pathname = usePathname()
  
  // Ocultar en la página del juego (donde más estorba)
  const isGamePage = pathname?.includes('/game/')

  useEffect(() => {
    // Verificar si ya está instalado
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }

    // Escuchar el evento beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowButton(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // Verificar si ya fue instalado
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true)
      setShowButton(false)
      setDeferredPrompt(null)
    })

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      // Si no hay prompt, mostrar instrucciones manuales
      alert(
        'Para instalar Turix:\n\n' +
        'En Chrome/Edge:\n' +
        '1. Haz clic en el ícono de menú (⋮)\n' +
        '2. Selecciona "Instalar Turix..." o "Añadir a pantalla de inicio"\n\n' +
        'En Safari (iOS):\n' +
        '1. Toca el botón de compartir (□↑)\n' +
        '2. Selecciona "Añadir a pantalla de inicio"'
      )
      return
    }

    // Mostrar el prompt de instalación
    deferredPrompt.prompt()

    // Esperar a que el usuario responda
    const { outcome } = await deferredPrompt.userChoice

    // Limpiar el prompt
    setDeferredPrompt(null)
    setShowButton(false)
  }

  // No mostrar en la página del juego
  if (isGamePage) {
    return null
  }

  if (isInstalled) {
    return (
      <div className="fixed top-4 right-4 bg-green-500/90 backdrop-blur-md text-white px-3 py-1.5 rounded-lg shadow-lg border border-green-400/50 z-40">
        <div className="flex items-center gap-2">
          <span className="text-sm">✓</span>
          <span className="text-xs font-medium">Instalado</span>
        </div>
      </div>
    )
  }

  if (!showButton) {
    return null
  }

  // Versión minimizada (solo ícono)
  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className="fixed top-4 right-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white p-3 rounded-full shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-300 z-40 backdrop-blur-md border border-white/20"
        title="Instalar Turix"
      >
        <span className="text-lg">📱</span>
      </button>
    )
  }

  // Versión completa
  return (
    <div className="fixed top-4 right-4 z-40">
      <div className="bg-gradient-to-r from-cyan-500 to-blue-600 backdrop-blur-md rounded-lg shadow-lg border border-white/20 overflow-hidden">
        <button
          onClick={handleInstallClick}
          className="w-full px-4 py-2.5 hover:from-cyan-600 hover:to-blue-700 transition-all duration-300"
        >
          <div className="flex items-center gap-2 text-white">
            <span className="text-base">📱</span>
            <span className="text-sm font-semibold">Instalar Turix</span>
          </div>
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            setIsMinimized(true)
          }}
          className="w-full px-2 py-1 bg-cyan-600/50 hover:bg-cyan-600/70 text-white text-xs transition-colors border-t border-white/20"
          title="Minimizar"
        >
          −
        </button>
      </div>
    </div>
  )
}

