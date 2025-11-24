'use client'

import { useState } from 'react'

interface BankModalProps {
  property: {
    id: string
    country: {
      name: string
      price: number
      house_price: number
      hotel_price: number
    }
    houses: number
    hotels: number
    is_mortgaged: boolean
  }
  playerMoney: number
  onMortgage?: () => void
  onUnmortgage?: () => void
  onSellBuild?: (houses: number, hotels: number) => void
}

export default function BankModal({ property, playerMoney, onMortgage, onUnmortgage, onSellBuild }: BankModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [housesToSell, setHousesToSell] = useState(0)
  const [hotelsToSell, setHotelsToSell] = useState(0)

  const mortgageValue = Math.floor(property.country.price * 0.5)
  const unmortgageCost = Math.floor(mortgageValue * 1.1)
  const sellBuildValue = Math.floor(property.country.house_price * 0.5) * housesToSell + 
                        Math.floor(property.country.hotel_price * 0.5) * hotelsToSell

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="w-full bg-blue-500/80 hover:bg-blue-500 text-white text-xs py-1 px-2 rounded transition font-semibold"
      >
        🏦 Banco
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setIsOpen(false)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">🏦 Banco</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>
            
            <div className="mb-4 pb-4 border-b border-gray-200">
              <p className="text-sm text-gray-600">Propiedad:</p>
              <p className="text-lg font-semibold text-gray-900">{property.country.name}</p>
            </div>
            
            <div className="space-y-4">
              {/* Hipotecar/Deshipotecar */}
              {!property.is_mortgaged ? (
                <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
                  <h4 className="font-semibold mb-2 text-blue-900">💰 Hipotecar Propiedad</h4>
                  <p className="text-sm text-blue-700 mb-3">
                    Recibirás el <strong>50%</strong> del valor de compra
                  </p>
                  <div className="bg-white rounded-lg p-3 mb-3 border border-blue-200">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Valor de hipoteca:</span>
                      <span className="text-lg font-bold text-blue-600">${mortgageValue.toLocaleString()}</span>
                    </div>
                  </div>
                  {property.houses > 0 || property.hotels > 0 ? (
                    <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-2 mb-3">
                      <p className="text-xs text-yellow-800">
                        ⚠️ Debes vender todas las construcciones primero
                      </p>
                    </div>
                  ) : null}
                  <button
                    onClick={() => {
                      onMortgage?.()
                      setIsOpen(false)
                    }}
                    disabled={property.houses > 0 || property.hotels > 0}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-semibold"
                  >
                    Hipotecar por ${mortgageValue.toLocaleString()}
                  </button>
                </div>
              ) : (
                <div className="border-2 border-yellow-200 rounded-lg p-4 bg-yellow-50">
                  <h4 className="font-semibold mb-2 text-yellow-900">💳 Deshipotecar Propiedad</h4>
                  <p className="text-sm text-yellow-700 mb-3">
                    Costo: <strong>110%</strong> del valor de hipoteca (hipoteca + 10% interés)
                  </p>
                  <div className="bg-white rounded-lg p-3 mb-3 border border-yellow-200">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-gray-600">Valor de hipoteca:</span>
                      <span className="text-sm text-gray-700">${mortgageValue.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Costo total:</span>
                      <span className="text-lg font-bold text-yellow-600">${unmortgageCost.toLocaleString()}</span>
                    </div>
                  </div>
                  {playerMoney < unmortgageCost && (
                    <div className="bg-red-50 border border-red-300 rounded-lg p-2 mb-3">
                      <p className="text-xs text-red-800">
                        ⚠️ Te faltan ${(unmortgageCost - playerMoney).toLocaleString()}
                      </p>
                    </div>
                  )}
                  <button
                    onClick={() => {
                      onUnmortgage?.()
                      setIsOpen(false)
                    }}
                    disabled={playerMoney < unmortgageCost}
                    className="w-full bg-yellow-600 text-white py-2 px-4 rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-semibold"
                  >
                    {playerMoney < unmortgageCost 
                      ? `Faltan $${(unmortgageCost - playerMoney).toLocaleString()}`
                      : `Deshipotecar por $${unmortgageCost.toLocaleString()}`
                    }
                  </button>
                </div>
              )}

              {/* Vender Construcciones */}
              {(property.houses > 0 || property.hotels > 0) && !property.is_mortgaged && (
                <div className="border-2 border-green-200 rounded-lg p-4 bg-green-50">
                  <h4 className="font-semibold mb-3 text-green-900">🏗️ Vender Construcciones</h4>
                  <p className="text-xs text-green-700 mb-3">
                    Recibirás el <strong>50%</strong> del precio de construcción
                  </p>
                  
                  <div className="space-y-3">
                    {property.houses > 0 && (
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <label className="text-sm font-medium text-gray-700">
                            Casas: {housesToSell} / {property.houses}
                          </label>
                          <span className="text-xs text-gray-600">
                            ${Math.floor(property.country.house_price * 0.5).toLocaleString()} c/u
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max={property.houses}
                          value={housesToSell}
                          onChange={(e) => setHousesToSell(Number(e.target.value))}
                          className="w-full"
                        />
                      </div>
                    )}
                    
                    {property.hotels > 0 && (
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <label className="text-sm font-medium text-gray-700">
                            Hoteles: {hotelsToSell} / {property.hotels}
                          </label>
                          <span className="text-xs text-gray-600">
                            ${Math.floor(property.country.hotel_price * 0.5).toLocaleString()} c/u
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max={property.hotels}
                          value={hotelsToSell}
                          onChange={(e) => setHotelsToSell(Number(e.target.value))}
                          className="w-full"
                        />
                      </div>
                    )}
                    
                    {sellBuildValue > 0 && (
                      <div className="bg-white rounded-lg p-3 border border-green-200">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-700">Total a recibir:</span>
                          <span className="text-lg font-bold text-green-600">${sellBuildValue.toLocaleString()}</span>
                        </div>
                      </div>
                    )}
                    
                    <button
                      onClick={() => {
                        onSellBuild?.(housesToSell, hotelsToSell)
                        setIsOpen(false)
                        setHousesToSell(0)
                        setHotelsToSell(0)
                      }}
                      disabled={housesToSell === 0 && hotelsToSell === 0}
                      className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-semibold"
                    >
                      Vender por ${sellBuildValue.toLocaleString()}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Tu dinero:</span>
                <span className="font-semibold text-gray-900">${playerMoney.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

