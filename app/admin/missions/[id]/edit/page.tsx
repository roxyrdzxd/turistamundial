'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'
import AdminLayout from '@/components/admin/AdminLayout'
import Link from 'next/link'

interface Mission {
  id: string
  title: string
  description: string
  type: 'daily' | 'weekly' | 'achievement' | 'special'
  reward_coins: number
  requirement: any
  expires_at: string | null
  is_active: boolean
}

export default function EditMissionPage() {
  const router = useRouter()
  const params = useParams()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [mission, setMission] = useState<Mission | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'daily' as 'daily' | 'weekly' | 'achievement' | 'special',
    reward_coins: 50,
    action: '',
    count: 1,
    expires_at: '',
    is_active: true,
  })

  useEffect(() => {
    checkAdminAndLoad()
  }, [params.id])

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

    await loadMission()
  }

  const loadMission = async () => {
    try {
      const response = await fetch(`/api/admin/missions/${params.id}`)
      const data = await response.json()

      if (data.success && data.mission) {
        const m = data.mission
        setMission(m)
        setFormData({
          title: m.title,
          description: m.description,
          type: m.type,
          reward_coins: m.reward_coins,
          action: m.requirement?.action || '',
          count: m.requirement?.count || 1,
          expires_at: m.expires_at ? new Date(m.expires_at).toISOString().slice(0, 16) : '',
          is_active: m.is_active,
        })
      } else {
        alert('Misión no encontrada')
        router.push('/admin/missions')
      }
      setLoading(false)
    } catch (error) {
      console.error('Error cargando misión:', error)
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const requirement = {
        action: formData.action,
        count: formData.count,
      }

      const payload: any = {
        title: formData.title,
        description: formData.description,
        type: formData.type,
        reward_coins: formData.reward_coins,
        requirement,
        is_active: formData.is_active,
      }

      if (formData.expires_at) {
        payload.expires_at = formData.expires_at
      } else {
        payload.expires_at = null
      }

      const response = await fetch(`/api/admin/missions/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (data.success) {
        router.push('/admin/missions')
      } else {
        alert('Error al actualizar misión: ' + (data.error || 'Error desconocido'))
        setSaving(false)
      }
    } catch (error) {
      console.error('Error actualizando misión:', error)
      alert('Error al actualizar misión')
      setSaving(false)
    }
  }

  const commonActions = [
    'play_game',
    'win_game',
    'buy_property',
    'complete_lap',
    'send_message',
    'get_monopoly',
    'collect_treasure',
    'collect_rare_treasure',
    'collect_epic_treasure',
    'collect_legendary_treasure',
    'collect_morning_treasure',
  ]

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-400 border-t-transparent mx-auto mb-4"></div>
            <p className="text-white/80">Cargando misión...</p>
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
            <h1 className="text-3xl font-bold text-white mb-2">Editar Misión</h1>
            <p className="text-white/70">Modifica la información de la misión</p>
          </div>
          <Link
            href="/admin/missions"
            className="text-white/80 hover:text-white transition"
          >
            ← Volver a Misiones
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 border border-white/20 space-y-4">
            <h2 className="text-xl font-semibold text-white mb-4">Información Básica</h2>
            
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Título *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Descripción *
              </label>
              <textarea
                required
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Tipo *
                </label>
                <select
                  required
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="daily">Diaria</option>
                  <option value="weekly">Semanal</option>
                  <option value="achievement">Logro</option>
                  <option value="special">Especial</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Recompensa (Coins) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={formData.reward_coins}
                  onChange={(e) => setFormData({ ...formData, reward_coins: parseInt(e.target.value) || 0 })}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 border border-white/20 space-y-4">
            <h2 className="text-xl font-semibold text-white mb-4">Requisitos</h2>
            
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Acción *
              </label>
              <select
                required
                value={formData.action}
                onChange={(e) => setFormData({ ...formData, action: e.target.value })}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Seleccionar acción...</option>
                {commonActions.map((action) => (
                  <option key={action} value={action}>
                    {action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Acción Personalizada
              </label>
              <input
                type="text"
                value={formData.action}
                onChange={(e) => setFormData({ ...formData, action: e.target.value })}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Ej: play_game, win_game, collect_treasure..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Cantidad Requerida *
              </label>
              <input
                type="number"
                required
                min="1"
                value={formData.count}
                onChange={(e) => setFormData({ ...formData, count: parseInt(e.target.value) || 1 })}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 border border-white/20 space-y-4">
            <h2 className="text-xl font-semibold text-white mb-4">Configuración Adicional</h2>
            
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Fecha de Expiración (opcional)
              </label>
              <input
                type="datetime-local"
                value={formData.expires_at}
                onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 text-purple-600 bg-white/10 border-white/20 rounded focus:ring-purple-500"
              />
              <label htmlFor="is_active" className="ml-2 text-sm text-white/80">
                Misión activa (disponible para los jugadores)
              </label>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={saving}
              className="bg-gradient-to-r from-purple-500 to-pink-600 text-white px-6 py-3 rounded-lg hover:from-purple-600 hover:to-pink-700 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Guardando...' : '💾 Guardar Cambios'}
            </button>
            <Link
              href="/admin/missions"
              className="bg-white/10 text-white px-6 py-3 rounded-lg hover:bg-white/20 transition font-semibold"
            >
              Cancelar
            </Link>
          </div>
        </form>
      </div>
    </AdminLayout>
  )
}
