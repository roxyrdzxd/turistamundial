'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import AdminLayout from '@/components/admin/AdminLayout'
import Link from 'next/link'
import dynamic from 'next/dynamic'

const TreasureMapEditor = dynamic(() => import('@/components/admin/TreasureMapEditor'), {
  ssr: false
})

export default function NewTemplatePage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    coins_reward: 10,
    rarity: 'common' as 'common' | 'rare' | 'epic' | 'legendary',
    spawn_probability: 0.1,
    min_distance_meters: 300,
    max_distance_meters: 1000,
    min_walk_distance_meters: 300,
    is_active: true
  })
  const [badgeFile, setBadgeFile] = useState<File | null>(null)
  const [badgePreview, setBadgePreview] = useState<string | null>(null)
  const [uploadingBadge, setUploadingBadge] = useState(false)

  useEffect(() => {
    checkAdmin()
  }, [])

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
    }
  }

  const handleBadgeUpload = async (file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      alert('La imagen debe ser menor a 2MB')
      return
    }

    setUploadingBadge(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/admin/treasures/badge', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()
      if (data.success) {
        setBadgePreview(data.url)
        return data.url
      } else {
        alert('Error al subir imagen: ' + data.error)
        return null
      }
    } catch (error) {
      console.error('Error subiendo badge:', error)
      alert('Error al subir imagen')
      return null
    } finally {
      setUploadingBadge(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      let badgeUrl = badgePreview

      // Si hay un archivo nuevo, subirlo primero
      if (badgeFile && !badgeUrl) {
        badgeUrl = await handleBadgeUpload(badgeFile)
        if (!badgeUrl) {
          setLoading(false)
          return
        }
      }

      const response = await fetch('/api/admin/treasures/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          badge_url: badgeUrl
        })
      })

      const data = await response.json()
      if (data.success) {
        router.push('/admin/treasures/templates')
      } else {
        alert('Error al crear template: ' + data.error)
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error al crear template')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <Link
            href="/admin/treasures/templates"
            className="text-cyan-400 hover:text-cyan-300 mb-4 inline-block"
          >
            ← Volver a Templates
          </Link>
          <h1 className="text-3xl font-bold text-white mb-2">Crear Template Dinámico</h1>
          <p className="text-white/70">
            Los templates definen tesoros que aparecen aleatoriamente cerca de los usuarios
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white/10 backdrop-blur-md rounded-lg p-6 border border-white/20 space-y-6">
          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Nombre del Tesoro *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              placeholder="Ej: Insignia del Explorador"
            />
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Descripción
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              placeholder="Descripción del tesoro..."
            />
          </div>

          {/* Recompensa y Rareza */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Recompensa (TuristaCoins) *
              </label>
              <input
                type="number"
                value={formData.coins_reward}
                onChange={(e) => setFormData({ ...formData, coins_reward: parseInt(e.target.value) || 10 })}
                min="1"
                required
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Rareza *
              </label>
              <select
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
          </div>

          {/* Probabilidad de Spawn */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Probabilidad de Spawn: {(formData.spawn_probability * 100).toFixed(1)}%
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={formData.spawn_probability}
              onChange={(e) => setFormData({ ...formData, spawn_probability: parseFloat(e.target.value) })}
              className="w-full"
            />
            <p className="text-xs text-white/60 mt-1">
              Probabilidad de que este template aparezca cuando un usuario abre el mapa (0% = nunca, 100% = siempre)
            </p>
          </div>

          {/* Distancias */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Distancia Mínima (m) *
              </label>
              <input
                type="number"
                value={formData.min_distance_meters}
                onChange={(e) => setFormData({ ...formData, min_distance_meters: parseInt(e.target.value) || 300 })}
                min="100"
                required
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
              <p className="text-xs text-white/60 mt-1">Distancia mínima desde el usuario</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Distancia Máxima (m) *
              </label>
              <input
                type="number"
                value={formData.max_distance_meters}
                onChange={(e) => setFormData({ ...formData, max_distance_meters: parseInt(e.target.value) || 1000 })}
                min={formData.min_distance_meters}
                required
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
              <p className="text-xs text-white/60 mt-1">Distancia máxima desde el usuario</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Caminar Mínimo (m) *
              </label>
              <input
                type="number"
                value={formData.min_walk_distance_meters}
                onChange={(e) => setFormData({ ...formData, min_walk_distance_meters: parseInt(e.target.value) || 300 })}
                min="100"
                required
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
              <p className="text-xs text-white/60 mt-1">Distancia estimada a caminar</p>
            </div>
          </div>

          {/* Insignia */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Insignia (Opcional)
            </label>
            {badgePreview ? (
              <div className="mb-4">
                <div className="w-24 h-24 rounded-full border-4 border-yellow-400 bg-white/10 p-2 inline-block">
                  <img
                    src={badgePreview}
                    alt="Badge preview"
                    className="w-full h-full rounded-full object-cover"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setBadgePreview(null)
                    setBadgeFile(null)
                  }}
                  className="ml-4 text-red-400 hover:text-red-300"
                >
                  Eliminar
                </button>
              </div>
            ) : (
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    if (file.size > 2 * 1024 * 1024) {
                      alert('La imagen debe ser menor a 2MB')
                      return
                    }
                    setBadgeFile(file)
                    const reader = new FileReader()
                    reader.onloadend = () => {
                      setBadgePreview(reader.result as string)
                    }
                    reader.readAsDataURL(file)
                  }
                }}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            )}
            <p className="text-xs text-white/60 mt-1">
              Si se sube una insignia, se otorgará al usuario cuando recolecte el tesoro
            </p>
          </div>

          {/* Estado */}
          <div>
            <label className="flex items-center gap-2 text-white/80">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 rounded"
              />
              <span>Template activo (aparecerá en el juego)</span>
            </label>
          </div>

          {/* Botones */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading || uploadingBadge}
              className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-6 py-3 rounded-lg hover:from-cyan-600 hover:to-blue-700 transition font-semibold disabled:opacity-50"
            >
              {loading ? 'Creando...' : 'Crear Template'}
            </button>
            <Link
              href="/admin/treasures/templates"
              className="px-6 py-3 bg-white/10 text-white rounded-lg hover:bg-white/20 transition"
            >
              Cancelar
            </Link>
          </div>
        </form>
      </div>
    </AdminLayout>
  )
}
