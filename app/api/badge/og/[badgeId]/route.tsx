import { createClient } from '@/lib/supabase/server'
import { ImageResponse } from '@vercel/og'

export const runtime = 'edge'

export async function GET(
  request: Request,
  { params }: { params: { badgeId: string } }
) {
  try {
    const supabase = await createClient()
    
    // Obtener datos del tesoro
    const { data: treasure, error } = await supabase
      .from('treasures')
      .select('id, name, badge_url, rarity, coins_reward')
      .eq('id', params.badgeId)
      .single()

    if (error || !treasure || !treasure.badge_url) {
      return new Response('Medalla no encontrada', { status: 404 })
    }

    const rarityColors = {
      common: { bg: '#10b981', text: '#ffffff', name: 'Común' },
      rare: { bg: '#3b82f6', text: '#ffffff', name: 'Raro' },
      epic: { bg: '#8b5cf6', text: '#ffffff', name: 'Épico' },
      legendary: { bg: '#f59e0b', text: '#ffffff', name: 'Legendario' }
    }

    const rarity = rarityColors[treasure.rarity as keyof typeof rarityColors] || rarityColors.common

    // Generar imagen OG usando next/og
    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#0f172a',
            backgroundImage: 'linear-gradient(to bottom right, #1e293b, #1e3a8a, #581c87)',
            fontFamily: 'system-ui',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 40,
            }}
          >
            <img
              src={treasure.badge_url}
              alt={treasure.name}
              width={200}
              height={200}
              style={{
                borderRadius: '50%',
                border: `8px solid ${rarity.bg}`,
              }}
            />
          </div>

          <div
            style={{
              fontSize: 48,
              fontWeight: 'bold',
              color: '#ffffff',
              marginBottom: 16,
              textAlign: 'center',
              maxWidth: 1000,
            }}
          >
            {treasure.name}
          </div>

          <div
            style={{
              backgroundColor: rarity.bg,
              color: rarity.text,
              padding: '12px 24px',
              borderRadius: 12,
              fontSize: 24,
              fontWeight: 'bold',
              marginBottom: 24,
            }}
          >
            {rarity.name}
          </div>

          <div
            style={{
              fontSize: 28,
              color: '#cbd5e1',
              textAlign: 'center',
              maxWidth: 800,
              marginBottom: 40,
            }}
          >
            ¡Conseguí esta medalla en TuristaMundial! 🏆
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              fontSize: 24,
              color: '#94a3b8',
            }}
          >
            <span>💰 {treasure.coins_reward} TC</span>
            <span>•</span>
            <span>turix.club</span>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    )
  } catch (error: any) {
    console.error('Error generando imagen OG:', error)
    return new Response('Error generando imagen', { status: 500 })
  }
}
