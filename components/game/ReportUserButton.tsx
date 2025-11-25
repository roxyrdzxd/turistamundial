'use client'

import { useState } from 'react'
import { useToast } from '@/contexts/ToastContext'

interface ReportUserButtonProps {
  reportedUserId: string
  reportedUsername: string
  className?: string
}

export default function ReportUserButton({
  reportedUserId,
  reportedUsername,
  className = '',
}: ReportUserButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [reason, setReason] = useState<string>('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const toast = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!reason) {
      toast.showError('Por favor selecciona una razón para el reporte')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/users/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reportedUserId,
          reason,
          description: description.trim() || null,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast.showSuccess('Usuario reportado exitosamente. Revisaremos el caso.')
        setIsOpen(false)
        setReason('')
        setDescription('')
      } else {
        toast.showError(data.error || 'Error al reportar usuario')
      }
    } catch (error) {
      console.error('Error reportando usuario:', error)
      toast.showError('Error al reportar usuario')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`text-red-600 hover:text-red-700 transition ${className}`}
        title={`Reportar a ${reportedUsername}`}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4"
            onClick={() => setIsOpen(false)}
          >
            {/* Modal */}
            <div
              className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 z-[101]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">
                  🚩 Reportar Usuario
                </h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <p className="text-sm text-gray-600 mb-4">
                Estás reportando a <span className="font-semibold">{reportedUsername}</span>
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Razón del reporte *
                  </label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-red-500"
                    required
                  >
                    <option value="">Selecciona una razón</option>
                    <option value="spam">Spam</option>
                    <option value="harassment">Acoso / Hostigamiento</option>
                    <option value="inappropriate_content">Contenido inapropiado</option>
                    <option value="cheating">Trampa / Hacking</option>
                    <option value="other">Otro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Descripción (opcional)
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-red-500 resize-none"
                    rows={4}
                    placeholder="Proporciona más detalles sobre el reporte..."
                    maxLength={500}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {description.length}/500 caracteres
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition font-semibold"
                    disabled={loading}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={loading || !reason}
                  >
                    {loading ? 'Enviando...' : '🚩 Reportar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </>
  )
}

