'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import AdminLayout from '@/components/admin/AdminLayout'
import Link from 'next/link'

interface Treasure {
  id: string
  name: string
  description: string | null
  coins_reward: number
  latitude: number
  longitude: number
  radius_meters: number
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  max_collections: number | null
  current_collections: number
  spawn_time: string
  despawn_time: string | null
  is_active: boolean
  created_at: string
}

export default function AdminTreasuresPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [treasures, setTreasures] = useState<Treasure[]>([])
  const [filter, setFilter] = useState<{ isActive: string | null; rarity: string | null }>({
    isActive: null,
    rarity: null,
  })

  useEffect(() => {
    checkAdminAndLoad()
  }, [filter])

  const checkAdminAndLoad = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      router.push('/dashboard')
      return
    }

    await loadTreasures()
    setLoading(false)
  }

  const loadTreasures = async () => {
    try {
      const params = new URLSearchParams()
      if (filter.isActive !== null) params.append('is_active', filter.isActive)
      if (filter.rarity) params.append('rarity', filter.rarity)

      const response = await fetch(`/api/admin/treasures?${params.toString()}`)
      const data = await response.json()

      if (data.success) {
        setTreasures(data.treasures || [])
      }
    } catch (error) {
      console.error('Error cargando tesoros:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este tesoro?')) return

    try {
      const response = await fetch(`/api/admin/treasures/${id}`, {
        method: 'DELETE',
      })

      const data = await response.json()
      if (data.success) {
        await loadTreasures()
      } else {
        alert('Error al eliminar tesoro: ' + data.error)
      }
    } catch (error) {
      console.error('Error eliminando tesoro:', error)
      alert('Error al eliminar tesoro')
    }
  }

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'bg-gray-500'
      case 'rare': return 'bg-cyan-500'
      case 'epic': return 'bg-purple-500'
      case 'legendary': return 'bg-orange-500'
      default: return 'bg-gray-500'
    }
  }

  const getRarityName = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'Común'
      case 'rare': return 'Raro'
      case 'epic': return 'Épico'
      case 'legendary': return 'Legendario'
      default: return rarity
    }
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-cyan-400 border-t-transparent mx-auto mb-4"></div>
            <p className="text-white/80">Cargando tesoros...</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Gestión de Tesoros</h1>
            <p className="text-white/70">Administra todos los tesoros del juego</p>
          </div>
          <Link
            href="/admin/treasures/new"
            className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-6 py-3 rounded-lg hover:from-cyan-600 hover:to-blue-700 transition font-semibold"
          >
            ➕ Crear Tesoro
          </Link>
        </div>

        {/* Filtros */}
        <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 border border-white/20">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Estado
              </label>
              <select
                value={filter.isActive || ''}
                onChange={(e) => setFilter({ ...filter, isActive: e.target.value || null })}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="">Todos</option>
                <option value="true">Activos</option>
                <option value="false">Inactivos</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Rareza
              </label>
              <select
                value={filter.rarity || ''}
                onChange={(e) => setFilter({ ...filter, rarity: e.target.value || null })}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="">Todas</option>
                <option value="common">Común</option>
                <option value="rare">Raro</option>
                <option value="epic">Épico</option>
                <option value="legendary">Legendario</option>
              </select>
            </div>
          </div>
        </div>

        {/* Lista de tesoros */}
        <div className="bg-white/10 backdrop-blur-md rounded-lg border border-white/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/80 uppercase tracking-wider">
                    Nombre
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/80 uppercase tracking-wider">
                    Rareza
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/80 uppercase tracking-wider">
                    Recompensa
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/80 uppercase tracking-wider">
                    Ubicación
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/80 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/80 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {treasures.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-white/60">
                      No hay tesoros disponibles
                    </td>
                  </tr>
                ) : (
                  treasures.map((treasure) => (
                    <tr key={treasure.id} className="hover:bg-white/5 transition">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-white">{treasure.name}</div>
                        {treasure.description && (
                          <div className="text-xs text-white/60 mt-1">{treasure.description}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white ${getRarityColor(treasure.rarity)}`}>
                          {getRarityName(treasure.rarity)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                        💰 {treasure.coins_reward}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white/80">
                        {treasure.latitude.toFixed(6)}, {treasure.longitude.toFixed(6)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {treasure.is_active ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
                            Activo
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-400">
                            Inactivo
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/admin/treasures/${treasure.id}/edit`}
                            className="text-cyan-400 hover:text-cyan-300 transition"
                          >
                            ✏️ Editar
                          </Link>
                          <button
                            onClick={() => handleDelete(treasure.id)}
                            className="text-red-400 hover:text-red-300 transition"
                          >
                            🗑️ Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
