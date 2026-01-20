'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import AdminLayout from '@/components/admin/AdminLayout'
import Link from 'next/link'

interface Mission {
  id: string
  title: string
  description: string
  type: 'daily' | 'weekly' | 'achievement' | 'special'
  reward_coins: number
  requirement: any
  is_active: boolean
  expires_at: string | null
  created_at: string
}

export default function AdminMissionsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [missions, setMissions] = useState<Mission[]>([])
  const [filter, setFilter] = useState<{ type: string | null; isActive: string | null }>({
    type: null,
    isActive: null,
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

    await loadMissions()
    setLoading(false)
  }

  const loadMissions = async () => {
    try {
      const params = new URLSearchParams()
      if (filter.type) params.append('type', filter.type)
      if (filter.isActive !== null) params.append('is_active', filter.isActive)

      const response = await fetch(`/api/admin/missions?${params.toString()}`)
      const data = await response.json()

      if (data.success) {
        setMissions(data.missions || [])
      }
    } catch (error) {
      console.error('Error cargando misiones:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta misión?')) return

    try {
      const response = await fetch(`/api/admin/missions/${id}`, {
        method: 'DELETE',
      })

      const data = await response.json()
      if (data.success) {
        await loadMissions()
      } else {
        alert('Error al eliminar misión: ' + data.error)
      }
    } catch (error) {
      console.error('Error eliminando misión:', error)
      alert('Error al eliminar misión')
    }
  }

  const getTypeName = (type: string) => {
    switch (type) {
      case 'daily': return 'Diaria'
      case 'weekly': return 'Semanal'
      case 'achievement': return 'Logro'
      case 'special': return 'Especial'
      default: return type
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'daily': return 'bg-blue-500'
      case 'weekly': return 'bg-purple-500'
      case 'achievement': return 'bg-yellow-500'
      case 'special': return 'bg-pink-500'
      default: return 'bg-gray-500'
    }
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-cyan-400 border-t-transparent mx-auto mb-4"></div>
            <p className="text-white/80">Cargando misiones...</p>
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
            <h1 className="text-3xl font-bold text-white mb-2">Gestión de Misiones</h1>
            <p className="text-white/70">Administra todas las misiones del juego</p>
          </div>
          <Link
            href="/admin/missions/new"
            className="bg-gradient-to-r from-purple-500 to-pink-600 text-white px-6 py-3 rounded-lg hover:from-purple-600 hover:to-pink-700 transition font-semibold"
          >
            ➕ Crear Misión
          </Link>
        </div>

        {/* Filtros */}
        <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 border border-white/20">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Tipo
              </label>
              <select
                value={filter.type || ''}
                onChange={(e) => setFilter({ ...filter, type: e.target.value || null })}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Todos</option>
                <option value="daily">Diaria</option>
                <option value="weekly">Semanal</option>
                <option value="achievement">Logro</option>
                <option value="special">Especial</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Estado
              </label>
              <select
                value={filter.isActive || ''}
                onChange={(e) => setFilter({ ...filter, isActive: e.target.value || null })}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Todos</option>
                <option value="true">Activas</option>
                <option value="false">Inactivas</option>
              </select>
            </div>
          </div>
        </div>

        {/* Lista de misiones */}
        <div className="bg-white/10 backdrop-blur-md rounded-lg border border-white/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/80 uppercase tracking-wider">
                    Título
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/80 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/80 uppercase tracking-wider">
                    Recompensa
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/80 uppercase tracking-wider">
                    Requisito
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
                {missions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-white/60">
                      No hay misiones disponibles
                    </td>
                  </tr>
                ) : (
                  missions.map((mission) => (
                    <tr key={mission.id} className="hover:bg-white/5 transition">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-white">{mission.title}</div>
                        <div className="text-xs text-white/60 mt-1">{mission.description}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white ${getTypeColor(mission.type)}`}>
                          {getTypeName(mission.type)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                        💰 {mission.reward_coins}
                      </td>
                      <td className="px-6 py-4 text-sm text-white/80">
                        {mission.requirement?.action && (
                          <div>
                            <span className="font-medium">{mission.requirement.action}</span>
                            {mission.requirement.count && (
                              <span className="ml-1">x{mission.requirement.count}</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {mission.is_active ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
                            Activa
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-400">
                            Inactiva
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/admin/missions/${mission.id}/edit`}
                            className="text-purple-400 hover:text-purple-300 transition"
                          >
                            ✏️ Editar
                          </Link>
                          <button
                            onClick={() => handleDelete(mission.id)}
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
