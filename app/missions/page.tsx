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
        return 'bg-blue-100 text-blue-700 border-blue-300'
      case 'weekly':
        return 'bg-purple-100 text-purple-700 border-purple-300'
      case 'achievement':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300'
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/wallet"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4 transition text-sm sm:text-base"
          >
            <span>←</span>
            <span>Volver a Wallet</span>
          </Link>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">Misiones</h1>
          <p className="text-gray-600">Completa misiones y gana TuristaCoins</p>
        </div>

        {/* Misiones por tipo */}
        {Object.entries(groupedMissions).map(([type, typeMissions]) => (
          <div key={type} className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-xl sm:text-2xl font-semibold text-gray-900">
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
                    className="p-4 bg-gray-50 rounded-lg border-2 border-gray-200 hover:border-blue-300 transition"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">{mission?.title}</h3>
                        <p className="text-sm text-gray-600">{mission?.description}</p>
                      </div>
                      <div className="text-right ml-4">
                        <p className="text-lg font-bold text-green-600">+{mission?.reward_coins} TC</p>
                      </div>
                    </div>

                    {/* Barra de progreso */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                        <span>Progreso</span>
                        <span>{progress} / {target}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>

                    {/* Botón de acción */}
                    {isCompleted && !isClaimed ? (
                      <button
                        onClick={() => claimReward(userMission.id, mission?.id || '', mission?.reward_coins || 0)}
                        className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-2 px-4 rounded-lg hover:from-green-700 hover:to-emerald-700 transition font-semibold"
                      >
                        🎁 Reclamar Recompensa
                      </button>
                    ) : isClaimed ? (
                      <div className="w-full bg-green-100 text-green-700 py-2 px-4 rounded-lg text-center font-semibold">
                        ✓ Recompensa Reclamada
                      </div>
                    ) : (
                      <div className="w-full bg-gray-200 text-gray-600 py-2 px-4 rounded-lg text-center font-semibold">
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
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-3xl">🎯</span>
            </div>
            <p className="text-gray-600 mb-2">No hay misiones disponibles</p>
            <p className="text-sm text-gray-500">Las misiones se actualizarán pronto</p>
          </div>
        )}
      </div>
    </div>
  )
}

