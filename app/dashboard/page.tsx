import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg shadow-md border-b border-gray-200/50 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex justify-between items-center">
            {/* Logo y título */}
            <Link href="/dashboard" className="flex items-center gap-2 sm:gap-3 group">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-600 to-green-600 rounded-xl flex items-center justify-center text-white text-xl sm:text-2xl font-bold shadow-lg group-hover:scale-110 transition-transform duration-300">
                🌍
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
                  Turista Mundial
                </h1>
                <p className="text-xs sm:text-sm text-gray-500">Juego Virtual</p>
              </div>
            </Link>

            {/* Acciones del usuario */}
            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                href="/wallet"
                className="p-2 sm:px-3 sm:py-2 bg-gradient-to-br from-yellow-50 to-orange-50 hover:from-yellow-100 hover:to-orange-100 text-yellow-700 rounded-lg transition-all duration-300 font-semibold text-sm sm:text-base shadow-sm hover:shadow-md group"
                title="Mi Wallet"
              >
                <span className="hidden sm:inline">💰 Wallet</span>
                <span className="sm:hidden">💰</span>
              </Link>
              <Link
                href="/recognition"
                className="p-2 sm:px-3 sm:py-2 bg-gradient-to-br from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 text-purple-700 rounded-lg transition-all duration-300 font-semibold text-sm sm:text-base shadow-sm hover:shadow-md group"
                title="Salón de la Fama"
              >
                <span className="hidden sm:inline">🏆 Rankings</span>
                <span className="sm:hidden">🏆</span>
              </Link>
              <Link
                href="/referrals"
                className="p-2 sm:px-3 sm:py-2 bg-gradient-to-br from-green-50 to-yellow-50 hover:from-green-100 hover:to-yellow-100 text-green-600 rounded-lg transition-all duration-300 font-semibold text-sm sm:text-base shadow-sm hover:shadow-md group"
                title="Sistema de Referidos"
              >
                <span className="hidden sm:inline">👥 Referidos</span>
                <span className="sm:hidden">👥</span>
              </Link>
              <Link
                href="/profile"
                className="p-2 sm:px-3 sm:py-2 bg-gradient-to-br from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100 text-blue-600 rounded-lg transition-all duration-300 font-semibold text-sm sm:text-base shadow-sm hover:shadow-md group"
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
        <div className="bg-gradient-to-r from-blue-600 to-green-600 rounded-2xl shadow-xl p-8 mb-8 text-white">
          <h2 className="text-3xl font-bold mb-2">
            ¡Bienvenido, {profile?.username || 'Usuario'}! 👋
          </h2>
          <p className="text-blue-100 text-lg">
            Conquista el mundo comprando países y construyendo tu imperio turístico
          </p>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
          <Link
            href="/lobby/create"
            className="group bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 p-6 border-2 border-transparent hover:border-blue-500"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center group-hover:bg-blue-600 transition-colors">
                <span className="text-3xl group-hover:scale-110 transition-transform">➕</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Crear Partida</h3>
                <p className="text-sm text-gray-500">Nueva sesión</p>
              </div>
            </div>
            <p className="text-gray-600">
              Crea una nueva partida y espera a que se unan jugadores o agrega NPCs para empezar rápido
            </p>
          </Link>

          <Link
            href="/lobby"
            className="group bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 p-6 border-2 border-transparent hover:border-green-500"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center group-hover:bg-green-600 transition-colors">
                <span className="text-3xl group-hover:scale-110 transition-transform">🔍</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Buscar Partidas</h3>
                <p className="text-sm text-gray-500">Únete ahora</p>
              </div>
            </div>
            <p className="text-gray-600">
              Encuentra partidas disponibles y únete a la acción
            </p>
          </Link>

          <div className="group bg-white rounded-xl shadow-lg p-6 border-2 border-purple-200">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-purple-100 rounded-xl flex items-center justify-center">
                <span className="text-3xl">🤖</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Modo Práctica</h3>
                <p className="text-sm text-gray-500">Con NPCs</p>
              </div>
            </div>
            <p className="text-gray-600 mb-4">
              Crea una partida y agrega NPCs automáticamente para practicar
            </p>
            <Link
              href="/lobby/create?npcs=true"
              className="inline-block w-full text-center bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition font-semibold"
            >
              Crear con NPCs
            </Link>
          </div>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Partidas Jugadas</p>
                <p className="text-3xl font-bold text-gray-900">0</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">🎮</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Victorias</p>
                <p className="text-3xl font-bold text-gray-900">0</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">🏆</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-yellow-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Países Conquistados</p>
                <p className="text-3xl font-bold text-gray-900">0</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">🌎</span>
              </div>
            </div>
          </div>
        </div>

        {/* Social Section */}
        <DashboardSocial />

        {/* Active Games */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-20 md:mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Mis Partidas Activas</h2>
            <span className="text-sm text-gray-500">0 partidas</span>
          </div>
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">🎯</span>
            </div>
            <p className="text-gray-600 mb-2">No tienes partidas activas</p>
            <Link
              href="/lobby/create"
              className="text-blue-600 hover:text-blue-700 font-semibold"
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
