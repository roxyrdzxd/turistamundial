import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }
    
    const { referralCode } = await request.json()
    
    if (!referralCode) {
      return NextResponse.json({ error: 'Código de referencia requerido' }, { status: 400 })
    }
    
    // Llamar a la función de base de datos
    const { data, error } = await supabase.rpc('process_referral', {
      p_referred_user_id: user.id,
      p_referral_code: referralCode
    })
    
    if (error) {
      console.error('Error procesando referido:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    // Verificar si fue exitoso
    if (data && !data.success) {
      return NextResponse.json({ error: data.error || 'Error al procesar referido' }, { status: 400 })
    }
    
    return NextResponse.json({ 
      success: true, 
      data,
      message: 'Referido procesado exitosamente'
    })
  } catch (error: any) {
    console.error('Error en process referral:', error)
    return NextResponse.json({ error: error.message || 'Error al procesar referido' }, { status: 500 })
  }
}

