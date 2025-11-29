'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/contexts/ToastContext'
import Link from 'next/link'
import AvatarDisplay from '@/components/avatar/AvatarDisplay'

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
          claimed: referralsData.filter((r: any) => r.reward_claimed).length,
          pending: referralsData.filter((r: any) => !r.reward_claimed).length,
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
            href="/dashboard"
            className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 mb-4 transition text-sm sm:text-base"
          >
            <span>←</span>
            <span>Volver al Dashboard</span>
          </Link>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Sistema de Referidos</h1>
          <p className="text-white/80">Invita amigos y gana TuristaCoins</p>
        </div>
        
        {/* Código de Referencia */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl shadow-lg p-4 sm:p-6 mb-6 border border-white/20">
          <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-white">Tu Código de Referencia</h2>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <div className="flex-1 bg-gradient-to-r from-cyan-500/20 to-pink-500/20 rounded-lg p-4 border-2 border-cyan-400/30">
              <p className="text-xs sm:text-sm text-white/70 mb-1">Código:</p>
              <p className="text-xl sm:text-2xl font-bold text-cyan-300 break-all">{referralCode || 'Cargando...'}</p>
            </div>
            <button
              onClick={copyToClipboard}
              className="bg-gradient-to-r from-cyan-500 to-pink-600 text-white px-6 py-3 rounded-lg hover:from-cyan-600 hover:to-pink-700 transition font-semibold shadow-lg flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copiar Enlace
            </button>
          </div>
          
          <div className="mt-4 bg-gradient-to-r from-green-500/20 to-cyan-500/20 rounded-lg p-4 border border-green-400/30">
            <p className="text-sm sm:text-base text-green-200 font-semibold mb-2">
              💰 Gana 200 TuristaCoins por cada amigo que se registre usando tu enlace
            </p>
            <p className="text-xs sm:text-sm text-green-100">
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
          <div className="bg-white/10 backdrop-blur-md rounded-xl shadow-lg p-4 sm:p-6 border border-white/20">
            <p className="text-white/70 mb-2 text-sm sm:text-base">Total Referidos</p>
            <p className="text-3xl sm:text-4xl font-bold text-cyan-400">{stats.total}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-xl shadow-lg p-4 sm:p-6 border border-white/20">
            <p className="text-white/70 mb-2 text-sm sm:text-base">Recompensas Pendientes</p>
            <p className="text-3xl sm:text-4xl font-bold text-yellow-400">{stats.pending}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-xl shadow-lg p-4 sm:p-6 border border-white/20">
            <p className="text-white/70 mb-2 text-sm sm:text-base">Recompensas Reclamadas</p>
            <p className="text-3xl sm:text-4xl font-bold text-green-400">{stats.claimed}</p>
          </div>
        </div>

        {/* Lista de Referidos */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl shadow-lg p-4 sm:p-6 border border-white/20">
          <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-white">Tus Referidos</h2>
          {referrals.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-3 border border-white/20">
                <span className="text-3xl">👥</span>
              </div>
              <p className="text-white/80 mb-2">Aún no tienes referidos</p>
              <p className="text-sm text-white/60">Comparte tu enlace para comenzar a ganar recompensas</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {referrals.map((referral) => (
                <div
                  key={referral.id}
                  className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition border border-white/10"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="relative flex-shrink-0">
                      <AvatarDisplay
                        avatarUrl={referral.referred_user?.avatar_url || null}
                        username={referral.referred_user?.username || 'Usuario'}
                        size="sm"
                        className="border-2 border-white/30"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate">
                        {referral.referred_user?.username || 'Usuario'}
                      </p>
                      <p className="text-xs text-white/60">
                        {new Date(referral.created_at).toLocaleDateString('es-ES', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-green-400">
                      +{referral.reward_coins} TC
                    </span>
                    {referral.reward_claimed ? (
                      <span className="bg-green-500/20 text-green-300 px-2 py-1 rounded text-xs font-semibold border border-green-400/30">
                        ✓ Reclamado
                      </span>
                    ) : (
                      <span className="bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded text-xs font-semibold border border-yellow-400/30">
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
        <div className="mt-6 bg-cyan-500/20 rounded-xl p-4 sm:p-6 border border-cyan-400/30">
          <h3 className="font-semibold text-cyan-200 mb-2">💡 ¿Cómo funciona?</h3>
          <ul className="space-y-2 text-sm text-cyan-100">
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

