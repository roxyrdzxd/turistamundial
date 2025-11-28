import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import LogoutButton from '@/components/auth/LogoutButton'
import DashboardSocial from '@/components/dashboard/DashboardSocial'
import FloatingCreateButton from '@/components/dashboard/FloatingCreateButton'

export default async function DashboardPage() {
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900">
      {/* Header */}
      <header className="bg-white/10 backdrop-blur-md shadow-md border-b border-white/20 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex justify-between items-center">
            {/* Logo y título */}
            <Link href="/dashboard" className="flex items-center gap-2 sm:gap-3 group">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300 relative overflow-hidden">
                <Image
                  src="https://cgoisveithzvituzyoga.supabase.co/storage/v1/object/public/avatars/turix.png"
                  alt="Turix Logo"
                  width={48}
                  height={48}
                  className="w-full h-full object-contain"
                  priority
                />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl sm:text-2xl font-bold text-white">
                  Turix
                </h1>
                <p className="text-xs sm:text-sm text-white/70 uppercase tracking-wider">TURISTA MUNDIAL</p>
              </div>
            </Link>

            {/* Acciones del usuario */}
            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                href="/wallet"
                className="p-2 sm:px-3 sm:py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all duration-300 font-semibold text-sm sm:text-base shadow-sm hover:shadow-md group border border-white/20"
                title="Mi Wallet"
              >
                <span className="hidden sm:inline">💰 Wallet</span>
                <span className="sm:hidden">💰</span>
              </Link>
              <Link
                href="/recognition"
                className="p-2 sm:px-3 sm:py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all duration-300 font-semibold text-sm sm:text-base shadow-sm hover:shadow-md group border border-white/20"
                title="Salón de la Fama"
              >
                <span className="hidden sm:inline">🏆 Rankings</span>
                <span className="sm:hidden">🏆</span>
              </Link>
              <Link
                href="/referrals"
                className="p-2 sm:px-3 sm:py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all duration-300 font-semibold text-sm sm:text-base shadow-sm hover:shadow-md group border border-white/20"
                title="Sistema de Referidos"
              >
                <span className="hidden sm:inline">👥 Referidos</span>
                <span className="sm:hidden">👥</span>
              </Link>
              <Link
                href="/profile"
                className="p-2 sm:px-3 sm:py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all duration-300 font-semibold text-sm sm:text-base shadow-sm hover:shadow-md group border border-white/20"
                title="Mi Perfil"
              >
                <span className="flex items-center gap-1 sm:gap-2">
                  <span className="text-lg sm:text-xl">👤</span>
                  <span className="hidden md:inline">Mi Perfil</span>
                </span>
              </Link>
              <LogoutButton />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Card */}
        <div className="bg-gradient-to-r from-cyan-600 via-blue-600 to-pink-600 rounded-2xl shadow-xl p-8 mb-8 text-white">
          <h2 className="text-3xl font-bold mb-2">
            ¡Bienvenido, {profile?.username || 'Usuario'}! 👋
          </h2>
          <p className="text-white/90 text-lg">
            Conquista el mundo comprando países y construyendo tu imperio turístico
          </p>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
          <Link
            href="/lobby/create"
            className="group bg-white/10 backdrop-blur-md rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 p-6 border-2 border-white/20 hover:border-cyan-400"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-cyan-500/20 rounded-xl flex items-center justify-center group-hover:bg-cyan-500 transition-colors border border-cyan-400/30">
                <span className="text-3xl group-hover:scale-110 transition-transform">➕</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Crear Partida</h3>
                <p className="text-sm text-white/70">Nueva sesión</p>
              </div>
            </div>
            <p className="text-white/80">
              Crea una nueva partida y espera a que se unan jugadores o agrega NPCs para empezar rápido
            </p>
          </Link>

          <Link
            href="/lobby"
            className="group bg-white/10 backdrop-blur-md rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 p-6 border-2 border-white/20 hover:border-pink-400"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-pink-500/20 rounded-xl flex items-center justify-center group-hover:bg-pink-500 transition-colors border border-pink-400/30">
                <span className="text-3xl group-hover:scale-110 transition-transform">🔍</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Buscar Partidas</h3>
                <p className="text-sm text-white/70">Únete ahora</p>
              </div>
            </div>
            <p className="text-white/80">
              Encuentra partidas disponibles y únete a la acción
            </p>
          </Link>

          <div className="group bg-white/10 backdrop-blur-md rounded-xl shadow-lg p-6 border-2 border-white/20">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-purple-500/20 rounded-xl flex items-center justify-center border border-purple-400/30">
                <span className="text-3xl">🤖</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Modo Práctica</h3>
                <p className="text-sm text-white/70">Con NPCs</p>
              </div>
            </div>
            <p className="text-white/80 mb-4">
              Crea una partida y agrega NPCs automáticamente para practicar
            </p>
            <Link
              href="/lobby/create?npcs=true"
              className="inline-block w-full text-center bg-gradient-to-r from-purple-600 to-pink-600 text-white py-2 px-4 rounded-lg hover:from-purple-700 hover:to-pink-700 transition font-semibold"
            >
              Crear con NPCs
            </Link>
          </div>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-md rounded-xl shadow-lg p-6 border-l-4 border-cyan-400 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/70 mb-1">Partidas Jugadas</p>
                <p className="text-3xl font-bold text-white">0</p>
              </div>
              <div className="w-12 h-12 bg-cyan-500/20 rounded-lg flex items-center justify-center border border-cyan-400/30">
                <span className="text-2xl">🎮</span>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl shadow-lg p-6 border-l-4 border-pink-400 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/70 mb-1">Victorias</p>
                <p className="text-3xl font-bold text-white">0</p>
              </div>
              <div className="w-12 h-12 bg-pink-500/20 rounded-lg flex items-center justify-center border border-pink-400/30">
                <span className="text-2xl">🏆</span>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl shadow-lg p-6 border-l-4 border-yellow-400 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/70 mb-1">Países Conquistados</p>
                <p className="text-3xl font-bold text-white">0</p>
              </div>
              <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center border border-yellow-400/30">
                <span className="text-2xl">🌎</span>
              </div>
            </div>
          </div>
        </div>

        {/* Social Section */}
        <DashboardSocial />

        {/* Active Games */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl shadow-lg p-6 mb-20 md:mb-6 border border-white/20">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white">Mis Partidas Activas</h2>
            <span className="text-sm text-white/70">0 partidas</span>
          </div>
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/20">
              <span className="text-4xl">🎯</span>
            </div>
            <p className="text-white/80 mb-2">No tienes partidas activas</p>
            <Link
              href="/lobby/create"
              className="text-cyan-400 hover:text-cyan-300 font-semibold transition-colors"
            >
              Crear tu primera partida →
            </Link>
          </div>
        </div>
      </div>

      {/* Botón flotante para crear partida (solo móvil) */}
      <FloatingCreateButton />
    </div>
  )
}
