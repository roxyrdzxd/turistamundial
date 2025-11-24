'use client'

import { useState } from 'react'

interface FloatingActionsProps {
  isMyTurn: boolean
  onEndTurn?: () => void
  onOpenProperties?: () => void
  canEndTurn?: boolean
}

export default function FloatingActions({
  isMyTurn,
  onEndTurn,
  onOpenProperties,
  canEndTurn = true,
}: FloatingActionsProps) {
  const [isOpen, setIsOpen] = useState(false)

  if (!isMyTurn) {
    return null
  }

  return (
    <div className="fixed bottom-24 right-4 z-40 md:hidden">
      {/* Botón principal */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-gradient-to-r from-purple-600 to-pink-600 text-white w-14 h-14 rounded-full shadow-2xl hover:shadow-3xl transition-all duration-300 flex items-center justify-center transform hover:scale-110 active:scale-95 border-4 border-white"
        title="Acciones rápidas"
      >
        <svg
          className={`w-6 h-6 transition-transform duration-300 ${isOpen ? 'rotate-45' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {/* Menú de acciones */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 flex flex-col gap-3 animate-fade-in">
          {/* Propiedades */}
          {onOpenProperties && (
            <button
              onClick={() => {
                onOpenProperties()
                setIsOpen(false)
              }}
              className="bg-gradient-to-r from-green-600 to-emerald-600 text-white w-12 h-12 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center transform hover:scale-110 active:scale-95 border-2 border-white"
              title="Mis Propiedades"
            >
              🏛️
            </button>
          )}

          {/* Pasar turno */}
          {onEndTurn && canEndTurn && (
            <button
              onClick={() => {
                onEndTurn()
                setIsOpen(false)
              }}
              className="bg-gradient-to-r from-gray-600 to-gray-700 text-white w-12 h-12 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center transform hover:scale-110 active:scale-95 border-2 border-white"
              title="Pasar Turno"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>
      )}

      {/* Overlay para cerrar al tocar fuera */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}

