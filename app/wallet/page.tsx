'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/contexts/ToastContext'
import Link from 'next/link'

interface Wallet {
  coins: number
  total_earned: number
  total_spent: number
}

interface Transaction {
  id: string
  amount: number
  type: string
  description: string
  created_at: string
}

interface CoinPackage {
  id: string
  name: string
  description: string
  coins: number
  price_mxn: number
  bonus_coins: number
}

export default function WalletPage() {
  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [packages, setPackages] = useState<CoinPackage[]>([])
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState<string | null>(null)
  const toast = useToast()
  const supabase = createClient()

  useEffect(() => {
    fetchWalletData()
    fetchPackages()
    
    // Verificar si hay parámetros de pago en la URL
    const urlParams = new URLSearchParams(window.location.search)
    const paymentStatus = urlParams.get('payment')
    if (paymentStatus === 'success') {
      toast.showSuccess('¡Pago exitoso! Tus TuristaCoins han sido agregados')
      fetchWalletData()
      // Limpiar URL
      window.history.replaceState({}, '', '/wallet')
    } else if (paymentStatus === 'failure') {
      toast.showError('El pago fue rechazado. Intenta nuevamente')
      window.history.replaceState({}, '', '/wallet')
    } else if (paymentStatus === 'pending') {
      toast.showToast('Tu pago está pendiente. Se procesará cuando sea aprobado', 'info')
      window.history.replaceState({}, '', '/wallet')
    }
  }, [])

  const fetchWalletData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      // Obtener wallet
      const { data: walletData, error: walletError } = await supabase
        .from('user_wallet')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (walletError && walletError.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error obteniendo wallet:', walletError)
      } else {
        setWallet(walletData || { coins: 0, total_earned: 0, total_spent: 0 })
      }

      // Obtener transacciones recientes
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('coin_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (transactionsError) {
        console.error('Error obteniendo transacciones:', transactionsError)
      } else {
        setTransactions(transactionsData || [])
      }
    } catch (error) {
      console.error('Error obteniendo datos del wallet:', error)
      toast.showError('Error al cargar datos del wallet')
    } finally {
      setLoading(false)
    }
  }

  const fetchPackages = async () => {
    try {
      const response = await fetch('/api/payments/packages')
      const data = await response.json()
      
      if (response.ok) {
        setPackages(data.packages || [])
      }
    } catch (error) {
      console.error('Error obteniendo paquetes:', error)
    }
  }

  const handlePurchase = async (packageId: string) => {
    try {
      setPurchasing(packageId)
      
      const response = await fetch('/api/payments/create-preference', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ packageId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al crear preferencia de pago')
      }

      // Redirigir a Mercado Pago
      if (data.init_point) {
        window.location.href = data.init_point
      } else if (data.sandbox_init_point) {
        // En desarrollo, usar sandbox
        window.location.href = data.sandbox_init_point
      } else {
        throw new Error('No se recibió URL de pago')
      }
    } catch (error: any) {
      console.error('Error iniciando compra:', error)
      toast.showError(error.message || 'Error al iniciar la compra')
      setPurchasing(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4"></div>
          <p className="text-white/80">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 pb-20 md:pb-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 mb-4 transition text-sm sm:text-base"
          >
            <span>←</span>
            <span>Volver al Dashboard</span>
          </Link>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Mi Wallet</h1>
          <p className="text-white/80">Gestiona tus TuristaCoins</p>
        </div>

        {/* Balance Card */}
        <div className="bg-gradient-to-r from-cyan-600 via-blue-600 to-pink-600 rounded-xl shadow-2xl p-6 sm:p-8 mb-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-blue-100 text-sm sm:text-base mb-2">Balance Actual</p>
              <p className="text-4xl sm:text-5xl font-bold">
                {wallet?.coins.toLocaleString() || '0'} <span className="text-2xl sm:text-3xl">TC</span>
              </p>
            </div>
            <div className="text-5xl sm:text-6xl">💰</div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-white/20">
            <div>
              <p className="text-blue-100 text-xs sm:text-sm mb-1">Total Ganado</p>
              <p className="text-xl sm:text-2xl font-bold">+{wallet?.total_earned.toLocaleString() || '0'}</p>
            </div>
            <div>
              <p className="text-blue-100 text-xs sm:text-sm mb-1">Total Gastado</p>
              <p className="text-xl sm:text-2xl font-bold">-{wallet?.total_spent.toLocaleString() || '0'}</p>
            </div>
          </div>
        </div>

        {/* Comprar TuristaCoins */}
        {packages.length > 0 && (
          <div className="bg-white/10 backdrop-blur-md rounded-xl shadow-lg p-4 sm:p-6 mb-6 border border-white/20">
            <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-white flex items-center gap-2">
              <span>💳</span>
              Comprar TuristaCoins
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {packages.map((pkg) => (
                <div
                  key={pkg.id}
                  className="bg-gradient-to-br from-cyan-500/20 to-purple-500/20 rounded-xl p-4 border-2 border-white/20 hover:border-cyan-400 transition-all"
                >
                  <div className="text-center mb-4">
                    <div className="text-4xl mb-2">💰</div>
                    <h3 className="font-bold text-white text-lg mb-1">{pkg.name}</h3>
                    <p className="text-cyan-300 font-bold text-2xl mb-1">
                      {pkg.coins.toLocaleString()} TC
                    </p>
                    {pkg.bonus_coins > 0 && (
                      <p className="text-green-400 text-sm font-semibold">
                        +{pkg.bonus_coins.toLocaleString()} TC Bonus
                      </p>
                    )}
                  </div>
                  <div className="text-center mb-4">
                    <p className="text-white/80 text-sm mb-1">Precio</p>
                    <p className="text-white font-bold text-xl">${pkg.price_mxn.toFixed(2)} MXN</p>
                  </div>
                  <button
                    onClick={() => handlePurchase(pkg.id)}
                    disabled={purchasing === pkg.id}
                    className={`w-full py-2.5 px-4 rounded-lg font-semibold transition ${
                      purchasing === pkg.id
                        ? 'bg-white/10 text-white/50 cursor-wait'
                        : 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-600 hover:to-blue-700 shadow-lg hover:shadow-xl'
                    }`}
                  >
                    {purchasing === pkg.id ? 'Procesando...' : 'Comprar'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Link
            href="/missions"
            className="bg-white/10 backdrop-blur-md rounded-xl shadow-lg p-4 sm:p-6 hover:shadow-xl transition text-center border-2 border-white/20 hover:border-cyan-400"
          >
            <div className="text-4xl mb-2">🎯</div>
            <h3 className="font-semibold text-white mb-1">Misiones</h3>
            <p className="text-sm text-white/70">Gana coins</p>
          </Link>
          <Link
            href="/shop"
            className="bg-white/10 backdrop-blur-md rounded-xl shadow-lg p-4 sm:p-6 hover:shadow-xl transition text-center border-2 border-white/20 hover:border-pink-400"
          >
            <div className="text-4xl mb-2">🛒</div>
            <h3 className="font-semibold text-white mb-1">Tienda</h3>
            <p className="text-sm text-white/70">Gasta coins</p>
          </Link>
          <Link
            href="/recognition"
            className="bg-white/10 backdrop-blur-md rounded-xl shadow-lg p-4 sm:p-6 hover:shadow-xl transition text-center border-2 border-white/20 hover:border-yellow-400"
          >
            <div className="text-4xl mb-2">🏆</div>
            <h3 className="font-semibold text-white mb-1">Rankings</h3>
            <p className="text-sm text-white/70">Salón de la Fama</p>
          </Link>
          <Link
            href="/referrals"
            className="bg-white/10 backdrop-blur-md rounded-xl shadow-lg p-4 sm:p-6 hover:shadow-xl transition text-center border-2 border-white/20 hover:border-green-400"
          >
            <div className="text-4xl mb-2">👥</div>
            <h3 className="font-semibold text-white mb-1">Referidos</h3>
            <p className="text-sm text-white/70">Invita amigos</p>
          </Link>
        </div>

        {/* Historial de Transacciones */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl shadow-lg p-4 sm:p-6 border border-white/20">
          <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-white">Historial de Transacciones</h2>
          {transactions.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-3 border border-white/20">
                <span className="text-3xl">📝</span>
              </div>
              <p className="text-white/80 mb-2">No hay transacciones aún</p>
              <p className="text-sm text-white/60">Completa misiones para empezar a ganar TuristaCoins</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition border border-white/10"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white truncate">{transaction.description}</p>
                    <p className="text-xs text-white/60">
                      {new Date(transaction.created_at).toLocaleString('es-ES', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-lg font-bold ${transaction.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {transaction.amount > 0 ? '+' : ''}{transaction.amount.toLocaleString()} TC
                    </span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      transaction.type === 'mission' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30' :
                      transaction.type === 'achievement' ? 'bg-purple-500/20 text-purple-300 border border-purple-400/30' :
                      transaction.type === 'referral' ? 'bg-green-500/20 text-green-300 border border-green-400/30' :
                      transaction.type === 'purchase_item' ? 'bg-orange-500/20 text-orange-300 border border-orange-400/30' :
                      'bg-white/10 text-white/70 border border-white/20'
                    }`}>
                      {transaction.type}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

