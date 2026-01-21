'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import AdminLayout from '@/components/admin/AdminLayout'
import Link from 'next/link'

interface Template {
  id: string
  name: string
  description: string | null
  coins_reward: number
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  badge_url: string | null
  spawn_probability: number
  min_distance_meters: number
  max_distance_meters: number
  min_walk_distance_meters: number
  is_active: boolean
  created_at: string
}

export default function AdminTemplatesPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [templates, setTemplates] = useState<Template[]>([])

  useEffect(() => {
    checkAdminAndLoad()
  }, [])

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

    await loadTemplates()
    setLoading(false)
  }

  const loadTemplates = async () => {
    try {
      const response = await fetch('/api/admin/treasures/templates')
      const data = await response.json()

      if (data.success) {
        setTemplates(data.templates || [])
      }
    } catch (error) {
      console.error('Error cargando templates:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este template?')) return

    try {
      const response = await fetch(`/api/admin/treasures/templates/${id}`, {
        method: 'DELETE',
      })

      const data = await response.json()
      if (data.success) {
        await loadTemplates()
      } else {
        alert('Error al eliminar template: ' + data.error)
      }
    } catch (error) {
      console.error('Error eliminando template:', error)
      alert('Error al eliminar template')
    }
  }

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/treasures/templates/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentStatus })
      })

      const data = await response.json()
      if (data.success) {
        await loadTemplates()
      } else {
        alert('Error al actualizar template: ' + data.error)
      }
    } catch (error) {
      console.error('Error actualizando template:', error)
      alert('Error al actualizar template')
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
            <p className="text-white/80">Cargando templates...</p>
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
            <h1 className="text-3xl font-bold text-white mb-2">Templates de Tesoros Dinámicos</h1>
            <p className="text-white/70">Gestiona los templates que aparecen aleatoriamente cerca de los usuarios</p>
          </div>
          <Link
            href="/admin/treasures/templates/new"
            className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-6 py-3 rounded-lg hover:from-cyan-600 hover:to-blue-700 transition font-semibold"
          >
            ➕ Crear Template
          </Link>
        </div>

        {/* Info box */}
        <div className="bg-cyan-500/20 rounded-lg p-4 border border-cyan-400/30">
          <h3 className="font-semibold text-cyan-200 mb-2">💡 ¿Cómo funcionan los templates?</h3>
          <ul className="space-y-1 text-sm text-cyan-100">
            <li>• Los templates definen tesoros que pueden aparecer aleatoriamente cerca de los usuarios</li>
            <li>• La <strong>probabilidad de spawn</strong> determina qué tan frecuentemente aparecen (0.0 a 1.0)</li>
            <li>• La <strong>distancia mínima/máxima</strong> define qué tan lejos aparecen (requiere caminar)</li>
            <li>• Si el template tiene <strong>insignia (badge_url)</strong>, se otorga al recolectar el tesoro</li>
            <li>• Los tesoros generados desde templates desaparecen después de 24 horas</li>
          </ul>
        </div>

        {/* Lista de templates */}
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
                    Probabilidad
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/80 uppercase tracking-wider">
                    Distancia
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white/80 uppercase tracking-wider">
                    Insignia
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
                {templates.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-white/60">
                      No hay templates disponibles. Crea uno para que aparezcan tesoros dinámicos con insignias.
                    </td>
                  </tr>
                ) : (
                  templates.map((template) => (
                    <tr key={template.id} className="hover:bg-white/5 transition">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-white">{template.name}</div>
                        {template.description && (
                          <div className="text-xs text-white/60 mt-1">{template.description}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white ${getRarityColor(template.rarity)}`}>
                          {getRarityName(template.rarity)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                        {(template.spawn_probability * 100).toFixed(1)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white/80">
                        {template.min_distance_meters}m - {template.max_distance_meters}m
                        <div className="text-xs text-white/60">
                          Caminar: {template.min_walk_distance_meters}m
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {template.badge_url ? (
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full border-2 border-yellow-400 bg-white/10 p-1">
                              <img
                                src={template.badge_url}
                                alt="Badge"
                                className="w-full h-full rounded-full object-cover"
                              />
                            </div>
                            <span className="text-xs text-yellow-400">Con insignia</span>
                          </div>
                        ) : (
                          <span className="text-xs text-white/40">Sin insignia</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleToggleActive(template.id, template.is_active)}
                          className={`px-3 py-1 rounded text-xs font-semibold transition ${
                            template.is_active
                              ? 'bg-green-500/20 text-green-400 border border-green-400/30'
                              : 'bg-red-500/20 text-red-400 border border-red-400/30'
                          }`}
                        >
                          {template.is_active ? 'Activo' : 'Inactivo'}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/admin/treasures/templates/${template.id}/edit`}
                            className="text-cyan-400 hover:text-cyan-300 transition"
                          >
                            ✏️ Editar
                          </Link>
                          <button
                            onClick={() => handleDelete(template.id)}
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
