'use client'

import { useState, useEffect } from 'react'

interface FloatingDiceButtonProps {
  isMyTurn: boolean
  diceResult: number | null
  rolling: boolean
  showDiceAnimation: boolean
  onRollDice: () => void
  die1?: number
  die2?: number
}

export default function FloatingDiceButton({
  isMyTurn,
  diceResult,
  rolling,
  showDiceAnimation,
  onRollDice,
  die1,
  die2,
}: FloatingDiceButtonProps) {
  const [showResult, setShowResult] = useState(false)

  // Resetear showResult cuando cambia diceResult
  useEffect(() => {
    if (diceResult && !showDiceAnimation) {
      setShowResult(true)
    } else if (!diceResult) {
      setShowResult(false)
    }
  }, [diceResult, showDiceAnimation])

  if (!isMyTurn || showDiceAnimation) {
    return null
  }

  // Si ya hay resultado, mostrar el resultado flotante
  if (diceResult && showResult) {
    return (
      <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-40 md:hidden">
        <div className="bg-white rounded-2xl shadow-2xl p-4 border-4 border-blue-500 animate-bounce">
          <div className="flex items-center justify-center gap-2">
            {die1 && die2 ? (
              <>
                <div className="bg-blue-100 rounded-lg w-12 h-12 flex items-center justify-center">
                  <span className="text-2xl font-bold text-blue-600">{die1}</span>
                </div>
                <span className="text-2xl font-bold text-gray-700">+</span>
                <div className="bg-blue-100 rounded-lg w-12 h-12 flex items-center justify-center">
                  <span className="text-2xl font-bold text-blue-600">{die2}</span>
                </div>
                <span className="text-2xl font-bold text-gray-700">=</span>
                <div className="bg-yellow-400 rounded-lg w-14 h-14 flex items-center justify-center border-2 border-blue-500">
                  <span className="text-3xl font-bold text-gray-900">{diceResult}</span>
                </div>
              </>
            ) : (
              <div className="bg-yellow-400 rounded-lg w-16 h-16 flex items-center justify-center border-2 border-blue-500">
                <span className="text-4xl font-bold text-gray-900">{diceResult}</span>
              </div>
            )}
          </div>
          <p className="text-center text-sm font-semibold text-gray-600 mt-2">
            {diceResult} espacios
          </p>
        </div>
      </div>
    )
  }

  // Botón para tirar dados
  return (
    <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50 md:hidden">
      <button
        onClick={onRollDice}
        disabled={rolling}
        className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white w-20 h-20 rounded-full shadow-2xl hover:shadow-3xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center transform hover:scale-110 active:scale-95 border-4 border-white"
        title="Tirar dados"
      >
        {rolling ? (
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        ) : (
          <span className="text-4xl">🎲</span>
        )}
      </button>
      {!rolling && (
        <p className="text-center text-xs font-semibold text-white mt-2 bg-black/50 rounded-full px-3 py-1">
          Toca para tirar
        </p>
      )}
    </div>
  )
}

