'use client'

import { useState } from 'react'

interface PropertySaleModalProps {
  property: {
    id: string
    country: {
      name: string
      price: number
    }
  }
  onSell: (price: number) => void
}

export default function PropertySaleModal({ property, onSell }: PropertySaleModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [salePrice, setSalePrice] = useState(property.country.price)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (salePrice > 0) {
      onSell(salePrice)
      setIsOpen(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="w-full bg-purple-500/80 hover:bg-purple-500 text-white text-xs py-1 px-2 rounded transition"
      >
        🏪 Poner en venta
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold mb-4">Poner {property.country.name} en venta</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Precio de venta
                </label>
                <input
                  type="number"
                  min="1"
                  value={salePrice}
                  onChange={(e) => setSalePrice(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Precio de venta"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Precio original: ${property.country.price.toLocaleString()}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition font-semibold"
                >
                  Poner en venta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

