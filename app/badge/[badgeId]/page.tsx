import { createClient } from '@/lib/supabase/server'
import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: { badgeId: string }
  searchParams: { ref?: string }
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const supabase = await createClient()
  
  const { data: treasure } = await supabase
    .from('treasures')
    .select('id, name, description, badge_url, rarity')
    .eq('id', params.badgeId)
    .single()

  if (!treasure || !treasure.badge_url) {
    return {
      title: 'Medalla no encontrada - TuristaMundial',
    }
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://turix.club'
  const ogImageUrl = `${baseUrl}/api/badge/og/${treasure.id}`
  const shareUrl = searchParams.ref 
    ? `${baseUrl}/badge/${treasure.id}?ref=${searchParams.ref}`
    : `${baseUrl}/badge/${treasure.id}`

  return {
    title: `${treasure.name} - Medalla de TuristaMundial`,
    description: treasure.description || `¡Mira esta increíble medalla ${treasure.rarity} de TuristaMundial!`,
    openGraph: {
      title: `${treasure.name} - Medalla de TuristaMundial`,
      description: treasure.description || `¡Mira esta increíble medalla ${treasure.rarity} de TuristaMundial!`,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: treasure.name,
        },
      ],
      url: shareUrl,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${treasure.name} - Medalla de TuristaMundial`,
      description: treasure.description || `¡Mira esta increíble medalla ${treasure.rarity} de TuristaMundial!`,
      images: [ogImageUrl],
    },
  }
}

export default async function BadgePage({ params, searchParams }: PageProps) {
  const supabase = await createClient()
  
  // Obtener datos del tesoro/medalla
  const { data: treasure, error } = await supabase
    .from('treasures')
    .select('id, name, description, badge_url, rarity, coins_reward')
    .eq('id', params.badgeId)
    .single()

  if (error || !treasure || !treasure.badge_url) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <div className="text-center text-white">
          <h1 className="text-2xl font-bold mb-4">Medalla no encontrada</h1>
          <Link href="/" className="text-cyan-400 hover:text-cyan-300">
            Volver al inicio
          </Link>
        </div>
      </div>
    )
  }

  // Si hay código de referido, guardarlo en cookie para aplicar al registro
  const referralCode = searchParams.ref

  const rarityColors = {
    common: {
      gradient: 'from-gray-400 to-gray-600',
      border: 'border-gray-400',
      text: 'text-gray-300',
      name: 'Común'
    },
    rare: {
      gradient: 'from-blue-400 to-blue-600',
      border: 'border-blue-400',
      text: 'text-blue-300',
      name: 'Raro'
    },
    epic: {
      gradient: 'from-purple-400 to-purple-600',
      border: 'border-purple-400',
      text: 'text-purple-300',
      name: 'Épico'
    },
    legendary: {
      gradient: 'from-yellow-400 to-orange-500',
      border: 'border-yellow-400',
      text: 'text-yellow-300',
      name: 'Legendario'
    }
  }

  const rarity = rarityColors[treasure.rarity as keyof typeof rarityColors] || rarityColors.common

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <Link 
              href={referralCode ? `/register?ref=${referralCode}` : '/'}
              className="inline-block text-cyan-400 hover:text-cyan-300 mb-4 transition"
            >
              ← {referralCode ? 'Regístrate y consigue esta medalla' : 'Volver al inicio'}
            </Link>
            <h1 className="text-4xl font-bold text-white mb-2">Medalla de Tesoro</h1>
            <p className="text-white/70">¡Alguien compartió esta increíble medalla contigo!</p>
          </div>

          {/* Card de la medalla */}
          <div className={`bg-gradient-to-r ${rarity.gradient} rounded-2xl shadow-2xl p-8 mb-8 border-4 ${rarity.border}`}>
            <div className="flex flex-col items-center text-center">
              {/* Medalla */}
              <div className="w-48 h-48 rounded-full border-4 border-white/30 bg-white/10 p-4 mb-6 shadow-2xl">
                <Image
                  src={treasure.badge_url}
                  alt={treasure.name}
                  width={192}
                  height={192}
                  className="w-full h-full rounded-full object-cover"
                  unoptimized
                />
              </div>
              
              {/* Información */}
              <h2 className="text-3xl font-bold text-white mb-2">{treasure.name}</h2>
              <div className={`inline-block px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm mb-4 ${rarity.text} font-semibold`}>
                {rarity.name}
              </div>
              
              {treasure.description && (
                <p className="text-white/90 text-lg mb-4 max-w-md">{treasure.description}</p>
              )}
              
              <div className="flex items-center gap-2 text-white/80">
                <span>💰</span>
                <span className="font-semibold">{treasure.coins_reward} TuristaCoins</span>
              </div>
            </div>
          </div>

          {/* Call to Action */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl shadow-lg p-6 border border-white/20 text-center">
            <h3 className="text-2xl font-bold text-white mb-4">
              ¿Quieres conseguir esta medalla?
            </h3>
            <p className="text-white/80 mb-6">
              Únete a TuristaMundial, explora el mundo y recolecta tesoros increíbles mientras ganas TuristaCoins
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href={referralCode ? `/register?ref=${referralCode}` : '/register'}
                className="bg-gradient-to-r from-cyan-500 to-pink-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:from-cyan-600 hover:to-pink-700 transition shadow-lg"
              >
                🎮 Regístrate Gratis
              </Link>
              <Link
                href="/explore"
                className="bg-white/10 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-white/20 transition border border-white/20"
              >
                🗺️ Explorar Mapa
              </Link>
            </div>
            
            {referralCode && (
              <p className="text-sm text-green-300 mt-4">
                ✨ Usando el código de referido recibirás recompensas adicionales
              </p>
            )}
          </div>

          {/* Beneficios */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20 text-center">
              <div className="text-3xl mb-2">🏆</div>
              <h4 className="font-semibold text-white mb-1">Recolecta Medallas</h4>
              <p className="text-sm text-white/70">Encuentra tesoros y consigue medallas únicas</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20 text-center">
              <div className="text-3xl mb-2">💰</div>
              <h4 className="font-semibold text-white mb-1">Gana TuristaCoins</h4>
              <p className="text-sm text-white/70">Explora y gana monedas mientras te diviertes</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20 text-center">
              <div className="text-3xl mb-2">🌍</div>
              <h4 className="font-semibold text-white mb-1">Explora el Mundo</h4>
              <p className="text-sm text-white/70">Descubre lugares increíbles cerca de ti</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
