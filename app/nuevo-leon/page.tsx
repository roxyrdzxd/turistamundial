'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

interface Board {
  id: string
  name: string
  description: string | null
}

export default function NuevoLeonLandingPage() {
  const router = useRouter()
  const [nuevoLeonBoardId, setNuevoLeonBoardId] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchNuevoLeonBoard()
  }, [])

  const fetchNuevoLeonBoard = async () => {
    try {
      const response = await fetch('/api/game/boards')
      const data = await response.json()
      if (data.boards) {
        const nuevoLeonBoard = data.boards.find((b: Board) => b.name === 'Turista Nuevo León')
        if (nuevoLeonBoard) {
          setNuevoLeonBoardId(nuevoLeonBoard.id)
        }
      }
    } catch (error) {
      console.error('Error obteniendo tablero:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateGame = () => {
    if (nuevoLeonBoardId) {
      router.push(`/lobby/create?boardId=${nuevoLeonBoardId}`)
    } else {
      router.push('/lobby/create')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-purple-500/10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
          <div className="text-center">
            <div className="mb-6">
              <span className="inline-block px-4 py-2 bg-cyan-500/20 text-cyan-300 rounded-full text-sm font-semibold border border-cyan-400/30">
                🎮 Nuevo Tablero Disponible
              </span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
              Turista <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">Nuevo León</span>
            </h1>
            <p className="text-xl md:text-2xl text-white/80 mb-8 max-w-3xl mx-auto">
              Explora las ciudades, estadios y atracciones turísticas del estado más industrial de México
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button
                onClick={handleCreateGame}
                disabled={loading}
                className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-bold text-lg hover:from-cyan-600 hover:to-blue-700 transition shadow-2xl hover:shadow-cyan-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Cargando...' : '🎮 Crear Partida Ahora'}
              </button>
              <Link
                href="/dashboard"
                className="px-8 py-4 bg-white/10 backdrop-blur-md text-white rounded-xl font-semibold text-lg hover:bg-white/20 transition border border-white/20"
              >
                Ver Dashboard
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-white text-center mb-12">
            Características del Tablero
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {/* Monopolios */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 hover:border-cyan-400 transition">
              <div className="text-4xl mb-4">🏙️</div>
              <h3 className="text-xl font-bold text-white mb-2">4 Monopolios Únicos</h3>
              <ul className="text-white/80 text-sm space-y-1">
                <li>• Capital Regia</li>
                <li>• Ruta Citrícola</li>
                <li>• Corredor Industrial</li>
                <li>• Tierras Nuevas</li>
              </ul>
            </div>

            {/* Estadios */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 hover:border-purple-400 transition">
              <div className="text-4xl mb-4">🏟️</div>
              <h3 className="text-xl font-bold text-white mb-2">Estadios Deportivos</h3>
              <ul className="text-white/80 text-sm space-y-1">
                <li>• Tigres UANL</li>
                <li>• Rayados</li>
                <li>• Sultanes</li>
                <li>• Fuerza Regia</li>
              </ul>
            </div>

            {/* Atracciones */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 hover:border-pink-400 transition">
              <div className="text-4xl mb-4">🎡</div>
              <h3 className="text-xl font-bold text-white mb-2">Atracciones Turísticas</h3>
              <ul className="text-white/80 text-sm space-y-1">
                <li>• Parque Fundidora</li>
                <li>• Macroplaza</li>
                <li>• Barrio Antiguo</li>
                <li>• Y más...</li>
              </ul>
            </div>

            {/* Transporte */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 hover:border-yellow-400 transition">
              <div className="text-4xl mb-4">🚇</div>
              <h3 className="text-xl font-bold text-white mb-2">Sistema de Transporte</h3>
              <ul className="text-white/80 text-sm space-y-1">
                <li>• Metro Monterrey</li>
                <li>• Y Griega</li>
                <li>• Alameda</li>
                <li>• Y más...</li>
              </ul>
            </div>
          </div>

          {/* Mejoras Personalizadas */}
          <div className="bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-xl p-8 border border-cyan-400/30 mb-12">
            <h3 className="text-2xl font-bold text-white mb-4 text-center">
              🏗️ Mejoras Personalizadas
            </h3>
            <p className="text-white/90 text-center mb-6">
              En lugar de casas tradicionales, construye mejoras únicas de Nuevo León:
            </p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {['Oxxo', 'Carnes Ramos', 'Piedrera', 'Cervecería', 'Hotel'].map((mejora, index) => (
                <div key={index} className="bg-white/10 backdrop-blur-sm rounded-lg p-4 text-center border border-white/20">
                  <div className="text-2xl mb-2">
                    {index === 0 && '🏪'}
                    {index === 1 && '🥩'}
                    {index === 2 && '🏗️'}
                    {index === 3 && '🍺'}
                    {index === 4 && '🏨'}
                  </div>
                  <p className="text-white font-semibold text-sm">{mejora}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Ciudades Destacadas */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-8 border border-white/20">
            <h3 className="text-2xl font-bold text-white mb-6 text-center">
              🏘️ Ciudades del Tablero
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {[
                'Monterrey', 'San Pedro', 'San Nicolás', 'Guadalupe',
                'Escobedo', 'Apodaca', 'Santa Catarina', 'Juárez',
                'Cadereyta', 'García', 'Pesquería', 'Linares',
                'Montemorelos', 'Santiago', 'Allende'
              ].map((ciudad, index) => (
                <div key={index} className="bg-white/5 rounded-lg p-3 text-center border border-white/10 hover:border-cyan-400/50 transition">
                  <p className="text-white text-sm font-medium">{ciudad}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-cyan-500/20 to-purple-500/20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            ¿Listo para Explorar Nuevo León?
          </h2>
          <p className="text-xl text-white/80 mb-8">
            Crea una partida ahora y domina las ciudades más importantes del estado
          </p>
          <button
            onClick={handleCreateGame}
            disabled={loading}
            className="px-10 py-5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-bold text-xl hover:from-cyan-600 hover:to-blue-700 transition shadow-2xl hover:shadow-cyan-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Cargando...' : '🚀 Crear Partida con Nuevo León'}
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 sm:px-6 lg:px-8 border-t border-white/10">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <Link href="/" className="text-white/80 hover:text-white transition">
            ← Volver al Inicio
          </Link>
          <p className="text-white/60 text-sm">
            Turix - Turista Mundial Virtual
          </p>
        </div>
      </footer>
    </div>
  )
}

