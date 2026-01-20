'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import AdminLayout from '@/components/admin/AdminLayout'
import TreasureMapEditor from '@/components/admin/TreasureMapEditor'
import Link from 'next/link'

export default function NewTreasurePage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    coins_reward: 10,
    latitude: 25.6866,
    longitude: -100.3161,
    radius_meters: 50,
    rarity: 'common' as 'common' | 'rare' | 'epic' | 'legendary',
    max_collections: null as number | null,
    despawn_time: '',
    is_active: true,
  })

  useEffect(() => {
    const checkAdmin = async () => {
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

      setLoading(false)
    }

    checkAdmin()
  }, [router, supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const payload: any = {
        name: formData.name,
        description: formData.description || null,
        coins_reward: formData.coins_reward,
        latitude: formData.latitude,
        longitude: formData.longitude,
        radius_meters: formData.radius_meters,
        rarity: formData.rarity,
        max_collections: formData.max_collections || null,
        is_active: formData.is_active,
      }

      if (formData.despawn_time) {
        payload.despawn_time = formData.despawn_time
      }

      const response = await fetch('/api/admin/treasures', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (data.success) {
        router.push('/admin/treasures')
      } else {
        alert('Error al crear tesoro: ' + (data.error || 'Error desconocido'))
        setSaving(false)
      }
    } catch (error) {
      console.error('Error creando tesoro:', error)
      alert('Error al crear tesoro')
      setSaving(false)
    }
  }

  const handleLocationSelect = (lat: number, lng: number) => {
    setFormData({ ...formData, latitude: lat, longitude: lng })
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-cyan-400 border-t-transparent mx-auto mb-4"></div>
            <p className="text-white/80">Cargando...</p>
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
            <h1 className="text-3xl font-bold text-white mb-2">Crear Nuevo Tesoro</h1>
            <p className="text-white/70">Agrega un nuevo tesoro al mapa</p>
          </div>
          <Link
            href="/admin/treasures"
            className="text-white/80 hover:text-white transition"
          >
            ← Volver a Tesoros
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 border border-white/20 space-y-4">
            <h2 className="text-xl font-semibold text-white mb-4">Información Básica</h2>
            
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Nombre *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="Ej: Tesoro del Obispado"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Descripción
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                rows={3}
                placeholder="Descripción del tesoro..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Recompensa (Coins) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.coins_reward}
                  onChange={(e) => setFormData({ ...formData, coins_reward: parseInt(e.target.value) || 0 })}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Radio de Recolección (metros) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.radius_meters}
                  onChange={(e) => setFormData({ ...formData, radius_meters: parseInt(e.target.value) || 0 })}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Rareza *
                </label>
                <select
                  required
                  value={formData.rarity}
                  onChange={(e) => setFormData({ ...formData, rarity: e.target.value as any })}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="common">Común</option>
                  <option value="rare">Raro</option>
                  <option value="epic">Épico</option>
                  <option value="legendary">Legendario</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Máximo de Colecciones
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.max_collections || ''}
                  onChange={(e) => setFormData({ ...formData, max_collections: e.target.value ? parseInt(e.target.value) : null })}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  placeholder="Dejar vacío para ilimitado"
                />
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 border border-white/20 space-y-4">
            <h2 className="text-xl font-semibold text-white mb-4">Ubicación en el Mapa</h2>
            <p className="text-sm text-white/60 mb-4">
              Haz clic en el mapa para seleccionar la ubicación del tesoro
            </p>
            
            <TreasureMapEditor
              initialLat={formData.latitude}
              initialLng={formData.longitude}
              onLocationSelect={handleLocationSelect}
              height="400px"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Latitud
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={formData.latitude}
                  onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">
                  Longitud
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={formData.longitude}
                  onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 border border-white/20 space-y-4">
            <h2 className="text-xl font-semibold text-white mb-4">Configuración Adicional</h2>
            
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Fecha de Desaparición (opcional)
              </label>
              <input
                type="datetime-local"
                value={formData.despawn_time}
                onChange={(e) => setFormData({ ...formData, despawn_time: e.target.value })}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
              <p className="text-xs text-white/60 mt-1">
                Si no se especifica, el tesoro no desaparecerá automáticamente
              </p>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 text-cyan-600 bg-white/10 border-white/20 rounded focus:ring-cyan-500"
              />
              <label htmlFor="is_active" className="ml-2 text-sm text-white/80">
                Tesoro activo (visible para los jugadores)
              </label>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={saving}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-6 py-3 rounded-lg hover:from-cyan-600 hover:to-blue-700 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Guardando...' : '💾 Crear Tesoro'}
            </button>
            <Link
              href="/admin/treasures"
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
