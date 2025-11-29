import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()

    // Obtener paquetes activos ordenados por display_order
    const { data: packages, error } = await supabase
      .from('coin_packages')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true })

    if (error) {
      console.error('[Packages] Error:', error)
      return NextResponse.json({ error: 'Error al obtener paquetes' }, { status: 500 })
    }

    return NextResponse.json({ packages: packages || [] })
  } catch (error: any) {
    console.error('[Packages] Error:', error)
    return NextResponse.json({ error: error.message || 'Error al obtener paquetes' }, { status: 500 })
  }
}

