import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { itemId } = await request.json()

    if (!itemId) {
      return NextResponse.json({ error: 'itemId requerido' }, { status: 400 })
    }

    // Verificar que el usuario tiene el item en su inventario
    const { data: inventoryItem, error: inventoryError } = await supabase
      .from('user_inventory')
      .select(`
        *,
        item:shop_items(*)
      `)
      .eq('user_id', user.id)
      .eq('item_id', itemId)
      .single()

    if (inventoryError || !inventoryItem) {
      return NextResponse.json({ error: 'Item no encontrado en tu inventario' }, { status: 404 })
    }

    // Verificar que el item es un avatar
    if (inventoryItem.item.category !== 'avatar') {
      return NextResponse.json({ error: 'Solo se pueden equipar avatares' }, { status: 400 })
    }

    // Obtener todos los items de avatar equipados del usuario
    // Primero obtener los IDs de items de categoría avatar
    const { data: avatarShopItems } = await supabase
      .from('shop_items')
      .select('id')
      .eq('category', 'avatar')

    if (!avatarShopItems || avatarShopItems.length === 0) {
      return NextResponse.json({ error: 'No hay avatares disponibles' }, { status: 404 })
    }

    const avatarItemIds = avatarShopItems.map(item => item.id)

    // Desequipar todos los avatares del usuario
    await supabase
      .from('user_inventory')
      .update({ is_equipped: false })
      .eq('user_id', user.id)
      .eq('is_equipped', true)
      .in('item_id', avatarItemIds)

    // Equipar el nuevo avatar
    const { error: equipError } = await supabase
      .from('user_inventory')
      .update({ is_equipped: true })
      .eq('id', inventoryItem.id)

    if (equipError) {
      console.error('[Equip Avatar] Error equipando:', equipError)
      return NextResponse.json({ error: equipError.message }, { status: 500 })
    }

    // Actualizar el avatar_url en el perfil con la imagen del item
    // Si el item tiene image_url, usarla; si no, usar una URL por defecto basada en el tipo
    let avatarUrl = inventoryItem.item.image_url

    // Si no hay image_url, generar una URL basada en el tipo de avatar
    if (!avatarUrl && inventoryItem.item.data) {
      const avatarType = inventoryItem.item.data.avatar_type || 'default'
      // Por ahora, usaremos una URL placeholder o el image_url del item
      // En el futuro, esto podría apuntar a assets específicos
      avatarUrl = inventoryItem.item.image_url || null
    }

    // Si hay una URL de avatar, actualizar el perfil
    if (avatarUrl) {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', user.id)

      if (profileError) {
        console.error('[Equip Avatar] Error actualizando perfil:', profileError)
        // No fallar si hay error actualizando el perfil, el item ya está equipado
      }
    }

    return NextResponse.json({ 
      success: true,
      message: 'Avatar equipado correctamente',
      avatar_url: avatarUrl
    })
  } catch (error: any) {
    console.error('[Equip Avatar] Error:', error)
    return NextResponse.json({ 
      error: error.message || 'Error al equipar avatar' 
    }, { status: 500 })
  }
}

