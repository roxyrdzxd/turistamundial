'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'
import AdminLayout from '@/components/admin/AdminLayout'
import Link from 'next/link'

export default function EditTemplatePage() {
  const router = useRouter()
  const params = useParams()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
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
  const [currentBadgeUrl, setCurrentBadgeUrl] = useState<string | null>(null)
  const [uploadingBadge, setUploadingBadge] = useState(false)

  useEffect(() => {
    checkAdminAndLoad()
  }, [params?.id])

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

    await loadTemplate()
  }

  const loadTemplate = async () => {
    try {
      const templateId = params?.id as string
      if (!templateId) return
      
      const response = await fetch(`/api/admin/treasures/templates/${templateId}`)
      const data = await response.json()

      if (data.success && data.template) {
        const template = data.template
        setFormData({
          name: template.name,
          description: template.description || '',
          coins_reward: template.coins_reward,
          rarity: template.rarity,
          spawn_probability: template.spawn_probability,
          min_distance_meters: template.min_distance_meters,
          max_distance_meters: template.max_distance_meters,
          min_walk_distance_meters: template.min_walk_distance_meters,
          is_active: template.is_active
        })
        if (template.badge_url) {
          setCurrentBadgeUrl(template.badge_url)
          setBadgePreview(template.badge_url)
        }
      }
    } catch (error) {
      console.error('Error cargando template:', error)
    } finally {
      setLoading(false)
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
    setSaving(true)

    try {
      let badgeUrl = badgePreview

      // Si hay un archivo nuevo, subirlo primero
      if (badgeFile && badgePreview && badgePreview.startsWith('data:')) {
        badgeUrl = await handleBadgeUpload(badgeFile)
        if (!badgeUrl) {
          setSaving(false)
          return
        }
      }

      const templateId = params?.id as string
      if (!templateId) return
      
      const response = await fetch(`/api/admin/treasures/templates/${templateId}`, {
        method: 'PUT',
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
        alert('Error al actualizar template: ' + data.error)
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error al actualizar template')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-cyan-400 border-t-transparent mx-auto mb-4"></div>
            <p className="text-white/80">Cargando template...</p>
          </div>
        </div>
      </AdminLayout>
    )
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
          <h1 className="text-3xl font-bold text-white mb-2">Editar Template Dinámico</h1>
        </div>

        <form onSubmit={handleSubmit} className="bg-white/10 backdrop-blur-md rounded-lg p-6 border border-white/20 space-y-6">
          {/* Mismos campos que new/page.tsx */}
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
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Descripción
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

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
          </div>

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
            </div>
          </div>

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
                    setBadgePreview(currentBadgeUrl)
                    setBadgeFile(null)
                  }}
                  className="ml-4 text-red-400 hover:text-red-300"
                >
                  Restaurar original
                </button>
              </div>
            ) : null}
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
          </div>

          <div>
            <label className="flex items-center gap-2 text-white/80">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 rounded"
              />
              <span>Template activo</span>
            </label>
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={saving || uploadingBadge}
              className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-6 py-3 rounded-lg hover:from-cyan-600 hover:to-blue-700 transition font-semibold disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar Cambios'}
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
