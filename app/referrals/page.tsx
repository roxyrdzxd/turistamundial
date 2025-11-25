'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/contexts/ToastContext'
import Link from 'next/link'

interface ReferralStats {
  total: number
  pending: number
  claimed: number
}

interface Referral {
  id: string
  referred_id: string
  reward_coins: number
  reward_claimed: boolean
  created_at: string
  referred_user: {
    username: string
    avatar_url: string | null
  }
}

export default function ReferralsPage() {
  const [referralCode, setReferralCode] = useState<string | null>(null)
  const [referralLink, setReferralLink] = useState<string>('')
  const [stats, setStats] = useState<ReferralStats>({ total: 0, pending: 0, claimed: 0 })
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [loading, setLoading] = useState(true)
  const toast = useToast()
  const supabase = createClient()

  useEffect(() => {
    fetchReferralData()
  }, [])

  const fetchReferralData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      // Obtener código de referencia
      const { data: profile } = await supabase
        .from('profiles')
        .select('referral_code')
        .eq('id', user.id)
        .single()

      if (profile?.referral_code) {
        setReferralCode(profile.referral_code)
        setReferralLink(`${window.location.origin}/register?ref=${profile.referral_code}`)
      }

      // Obtener estadísticas y lista de referidos
      const { data: referralsData, error: referralsError } = await supabase
        .from('referrals')
        .select(`
          id,
          referred_id,
          reward_coins,
          reward_claimed,
          created_at,
          referred_user:profiles!referrals_referred_id_fkey(
            username,
            avatar_url
          )
        `)
        .eq('referrer_id', user.id)
        .order('created_at', { ascending: false })

      if (referralsError) {
        console.error('Error obteniendo referidos:', referralsError)
      } else if (referralsData) {
        setReferrals(referralsData as any)
        setStats({
          total: referralsData.length,
          claimed: referralsData.filter(r => r.reward_claimed).length,
          pending: referralsData.filter(r => !r.reward_claimed).length,
        })
      }
    } catch (error) {
      console.error('Error obteniendo datos de referidos:', error)
      toast.showError('Error al cargar datos de referidos')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(referralLink)
      toast.showSuccess('¡Enlace copiado al portapapeles!')
    } catch (err) {
      // Fallback para navegadores que no soportan clipboard API
      const textArea = document.createElement('textarea')
      textArea.value = referralLink
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      document.body.appendChild(textArea)
      textArea.select()
      try {
        document.execCommand('copy')
        toast.showSuccess('¡Enlace copiado al portapapeles!')
      } catch (e) {
        toast.showError('Error al copiar enlace')
      }
      document.body.removeChild(textArea)
    }
  }

  const shareOnSocial = (platform: 'facebook' | 'twitter' | 'whatsapp') => {
    const text = encodeURIComponent('¡Únete a TuristaMundial y gana conmigo! 🎮🌍')
    const url = encodeURIComponent(referralLink)
    
    let shareUrl = ''
    switch (platform) {
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`
        break
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${text}&url=${url}`
        break
      case 'whatsapp':
        shareUrl = `https://wa.me/?text=${text}%20${url}`
        break
    }
    
    window.open(shareUrl, '_blank', 'width=600,height=400')
  }

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
            href="/dashboard"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4 transition text-sm sm:text-base"
          >
            <span>←</span>
            <span>Volver al Dashboard</span>
          </Link>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">Sistema de Referidos</h1>
          <p className="text-gray-600">Invita amigos y gana TuristaCoins</p>
        </div>
        
        {/* Código de Referencia */}
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-6">
          <h2 className="text-xl sm:text-2xl font-semibold mb-4">Tu Código de Referencia</h2>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <div className="flex-1 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border-2 border-blue-200">
              <p className="text-xs sm:text-sm text-gray-600 mb-1">Código:</p>
              <p className="text-xl sm:text-2xl font-bold text-blue-600 break-all">{referralCode || 'Cargando...'}</p>
            </div>
            <button
              onClick={copyToClipboard}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 transition font-semibold shadow-lg flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copiar Enlace
            </button>
          </div>
          
          <div className="mt-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4 border border-green-200">
            <p className="text-sm sm:text-base text-green-800 font-semibold mb-2">
              💰 Gana 200 TuristaCoins por cada amigo que se registre usando tu enlace
            </p>
            <p className="text-xs sm:text-sm text-green-700">
              Comparte tu enlace único y comienza a ganar recompensas
            </p>
          </div>

          {/* Botones de compartir en redes sociales */}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => shareOnSocial('facebook')}
              className="flex-1 sm:flex-initial bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm font-semibold flex items-center justify-center gap-2"
            >
              <span>📘</span> Facebook
            </button>
            <button
              onClick={() => shareOnSocial('twitter')}
              className="flex-1 sm:flex-initial bg-sky-500 text-white px-4 py-2 rounded-lg hover:bg-sky-600 transition text-sm font-semibold flex items-center justify-center gap-2"
            >
              <span>🐦</span> Twitter
            </button>
            <button
              onClick={() => shareOnSocial('whatsapp')}
              className="flex-1 sm:flex-initial bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition text-sm font-semibold flex items-center justify-center gap-2"
            >
              <span>💬</span> WhatsApp
            </button>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
            <p className="text-gray-600 mb-2 text-sm sm:text-base">Total Referidos</p>
            <p className="text-3xl sm:text-4xl font-bold text-blue-600">{stats.total}</p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
            <p className="text-gray-600 mb-2 text-sm sm:text-base">Recompensas Pendientes</p>
            <p className="text-3xl sm:text-4xl font-bold text-yellow-600">{stats.pending}</p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
            <p className="text-gray-600 mb-2 text-sm sm:text-base">Recompensas Reclamadas</p>
            <p className="text-3xl sm:text-4xl font-bold text-green-600">{stats.claimed}</p>
          </div>
        </div>

        {/* Lista de Referidos */}
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
          <h2 className="text-xl sm:text-2xl font-semibold mb-4">Tus Referidos</h2>
          {referrals.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-3xl">👥</span>
              </div>
              <p className="text-gray-600 mb-2">Aún no tienes referidos</p>
              <p className="text-sm text-gray-500">Comparte tu enlace para comenzar a ganar recompensas</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {referrals.map((referral) => (
                <div
                  key={referral.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="relative flex-shrink-0">
                      {referral.referred_user?.avatar_url ? (
                        <img
                          src={referral.referred_user.avatar_url}
                          alt={referral.referred_user.username}
                          className="w-10 h-10 rounded-full border-2 border-gray-300 object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                          {referral.referred_user?.username?.charAt(0).toUpperCase() || '?'}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {referral.referred_user?.username || 'Usuario'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(referral.created_at).toLocaleDateString('es-ES', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-green-600">
                      +{referral.reward_coins} TC
                    </span>
                    {referral.reward_claimed ? (
                      <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-semibold">
                        ✓ Reclamado
                      </span>
                    ) : (
                      <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs font-semibold">
                        Pendiente
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Información adicional */}
        <div className="mt-6 bg-blue-50 rounded-xl p-4 sm:p-6 border border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-2">💡 ¿Cómo funciona?</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li>1. Comparte tu enlace único con amigos y familiares</li>
            <li>2. Cuando alguien se registre usando tu enlace, recibirás 200 TuristaCoins</li>
            <li>3. Las recompensas se otorgarán automáticamente cuando se implemente el sistema de wallet</li>
            <li>4. ¡Mientras más personas invites, más recompensas ganarás!</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

