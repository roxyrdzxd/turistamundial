'use client'

import { useState, useEffect } from 'react'
import { soundManager } from '@/lib/audio/soundManager'

export default function SoundSettings() {
  const [enabled, setEnabled] = useState(true)
  const [volume, setVolume] = useState(0.5)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (soundManager) {
      setEnabled(soundManager.isEnabled())
      setVolume(soundManager.getVolume())
    }
  }, [])

  const handleToggle = () => {
    const newEnabled = !enabled
    setEnabled(newEnabled)
    if (soundManager) {
      soundManager.setEnabled(newEnabled)
      if (newEnabled) {
        soundManager.play('notification')
      }
    }
  }

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume)
    if (soundManager) {
      soundManager.setVolume(newVolume)
      soundManager.play('notification')
    }
  }

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-gray-700 text-white w-12 h-12 rounded-full shadow-lg hover:bg-gray-600 transition flex items-center justify-center"
        title="Configuración de sonido"
      >
        {enabled ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
          </svg>
        )}
      </button>

      {isOpen && (
        <div className="absolute bottom-16 left-0 bg-white rounded-xl shadow-2xl p-4 w-64 border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-3">Configuración de Sonido</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-700">Sonido</label>
              <button
                onClick={handleToggle}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  enabled ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {enabled && (
              <>
                <div>
                  <label className="text-sm text-gray-700 mb-2 block">Volumen</label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={volume}
                    onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>0%</span>
                    <span>{Math.round(volume * 100)}%</span>
                    <span>100%</span>
                  </div>
                </div>
                
                <div className="pt-2 border-t border-gray-200">
                  <button
                    onClick={() => soundManager?.play('dice_roll')}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition text-sm font-semibold"
                  >
                    🔊 Probar Sonido
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

