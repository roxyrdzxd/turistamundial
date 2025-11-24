import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Actualizar o crear estado online del usuario
    const { error: upsertError } = await supabase
      .from('user_online_status')
      .upsert({
        user_id: user.id,
        is_online: true,
        last_seen: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      })

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[UpdateOnlineStatus] Error:', error)
    return NextResponse.json({ error: error.message || 'Error al actualizar estado' }, { status: 500 })
  }
}

