import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Asegurar que el perfil existe antes de actualizar el estado online
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()

    if (!profile) {
      // Intentar crear el perfil si no existe
      const { error: createError } = await supabase.rpc('ensure_user_profile_safe', {
        p_user_id: user.id
      })

      if (createError) {
        // Si no se puede crear, esperar un momento y reintentar
        await new Promise(resolve => setTimeout(resolve, 1000))
        const { data: retryProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .maybeSingle()

        if (!retryProfile) {
          console.warn('[UpdateOnlineStatus] Perfil no encontrado para usuario', user.id, 'después de intentar crearlo')
          // No retornar error, solo loguear - el perfil se creará en otro momento
        }
      }
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

