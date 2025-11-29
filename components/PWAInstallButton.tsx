'use client'

import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function PWAInstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showButton, setShowButton] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

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

    if (outcome === 'accepted') {
      console.log('Usuario aceptó instalar la PWA')
    } else {
      console.log('Usuario rechazó instalar la PWA')
    }

    // Limpiar el prompt
    setDeferredPrompt(null)
    setShowButton(false)
  }

  if (isInstalled) {
    return (
      <div className="fixed bottom-4 right-4 bg-green-500/90 backdrop-blur-md text-white px-4 py-2 rounded-lg shadow-lg border border-green-400/50 z-50">
        <div className="flex items-center gap-2">
          <span>✓</span>
          <span className="text-sm font-medium">Turix instalado</span>
        </div>
      </div>
    )
  }

  if (!showButton) {
    return null
  }

  return (
    <button
      onClick={handleInstallClick}
      className="fixed bottom-4 right-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white px-6 py-3 rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 z-50 backdrop-blur-md border border-white/20"
    >
      <div className="flex items-center gap-2">
        <span>📱</span>
        <span className="font-semibold">Instalar Turix</span>
      </div>
    </button>
  )
}

