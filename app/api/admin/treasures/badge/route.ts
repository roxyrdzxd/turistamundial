import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// POST - Subir badge de tesoro (solo admin)
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Verificar si es administrador
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    // Obtener FormData
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const treasureId = formData.get('treasureId') as string | null

    if (!file) {
      return NextResponse.json(
        { error: 'No se proporcionó archivo' },
        { status: 400 }
      )
    }

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'El archivo debe ser una imagen' },
        { status: 400 }
      )
    }

    // Validar tamaño (máximo 50KB)
    if (file.size > 50 * 1024) {
      return NextResponse.json(
        { error: 'El archivo debe ser menor a 50KB' },
        { status: 400 }
      )
    }

    // Generar nombre de archivo único
    const fileExt = file.name.split('.').pop() || 'png'
    const fileName = treasureId 
      ? `${treasureId}/${Date.now()}.${fileExt}`
      : `temp/${Date.now()}.${fileExt}`
    const filePath = `badges/${fileName}`

    // Subir archivo a Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('treasure-badges')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      console.error('Error subiendo badge:', uploadError)
      return NextResponse.json(
        { error: 'Error al subir badge', details: uploadError.message },
        { status: 500 }
      )
    }

    // Obtener URL pública
    const { data: { publicUrl } } = supabase.storage
      .from('treasure-badges')
      .getPublicUrl(filePath)

    return NextResponse.json({
      success: true,
      badge_url: publicUrl,
      file_path: filePath
    })
  } catch (error: any) {
    console.error('Error inesperado:', error)
    return NextResponse.json(
      { error: 'Error inesperado al subir badge' },
      { status: 500 }
    )
  }
}
