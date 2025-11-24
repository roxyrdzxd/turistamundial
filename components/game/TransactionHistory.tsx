'use client'

import { useEffect, useState } from 'react'

interface Transaction {
  id: string
  player_id: string
  move_type: string
  move_data: {
    country_name?: string
    amount?: number
    price?: number
    action_taken?: string
    die1?: number
    die2?: number
    total?: number
  }
  created_at: string
  player: {
    profile: {
      username: string
    }
    color: string
  }
}

interface TransactionHistoryProps {
  sessionId: string
}

const PLAYER_COLORS: Record<string, string> = {
  red: '#ef4444',
  blue: '#3b82f6',
  green: '#10b981',
  yellow: '#eab308',
  purple: '#a855f7',
  orange: '#f97316',
  pink: '#ec4899',
  cyan: '#06b6d4',
}

export default function TransactionHistory({ sessionId }: TransactionHistoryProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const response = await fetch(`/api/game/transactions/${sessionId}`)
        const data = await response.json()
        
        if (data.transactions) {
          setTransactions(data.transactions.slice(0, 20)) // Últimas 20 transacciones
        }
      } catch (err) {
        console.error('Error obteniendo transacciones:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchTransactions()
    const interval = setInterval(fetchTransactions, 3000) // Actualizar cada 3 segundos
    return () => clearInterval(interval)
  }, [sessionId])

  const getTransactionIcon = (moveType: string) => {
    switch (moveType) {
      case 'roll_dice':
        return '🎲'
      case 'buy_country':
        return '🏛️'
      case 'pay_toll':
        return '💰'
      case 'build':
        return '🏗️'
      case 'npc_turn':
        return '🤖'
      case 'draw_card':
        return '🎴'
      default:
        return '📝'
    }
  }

  const getTransactionText = (transaction: Transaction) => {
    const { move_type, move_data, player } = transaction
    
    switch (move_type) {
      case 'roll_dice':
        return `${player.profile.username} tiró ${move_data.die1} + ${move_data.die2} = ${move_data.total}`
      case 'buy_country':
        const purchasePrice = move_data.price || move_data.amount || 0
        return `${player.profile.username} compró ${move_data.country_name} por $${purchasePrice.toLocaleString()}`
      case 'pay_toll':
        return `${player.profile.username} pagó $${move_data.amount?.toLocaleString()} de peaje`
      case 'build':
        return `${player.profile.username} construyó en ${move_data.country_name}`
      case 'npc_turn':
        if (move_data.action_taken === 'bought_country') {
          return `${player.profile.username} compró un país`
        } else if (move_data.action_taken === 'paid_toll') {
          return `${player.profile.username} pagó peaje`
        } else {
          return `${player.profile.username} avanzó`
        }
      default:
        return `${player.profile.username}: ${move_type}`
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-4 flex flex-col">
      <h3 className="text-lg font-bold mb-3 text-gray-900 flex items-center gap-2">
        <span>📜</span>
        <span>Historial</span>
      </h3>
      <div className="overflow-y-auto space-y-2 max-h-[300px] sm:max-h-[400px]">
        {transactions.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-4">No hay transacciones aún</p>
        ) : (
          transactions.map((transaction) => {
            const playerColor = PLAYER_COLORS[transaction.player.color] || '#gray'
            
            return (
              <div
                key={transaction.id}
                className="flex items-start gap-2 p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors border-l-4"
                style={{ borderLeftColor: playerColor }}
              >
                <span className="text-xl flex-shrink-0">{getTransactionIcon(transaction.move_type)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 font-medium break-words">
                    {getTransactionText(transaction)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(transaction.created_at).toLocaleTimeString('es-ES', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

