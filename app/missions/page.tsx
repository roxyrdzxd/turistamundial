'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/contexts/ToastContext'
import Link from 'next/link'

interface Mission {
  id: string
  title: string
  description: string
  type: 'daily' | 'weekly' | 'achievement' | 'special'
  reward_coins: number
  requirement: any
}

interface UserMission {
  id: string
  mission_id: string
  progress: number
  target: number
  completed_at: string | null
  claimed_at: string | null
  mission: Mission
}

export default function MissionsPage() {
  const [missions, setMissions] = useState<UserMission[]>([])
  const [loading, setLoading] = useState(true)
  const toast = useToast()
  const supabase = createClient()

  useEffect(() => {
    fetchMissions()
  }, [])

  const fetchMissions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      // Inicializar misiones para el usuario (crear progreso si no existe)
      try {
        await fetch('/api/missions/initialize', {
          method: 'POST',
        })
      } catch (initError) {
        console.error('Error inicializando misiones:', initError)
      }

      // Obtener misiones activas con progreso del usuario
      const { data: missionsData, error: missionsError } = await supabase
        .from('user_missions')
        .select(`
          *,
          mission:missions(*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (missionsError) {
        console.error('Error obteniendo misiones:', missionsError)
      } else {
        // También obtener misiones activas que el usuario aún no ha iniciado
        const { data: allMissions, error: allMissionsError } = await supabase
          .from('missions')
          .select('*')
          .eq('is_active', true)
          .order('type', { ascending: true })
          .order('reward_coins', { ascending: false })

        if (!allMissionsError && allMissions) {
          const userMissionIds = new Set((missionsData || []).map((m: any) => m.mission_id))
          const newMissions = allMissions
            .filter((m: any) => !userMissionIds.has(m.id))
            .map((mission: any) => ({
              id: '',
              mission_id: mission.id,
              progress: 0,
              target: mission.requirement?.count || 1,
              completed_at: null,
              claimed_at: null,
              mission
            }))

          setMissions([...(missionsData || []), ...newMissions] as any)
        } else {
          setMissions((missionsData || []) as any)
        }
      }
    } catch (error) {
      console.error('Error obteniendo misiones:', error)
      toast.showError('Error al cargar misiones')
    } finally {
      setLoading(false)
    }
  }

  const claimReward = async (userMissionId: string, missionId: string, rewardCoins: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Llamar a la función para otorgar coins
      const { data, error } = await supabase.rpc('grant_coins', {
        p_user_id: user.id,
        p_amount: rewardCoins,
        p_type: 'mission',
        p_description: `Recompensa por completar misión`,
        p_reference_id: userMissionId
      })

      if (error) {
        toast.showError('Error al reclamar recompensa')
        return
      }

      if (data && data.success) {
        // Marcar como reclamada
        await supabase
          .from('user_missions')
          .update({ claimed_at: new Date().toISOString() })
          .eq('id', userMissionId)

        toast.showSuccess(`¡Recompensa reclamada! +${rewardCoins} TC`)
        fetchMissions()
      }
    } catch (error) {
      console.error('Error reclamando recompensa:', error)
      toast.showError('Error al reclamar recompensa')
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'daily':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-400/30'
      case 'weekly':
        return 'bg-pink-500/20 text-pink-300 border-pink-400/30'
      case 'achievement':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-400/30'
      default:
        return 'bg-white/10 text-white/70 border-white/20'
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'daily':
        return 'Diaria'
      case 'weekly':
        return 'Semanal'
      case 'achievement':
        return 'Logro'
      default:
        return 'Especial'
    }
  }

  const groupedMissions = missions.reduce((acc, mission) => {
    const type = mission.mission?.type || 'other'
    if (!acc[type]) {
      acc[type] = []
    }
    acc[type].push(mission)
    return acc
  }, {} as Record<string, UserMission[]>)

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4"></div>
          <p className="text-white/80">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 pb-20 md:pb-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/wallet"
            className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 mb-4 transition text-sm sm:text-base"
          >
            <span>←</span>
            <span>Volver a Wallet</span>
          </Link>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Misiones</h1>
          <p className="text-white/80">Completa misiones y gana TuristaCoins</p>
        </div>

        {/* Misiones por tipo */}
        {Object.entries(groupedMissions).map(([type, typeMissions]) => (
          <div key={type} className="bg-white/10 backdrop-blur-md rounded-xl shadow-lg p-4 sm:p-6 mb-6 border border-white/20">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-xl sm:text-2xl font-semibold text-white">
                Misiones {getTypeLabel(type)}
              </h2>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getTypeColor(type)}`}>
                {typeMissions.length}
              </span>
            </div>

            <div className="space-y-3">
              {typeMissions.map((userMission) => {
                const mission = userMission.mission
                const progress = userMission.progress || 0
                const target = userMission.target || 1
                const percentage = Math.min((progress / target) * 100, 100)
                const isCompleted = progress >= target
                const isClaimed = userMission.claimed_at !== null

                return (
                  <div
                    key={userMission.mission_id || userMission.id}
                    className="p-4 bg-white/5 rounded-lg border-2 border-white/20 hover:border-cyan-400 transition"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-white mb-1">{mission?.title}</h3>
                        <p className="text-sm text-white/80">{mission?.description}</p>
                      </div>
                      <div className="text-right ml-4">
                        <p className="text-lg font-bold text-green-400">+{mission?.reward_coins} TC</p>
                      </div>
                    </div>

                    {/* Barra de progreso */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-xs text-white/70 mb-1">
                        <span>Progreso</span>
                        <span>{progress} / {target}</span>
                      </div>
                      <div className="w-full bg-white/10 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-cyan-500 to-pink-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>

                    {/* Botón de acción */}
                    {isCompleted && !isClaimed ? (
                      <button
                        onClick={() => claimReward(userMission.id, mission?.id || '', mission?.reward_coins || 0)}
                        className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-2 px-4 rounded-lg hover:from-green-600 hover:to-emerald-700 transition font-semibold"
                      >
                        🎁 Reclamar Recompensa
                      </button>
                    ) : isClaimed ? (
                      <div className="w-full bg-green-500/20 text-green-300 py-2 px-4 rounded-lg text-center font-semibold border border-green-400/30">
                        ✓ Recompensa Reclamada
                      </div>
                    ) : (
                      <div className="w-full bg-white/10 text-white/60 py-2 px-4 rounded-lg text-center font-semibold border border-white/10">
                        En progreso...
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        {missions.length === 0 && (
          <div className="bg-white/10 backdrop-blur-md rounded-xl shadow-lg p-8 text-center border border-white/20">
            <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-3 border border-white/20">
              <span className="text-3xl">🎯</span>
            </div>
            <p className="text-white/80 mb-2">No hay misiones disponibles</p>
            <p className="text-sm text-white/60">Las misiones se actualizarán pronto</p>
          </div>
        )}
      </div>
    </div>
  )
}

