'use client'

import Link from "next/link"
import { useEffect, useState } from "react"
import Image from "next/image"

export default function Home() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 overflow-hidden">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-cyan-500/20 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-pink-500/20 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-1/2 w-72 h-72 bg-purple-500/20 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>

      {/* Hero Section */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 pt-20 pb-12">
        <div className="max-w-6xl mx-auto text-center z-10">
          {/* Logo Animation */}
          <div className={`mb-8 transform transition-all duration-1000 ${mounted ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}>
            <div className="inline-block relative">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-blue-400 to-pink-400 rounded-full blur-3xl opacity-50 animate-pulse"></div>
              <div className="relative w-48 h-48 sm:w-56 sm:h-56 mx-auto drop-shadow-2xl">
                <Image
                  src="https://cgoisveithzvituzyoga.supabase.co/storage/v1/object/public/avatars/turix.png"
                  alt="Turix Logo"
                  width={224}
                  height={224}
                  className="w-full h-full object-contain animate-pulse-slow"
                  priority
                />
              </div>
            </div>
          </div>

          {/* Main Title - Turix */}
          <h1 className={`text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-extrabold mb-4 transform transition-all duration-1000 delay-200 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
            <span className="text-white tracking-tight">
              Turix
            </span>
          </h1>

          {/* Tagline - TURISTA MUNDIAL */}
          <p className={`text-lg sm:text-xl md:text-2xl text-white/90 mb-2 font-semibold uppercase tracking-wider transform transition-all duration-1000 delay-300 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
            TURISTA MUNDIAL
          </p>

          {/* Subtitle */}
          <p className={`text-xl sm:text-2xl md:text-3xl text-white/80 mb-4 font-medium transform transition-all duration-1000 delay-300 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
            El clásico juego de mesa ahora online
          </p>
          <p className={`text-base sm:text-lg text-white/70 mb-12 max-w-2xl mx-auto transform transition-all duration-1000 delay-400 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
            Compite con jugadores de todo el mundo. Compra países, construye imperios y sé el último en pie.
          </p>

          {/* CTA Buttons */}
          <div className={`flex flex-col sm:flex-row gap-4 justify-center items-center mb-16 transform transition-all duration-1000 delay-500 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
            <Link
              href="/login"
              className="group relative px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-lg font-bold rounded-xl shadow-2xl hover:shadow-cyan-500/50 transform hover:scale-105 transition-all duration-300 overflow-hidden"
            >
              <span className="relative z-10 flex items-center gap-2">
                <span>Iniciar Sesión</span>
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 to-blue-700 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </Link>
            <Link
              href="/register"
              className="group relative px-8 py-4 bg-gradient-to-r from-pink-500 to-purple-600 text-white text-lg font-bold rounded-xl shadow-2xl hover:shadow-pink-500/50 transform hover:scale-105 transition-all duration-300 overflow-hidden"
            >
              <span className="relative z-10 flex items-center gap-2">
                <span>Registrarse</span>
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-pink-600 to-purple-700 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </Link>
          </div>

          {/* Scroll Indicator */}
          <div className={`animate-bounce ${mounted ? 'opacity-100' : 'opacity-0'}`}>
            <svg className="w-6 h-6 mx-auto text-white/60" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
              <path d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
            </svg>
          </div>
        </div>
      </section>

      {/* Nuevo León Promo Banner */}
      <section className="relative py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-purple-500/20 border-y border-cyan-400/30">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 md:p-8 border border-white/20 shadow-2xl">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">🎮</span>
                  <span className="px-3 py-1 bg-cyan-500/30 text-cyan-300 rounded-full text-sm font-semibold border border-cyan-400/50">
                    ¡Nuevo!
                  </span>
                </div>
                <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">
                  Turista Nuevo León
                </h3>
                <p className="text-white/80 text-lg mb-4">
                  Explora las ciudades, estadios y atracciones del estado más industrial de México
                </p>
                <div className="flex flex-wrap gap-2 text-sm text-white/70">
                  <span>🏙️ 4 Monopolios Únicos</span>
                  <span>•</span>
                  <span>🏟️ Estadios Deportivos</span>
                  <span>•</span>
                  <span>🎡 Atracciones Turísticas</span>
                </div>
              </div>
              <Link
                href="/nuevo-leon"
                className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-bold hover:from-cyan-600 hover:to-blue-700 transition shadow-lg hover:shadow-cyan-500/50 whitespace-nowrap"
              >
                Ver Más →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8 bg-white/5 backdrop-blur-sm border-t border-white/10">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl sm:text-5xl font-bold text-center mb-16 text-white">
            ¿Por qué jugar <span className="bg-gradient-to-r from-cyan-400 to-pink-400 bg-clip-text text-transparent">Turix</span>?
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="group bg-white/10 backdrop-blur-md rounded-2xl p-8 shadow-lg hover:shadow-2xl hover:bg-white/15 transform hover:-translate-y-2 transition-all duration-300 border border-white/20">
              <div className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-300">🌎</div>
              <h3 className="text-2xl font-bold mb-3 text-white">Compra Países</h3>
              <p className="text-white/80">
                Adquiere países de todo el mundo y construye tu imperio. Cada país es una inversión estratégica.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group bg-white/10 backdrop-blur-md rounded-2xl p-8 shadow-lg hover:shadow-2xl hover:bg-white/15 transform hover:-translate-y-2 transition-all duration-300 border border-white/20">
              <div className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-300">🏨</div>
              <h3 className="text-2xl font-bold mb-3 text-white">Construye Hoteles</h3>
              <p className="text-white/80">
                Desarrolla casas y hoteles turísticos para aumentar tus ingresos y dominar continentes enteros.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group bg-white/10 backdrop-blur-md rounded-2xl p-8 shadow-lg hover:shadow-2xl hover:bg-white/15 transform hover:-translate-y-2 transition-all duration-300 border border-white/20">
              <div className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-300">🎲</div>
              <h3 className="text-2xl font-bold mb-3 text-white">Juega Online</h3>
              <p className="text-white/80">
                Disfruta partidas multijugador en tiempo real con jugadores de todo el mundo o contra NPCs.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="group bg-white/10 backdrop-blur-md rounded-2xl p-8 shadow-lg hover:shadow-2xl hover:bg-white/15 transform hover:-translate-y-2 transition-all duration-300 border border-white/20">
              <div className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-300">💳</div>
              <h3 className="text-2xl font-bold mb-3 text-white">Gestiona Finanzas</h3>
              <p className="text-white/80">
                Administra tu dinero estratégicamente. Compra, construye, paga peajes y evita la bancarrota.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="group bg-white/10 backdrop-blur-md rounded-2xl p-8 shadow-lg hover:shadow-2xl hover:bg-white/15 transform hover:-translate-y-2 transition-all duration-300 border border-white/20">
              <div className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-300">🎯</div>
              <h3 className="text-2xl font-bold mb-3 text-white">Cartas Especiales</h3>
              <p className="text-white/80">
                Enfrenta la suerte y el destino con cartas que pueden cambiar el curso de la partida.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="group bg-white/10 backdrop-blur-md rounded-2xl p-8 shadow-lg hover:shadow-2xl hover:bg-white/15 transform hover:-translate-y-2 transition-all duration-300 border border-white/20">
              <div className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-300">🏆</div>
              <h3 className="text-2xl font-bold mb-3 text-white">Sé el Ganador</h3>
              <p className="text-white/80">
                El objetivo es simple: ser el último jugador con dinero. Domina el mundo y gana.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How to Play Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-800/50 to-purple-900/50 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl sm:text-5xl font-bold text-center mb-16 text-white">
            ¿Cómo se juega?
          </h2>
          
          <div className="space-y-8">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 sm:p-8 shadow-lg border-l-4 border-cyan-500 border border-white/20">
              <div className="flex items-start gap-4">
                <div className="text-3xl font-bold text-cyan-400 bg-cyan-500/20 rounded-full w-12 h-12 flex items-center justify-center flex-shrink-0">1</div>
                <div>
                  <h3 className="text-xl font-bold mb-2 text-white">Tira los Dados</h3>
                  <p className="text-white/80">Avanza por el tablero según el resultado de los dados.</p>
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 sm:p-8 shadow-lg border-l-4 border-pink-500 border border-white/20">
              <div className="flex items-start gap-4">
                <div className="text-3xl font-bold text-pink-400 bg-pink-500/20 rounded-full w-12 h-12 flex items-center justify-center flex-shrink-0">2</div>
                <div>
                  <h3 className="text-xl font-bold mb-2 text-white">Ejecuta la Acción</h3>
                  <p className="text-white/80">Compra países, paga peajes, construye o toma cartas según donde caigas.</p>
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 sm:p-8 shadow-lg border-l-4 border-purple-500 border border-white/20">
              <div className="flex items-start gap-4">
                <div className="text-3xl font-bold text-purple-400 bg-purple-500/20 rounded-full w-12 h-12 flex items-center justify-center flex-shrink-0">3</div>
                <div>
                  <h3 className="text-xl font-bold mb-2 text-white">Construye tu Imperio</h3>
                  <p className="text-white/80">Si tienes todos los países de un continente, construye casas y hoteles.</p>
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 sm:p-8 shadow-lg border-l-4 border-blue-500 border border-white/20">
              <div className="flex items-start gap-4">
                <div className="text-3xl font-bold text-blue-400 bg-blue-500/20 rounded-full w-12 h-12 flex items-center justify-center flex-shrink-0">4</div>
                <div>
                  <h3 className="text-xl font-bold mb-2 text-white">Domina el Mundo</h3>
                  <p className="text-white/80">Sé el último jugador con dinero y gana la partida.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-cyan-600 via-blue-600 to-pink-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-6">
            ¿Listo para dominar el mundo?
          </h2>
          <p className="text-xl sm:text-2xl text-white/90 mb-10">
            Únete a miles de jugadores y comienza tu aventura ahora
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="px-8 py-4 bg-white text-blue-600 text-lg font-bold rounded-xl shadow-2xl hover:shadow-white/50 transform hover:scale-105 transition-all duration-300"
            >
              Crear Cuenta Gratis
            </Link>
            <Link
              href="/login"
              className="px-8 py-4 bg-transparent border-2 border-white text-white text-lg font-bold rounded-xl hover:bg-white/10 transform hover:scale-105 transition-all duration-300"
            >
              Ya tengo cuenta
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative py-8 px-4 sm:px-6 lg:px-8 bg-slate-900/80 backdrop-blur-sm text-white text-center border-t border-white/10">
        <p className="text-white/60">
          © 2024 Turix - Turista Mundial. Todos los derechos reservados.
        </p>
      </footer>
    </div>
  )
}
