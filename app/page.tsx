'use client'

import Link from "next/link"
import { useEffect, useState } from "react"

export default function Home() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 overflow-hidden">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-1/2 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* Hero Section */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 pt-20 pb-12">
        <div className="max-w-6xl mx-auto text-center z-10">
          {/* Logo Animation */}
          <div className={`mb-8 transform transition-all duration-1000 ${mounted ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}>
            <div className="inline-block relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full blur-2xl opacity-50 animate-pulse"></div>
              <div className="relative text-8xl sm:text-9xl animate-bounce-slow">
                🌍
              </div>
            </div>
          </div>

          {/* Main Title */}
          <h1 className={`text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold mb-6 transform transition-all duration-1000 delay-200 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
            <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent animate-gradient">
              Turista Mundial
            </span>
          </h1>

          {/* Subtitle */}
          <p className={`text-xl sm:text-2xl md:text-3xl text-gray-700 mb-4 font-semibold transform transition-all duration-1000 delay-300 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
            El clásico juego de mesa ahora online
          </p>
          <p className={`text-lg sm:text-xl text-gray-600 mb-12 max-w-2xl mx-auto transform transition-all duration-1000 delay-400 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
            Compite con jugadores de todo el mundo. Compra países, construye imperios y sé el último en pie.
          </p>

          {/* CTA Buttons */}
          <div className={`flex flex-col sm:flex-row gap-4 justify-center items-center mb-16 transform transition-all duration-1000 delay-500 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
            <Link
              href="/login"
              className="group relative px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-lg font-bold rounded-xl shadow-2xl hover:shadow-blue-500/50 transform hover:scale-105 transition-all duration-300 overflow-hidden"
            >
              <span className="relative z-10 flex items-center gap-2">
                <span>Iniciar Sesión</span>
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-blue-700 to-cyan-700 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </Link>
            <Link
              href="/register"
              className="group relative px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-lg font-bold rounded-xl shadow-2xl hover:shadow-green-500/50 transform hover:scale-105 transition-all duration-300 overflow-hidden"
            >
              <span className="relative z-10 flex items-center gap-2">
                <span>Registrarse</span>
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-green-600 to-emerald-700 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </Link>
          </div>

          {/* Scroll Indicator */}
          <div className={`animate-bounce ${mounted ? 'opacity-100' : 'opacity-0'}`}>
            <svg className="w-6 h-6 mx-auto text-gray-400" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
              <path d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
            </svg>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8 bg-white/50 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl sm:text-5xl font-bold text-center mb-16 text-gray-800">
            ¿Por qué jugar <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Turista Mundial</span>?
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-300 border border-gray-100">
              <div className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-300">🌎</div>
              <h3 className="text-2xl font-bold mb-3 text-gray-800">Compra Países</h3>
              <p className="text-gray-600">
                Adquiere países de todo el mundo y construye tu imperio. Cada país es una inversión estratégica.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-300 border border-gray-100">
              <div className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-300">🏨</div>
              <h3 className="text-2xl font-bold mb-3 text-gray-800">Construye Hoteles</h3>
              <p className="text-gray-600">
                Desarrolla casas y hoteles turísticos para aumentar tus ingresos y dominar continentes enteros.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-300 border border-gray-100">
              <div className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-300">🎲</div>
              <h3 className="text-2xl font-bold mb-3 text-gray-800">Juega Online</h3>
              <p className="text-gray-600">
                Disfruta partidas multijugador en tiempo real con jugadores de todo el mundo o contra NPCs.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-300 border border-gray-100">
              <div className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-300">💳</div>
              <h3 className="text-2xl font-bold mb-3 text-gray-800">Gestiona Finanzas</h3>
              <p className="text-gray-600">
                Administra tu dinero estratégicamente. Compra, construye, paga peajes y evita la bancarrota.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-300 border border-gray-100">
              <div className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-300">🎯</div>
              <h3 className="text-2xl font-bold mb-3 text-gray-800">Cartas Especiales</h3>
              <p className="text-gray-600">
                Enfrenta la suerte y el destino con cartas que pueden cambiar el curso de la partida.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-300 border border-gray-100">
              <div className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-300">🏆</div>
              <h3 className="text-2xl font-bold mb-3 text-gray-800">Sé el Ganador</h3>
              <p className="text-gray-600">
                El objetivo es simple: ser el último jugador con dinero. Domina el mundo y gana.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How to Play Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl sm:text-5xl font-bold text-center mb-16 text-gray-800">
            ¿Cómo se juega?
          </h2>
          
          <div className="space-y-8">
            <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-lg border-l-4 border-blue-500">
              <div className="flex items-start gap-4">
                <div className="text-3xl font-bold text-blue-600 bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center flex-shrink-0">1</div>
                <div>
                  <h3 className="text-xl font-bold mb-2 text-gray-800">Tira los Dados</h3>
                  <p className="text-gray-600">Avanza por el tablero según el resultado de los dados.</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-lg border-l-4 border-green-500">
              <div className="flex items-start gap-4">
                <div className="text-3xl font-bold text-green-600 bg-green-100 rounded-full w-12 h-12 flex items-center justify-center flex-shrink-0">2</div>
                <div>
                  <h3 className="text-xl font-bold mb-2 text-gray-800">Ejecuta la Acción</h3>
                  <p className="text-gray-600">Compra países, paga peajes, construye o toma cartas según donde caigas.</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-lg border-l-4 border-purple-500">
              <div className="flex items-start gap-4">
                <div className="text-3xl font-bold text-purple-600 bg-purple-100 rounded-full w-12 h-12 flex items-center justify-center flex-shrink-0">3</div>
                <div>
                  <h3 className="text-xl font-bold mb-2 text-gray-800">Construye tu Imperio</h3>
                  <p className="text-gray-600">Si tienes todos los países de un continente, construye casas y hoteles.</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-lg border-l-4 border-pink-500">
              <div className="flex items-start gap-4">
                <div className="text-3xl font-bold text-pink-600 bg-pink-100 rounded-full w-12 h-12 flex items-center justify-center flex-shrink-0">4</div>
                <div>
                  <h3 className="text-xl font-bold mb-2 text-gray-800">Domina el Mundo</h3>
                  <p className="text-gray-600">Sé el último jugador con dinero y gana la partida.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600">
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
      <footer className="relative py-8 px-4 sm:px-6 lg:px-8 bg-gray-900 text-white text-center">
        <p className="text-gray-400">
          © 2024 Turista Mundial. Todos los derechos reservados.
        </p>
      </footer>
    </div>
  )
}
