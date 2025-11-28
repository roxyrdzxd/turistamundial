import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    
    // Obtener todos los tableros activos
    const { data: boards, error } = await supabase
      .from('boards')
      .select('id, name, description, is_active')
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ boards: boards || [] })
  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message || 'Error al obtener tableros' 
    }, { status: 500 })
  }
}

