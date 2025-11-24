import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    
    const { data: countries, error } = await supabase
      .from('countries')
      .select('*')
      .order('position', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ countries: countries || [] })
  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message || 'Error al obtener países' 
    }, { status: 500 })
  }
}

