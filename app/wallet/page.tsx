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

export default function WalletPage() {
  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const toast = useToast()
  const supabase = createClient()

  useEffect(() => {
    fetchWalletData()
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 pb-20 md:pb-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4 transition text-sm sm:text-base"
          >
            <span>←</span>
            <span>Volver al Dashboard</span>
          </Link>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">Mi Wallet</h1>
          <p className="text-gray-600">Gestiona tus TuristaCoins</p>
        </div>

        {/* Balance Card */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-2xl p-6 sm:p-8 mb-6 text-white">
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

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Link
            href="/missions"
            className="bg-white rounded-xl shadow-lg p-4 sm:p-6 hover:shadow-xl transition text-center border-2 border-transparent hover:border-blue-300"
          >
            <div className="text-4xl mb-2">🎯</div>
            <h3 className="font-semibold text-gray-900 mb-1">Misiones</h3>
            <p className="text-sm text-gray-600">Gana coins</p>
          </Link>
          <Link
            href="/shop"
            className="bg-white rounded-xl shadow-lg p-4 sm:p-6 hover:shadow-xl transition text-center border-2 border-transparent hover:border-purple-300"
          >
            <div className="text-4xl mb-2">🛒</div>
            <h3 className="font-semibold text-gray-900 mb-1">Tienda</h3>
            <p className="text-sm text-gray-600">Gasta coins</p>
          </Link>
          <Link
            href="/recognition"
            className="bg-white rounded-xl shadow-lg p-4 sm:p-6 hover:shadow-xl transition text-center border-2 border-transparent hover:border-yellow-300"
          >
            <div className="text-4xl mb-2">🏆</div>
            <h3 className="font-semibold text-gray-900 mb-1">Rankings</h3>
            <p className="text-sm text-gray-600">Salón de la Fama</p>
          </Link>
          <Link
            href="/referrals"
            className="bg-white rounded-xl shadow-lg p-4 sm:p-6 hover:shadow-xl transition text-center border-2 border-transparent hover:border-green-300"
          >
            <div className="text-4xl mb-2">👥</div>
            <h3 className="font-semibold text-gray-900 mb-1">Referidos</h3>
            <p className="text-sm text-gray-600">Invita amigos</p>
          </Link>
        </div>

        {/* Historial de Transacciones */}
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
          <h2 className="text-xl sm:text-2xl font-semibold mb-4">Historial de Transacciones</h2>
          {transactions.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-3xl">📝</span>
              </div>
              <p className="text-gray-600 mb-2">No hay transacciones aún</p>
              <p className="text-sm text-gray-500">Completa misiones para empezar a ganar TuristaCoins</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{transaction.description}</p>
                    <p className="text-xs text-gray-500">
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
                    <span className={`text-lg font-bold ${transaction.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {transaction.amount > 0 ? '+' : ''}{transaction.amount.toLocaleString()} TC
                    </span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      transaction.type === 'mission' ? 'bg-blue-100 text-blue-700' :
                      transaction.type === 'achievement' ? 'bg-purple-100 text-purple-700' :
                      transaction.type === 'referral' ? 'bg-green-100 text-green-700' :
                      transaction.type === 'purchase_item' ? 'bg-orange-100 text-orange-700' :
                      'bg-gray-100 text-gray-700'
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

