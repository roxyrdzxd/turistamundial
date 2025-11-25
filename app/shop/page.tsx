'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/contexts/ToastContext'
import Link from 'next/link'

interface ShopItem {
  id: string
  name: string
  description: string
  category: string
  price_coins: number
  image_url: string | null
  data: any
}

interface Wallet {
  coins: number
}

export default function ShopPage() {
  const [items, setItems] = useState<ShopItem[]>([])
  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const toast = useToast()
  const supabase = createClient()

  useEffect(() => {
    fetchShopData()
  }, [])

  const fetchShopData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      // Obtener items de la tienda
      const { data: itemsData, error: itemsError } = await supabase
        .from('shop_items')
        .select('*')
        .eq('is_active', true)
        .order('category', { ascending: true })
        .order('price_coins', { ascending: true })

      if (itemsError) {
        console.error('Error obteniendo items:', itemsError)
      } else {
        setItems(itemsData || [])
      }

      // Obtener wallet
      const { data: walletData, error: walletError } = await supabase
        .from('user_wallet')
        .select('coins')
        .eq('user_id', user.id)
        .single()

      if (walletError && walletError.code !== 'PGRST116') {
        console.error('Error obteniendo wallet:', walletError)
      } else {
        setWallet(walletData || { coins: 0 })
      }
    } catch (error) {
      console.error('Error obteniendo datos de la tienda:', error)
      toast.showError('Error al cargar la tienda')
    } finally {
      setLoading(false)
    }
  }

  const purchaseItem = async (item: ShopItem) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      if (!wallet || wallet.coins < item.price_coins) {
        toast.showError('No tienes suficientes TuristaCoins')
        return
      }

      // Gastar coins
      const { data: spendData, error: spendError } = await supabase.rpc('spend_coins', {
        p_user_id: user.id,
        p_amount: item.price_coins,
        p_type: 'purchase_item',
        p_description: `Compra: ${item.name}`,
        p_reference_id: item.id
      })

      if (spendError) {
        toast.showError('Error al procesar la compra')
        return
      }

      if (spendData && spendData.success) {
        // Agregar item al inventario
        const { error: inventoryError } = await supabase
          .from('user_inventory')
          .insert({
            user_id: user.id,
            item_id: item.id,
            is_equipped: false
          })

        if (inventoryError) {
          console.error('Error agregando al inventario:', inventoryError)
          // Reembolsar si falla
          await supabase.rpc('grant_coins', {
            p_user_id: user.id,
            p_amount: item.price_coins,
            p_type: 'refund',
            p_description: `Reembolso: ${item.name}`
          })
          toast.showError('Error al agregar item al inventario')
          return
        }

        toast.showSuccess(`¡${item.name} comprado exitosamente!`)
        fetchShopData()
      } else {
        toast.showError(spendData?.error || 'Error al procesar la compra')
      }
    } catch (error) {
      console.error('Error comprando item:', error)
      toast.showError('Error al procesar la compra')
    }
  }

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      avatar: 'Avatares',
      color: 'Colores',
      effect: 'Efectos',
      boost: 'Boosts',
      cosmetic: 'Cosméticos',
      theme: 'Temas'
    }
    return labels[category] || category
  }

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      avatar: '👤',
      color: '🎨',
      effect: '✨',
      boost: '⚡',
      cosmetic: '💎',
      theme: '🎭'
    }
    return icons[category] || '🛍️'
  }

  const categories = [...new Set(items.map(item => item.category))]

  const filteredItems = selectedCategory
    ? items.filter(item => item.category === selectedCategory)
    : items

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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/wallet"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4 transition text-sm sm:text-base"
          >
            <span>←</span>
            <span>Volver a Wallet</span>
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">Tienda</h1>
              <p className="text-gray-600">Compra items con TuristaCoins</p>
            </div>
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg">
              <p className="text-xs text-blue-100 mb-1">Tu Balance</p>
              <p className="text-2xl font-bold">{wallet?.coins.toLocaleString() || '0'} TC</p>
            </div>
          </div>
        </div>

        {/* Filtros de categoría */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-4 py-2 rounded-lg font-semibold transition ${
              selectedCategory === null
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Todas
          </button>
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-lg font-semibold transition flex items-center gap-2 ${
                selectedCategory === category
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span>{getCategoryIcon(category)}</span>
              {getCategoryLabel(category)}
            </button>
          ))}
        </div>

        {/* Grid de items */}
        {filteredItems.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-3xl">🛒</span>
            </div>
            <p className="text-gray-600 mb-2">No hay items disponibles en esta categoría</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map(item => {
              const canAfford = wallet ? wallet.coins >= item.price_coins : false
              
              return (
                <div
                  key={item.id}
                  className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition"
                >
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-full h-48 object-cover"
                    />
                  ) : (
                    <div className="w-full h-48 bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                      <span className="text-6xl">{getCategoryIcon(item.category)}</span>
                    </div>
                  )}
                  
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-gray-900">{item.name}</h3>
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                        {getCategoryLabel(item.category)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">{item.description}</p>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-500">Precio</p>
                        <p className="text-xl font-bold text-green-600">{item.price_coins.toLocaleString()} TC</p>
                      </div>
                      <button
                        onClick={() => purchaseItem(item)}
                        disabled={!canAfford}
                        className={`px-4 py-2 rounded-lg font-semibold transition ${
                          canAfford
                            ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        {canAfford ? 'Comprar' : 'Insuficiente'}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

