'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import AdminLayout from '@/components/admin/AdminLayout'
import Link from 'next/link'

export default function AdminDashboard() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalTreasures: 0,
    activeTreasures: 0,
    totalMissions: 0,
    activeMissions: 0,
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

      // Cargar estadísticas
      await loadStats()
      setLoading(false)
    }

    checkAdmin()
  }, [router, supabase])

  const loadStats = async () => {
    try {
      // Obtener estadísticas de tesoros
      const { data: treasuresData } = await supabase.rpc('get_treasures_admin', {
        p_is_active: null,
        p_rarity: null
      })

      // Obtener estadísticas de misiones
      const { data: missionsData } = await supabase
        .from('missions')
        .select('is_active')

      const totalTreasures = treasuresData?.length || 0
      const activeTreasures = treasuresData?.filter((t: any) => t.is_active).length || 0
      const totalMissions = missionsData?.length || 0
      const activeMissions = missionsData?.filter((m: any) => m.is_active).length || 0

      setStats({
        totalTreasures,
        activeTreasures,
        totalMissions,
        activeMissions,
      })
    } catch (error) {
      console.error('Error cargando estadísticas:', error)
    }
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
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Dashboard de Administración</h1>
          <p className="text-white/70">Gestiona tesoros y misiones del juego</p>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link
            href="/admin/treasures"
            className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 hover:bg-white/15 transition cursor-pointer"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">💎 Tesoros</h2>
              <span className="text-3xl">💎</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-white/80">
                <span>Total:</span>
                <span className="font-semibold text-white">{stats.totalTreasures}</span>
              </div>
              <div className="flex justify-between text-white/80">
                <span>Activos:</span>
                <span className="font-semibold text-green-400">{stats.activeTreasures}</span>
              </div>
            </div>
          </Link>

          <Link
            href="/admin/missions"
            className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 hover:bg-white/15 transition cursor-pointer"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">🎯 Misiones</h2>
              <span className="text-3xl">🎯</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-white/80">
                <span>Total:</span>
                <span className="font-semibold text-white">{stats.totalMissions}</span>
              </div>
              <div className="flex justify-between text-white/80">
                <span>Activas:</span>
                <span className="font-semibold text-green-400">{stats.activeMissions}</span>
              </div>
            </div>
          </Link>
        </div>

        {/* Acciones rápidas */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
          <h2 className="text-xl font-semibold text-white mb-4">Acciones Rápidas</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              href="/admin/treasures/new"
              className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-6 py-3 rounded-lg hover:from-cyan-600 hover:to-blue-700 transition font-semibold text-center"
            >
              ➕ Crear Nuevo Tesoro
            </Link>
            <Link
              href="/admin/missions/new"
              className="bg-gradient-to-r from-purple-500 to-pink-600 text-white px-6 py-3 rounded-lg hover:from-purple-600 hover:to-pink-700 transition font-semibold text-center"
            >
              ➕ Crear Nueva Misión
            </Link>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
