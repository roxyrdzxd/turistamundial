'use client'

import { useEffect, useState } from 'react'

export interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info' | 'warning'
  duration?: number
}

interface ToastContainerProps {
  toasts: Toast[]
  onRemove: (id: string) => void
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-md">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  )
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Animación de entrada
    setTimeout(() => setIsVisible(true), 10)

    // Auto-remover después de la duración
    const timer = setTimeout(() => {
      setIsVisible(false)
      setTimeout(() => onRemove(toast.id), 300) // Esperar animación de salida
    }, toast.duration || 3000)

    return () => clearTimeout(timer)
  }, [toast.id, toast.duration, onRemove])

  const getToastStyles = () => {
    const baseStyles = 'p-4 rounded-lg shadow-2xl border-2 transform transition-all duration-300 flex items-center gap-3'
    const typeStyles = {
      success: 'bg-green-50 border-green-500 text-green-800',
      error: 'bg-red-50 border-red-500 text-red-800',
      info: 'bg-blue-50 border-blue-500 text-blue-800',
      warning: 'bg-yellow-50 border-yellow-500 text-yellow-800',
    }
    const visibilityStyles = isVisible
      ? 'translate-x-0 opacity-100'
      : 'translate-x-full opacity-0'

    return `${baseStyles} ${typeStyles[toast.type]} ${visibilityStyles}`
  }

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return '✅'
      case 'error':
        return '❌'
      case 'info':
        return 'ℹ️'
      case 'warning':
        return '⚠️'
      default:
        return '📢'
    }
  }

  return (
    <div className={getToastStyles()}>
      <span className="text-2xl">{getIcon()}</span>
      <p className="flex-1 font-semibold">{toast.message}</p>
      <button
        onClick={() => {
          setIsVisible(false)
          setTimeout(() => onRemove(toast.id), 300)
        }}
        className="text-gray-500 hover:text-gray-700 text-xl font-bold"
      >
        ×
      </button>
    </div>
  )
}

