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

    // Verificar que el item es un avatar o un color
    if (inventoryItem.item.category !== 'avatar' && inventoryItem.item.category !== 'color') {
      return NextResponse.json({ error: 'Solo se pueden equipar avatares o colores' }, { status: 400 })
    }

    const itemCategory = inventoryItem.item.category

    if (itemCategory === 'avatar') {
      // Lógica para equipar avatares
      // Obtener todos los items de avatar equipados del usuario
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

      // Actualizar el avatar_url en el perfil
      let avatarUrl = inventoryItem.item.image_url

      if (!avatarUrl && inventoryItem.item.data) {
        const avatarType = inventoryItem.item.data.avatar_type || 'default'
        avatarUrl = inventoryItem.item.image_url || null
      }

      if (avatarUrl) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ avatar_url: avatarUrl })
          .eq('id', user.id)

        if (profileError) {
          console.error('[Equip Avatar] Error actualizando perfil:', profileError)
        }
      }

      return NextResponse.json({ 
        success: true,
        message: 'Avatar equipado correctamente',
        avatar_url: avatarUrl
      })
    } else if (itemCategory === 'color') {
      // Lógica para equipar colores
      // Obtener todos los items de color equipados del usuario
      const { data: colorShopItems } = await supabase
        .from('shop_items')
        .select('id')
        .eq('category', 'color')

      if (!colorShopItems || colorShopItems.length === 0) {
        return NextResponse.json({ error: 'No hay colores disponibles' }, { status: 404 })
      }

      const colorItemIds = colorShopItems.map(item => item.id)

      // Desequipar todos los colores del usuario
      await supabase
        .from('user_inventory')
        .update({ is_equipped: false })
        .eq('user_id', user.id)
        .eq('is_equipped', true)
        .in('item_id', colorItemIds)

      // Equipar el nuevo color
      const { error: equipError } = await supabase
        .from('user_inventory')
        .update({ is_equipped: true })
        .eq('id', inventoryItem.id)

      if (equipError) {
        console.error('[Equip Color] Error equipando:', equipError)
        return NextResponse.json({ error: equipError.message }, { status: 500 })
      }

      // Obtener el color del item (puede ser rainbow, neon, o un color estándar)
      let preferredColor: string | null = null
      
      if (inventoryItem.item.data && inventoryItem.item.data.color) {
        const colorData = inventoryItem.item.data.color
        
        // Mapear colores especiales a colores del juego
        // rainbow -> pink (color vibrante)
        // neon -> cyan (color brillante)
        // Si es un color estándar, usarlo directamente
        if (colorData === 'rainbow') {
          preferredColor = 'pink'
        } else if (colorData === 'neon') {
          preferredColor = 'cyan'
        } else if (['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'cyan'].includes(colorData)) {
          preferredColor = colorData
        }
      }

      // Si no se pudo determinar el color, usar un valor por defecto basado en el nombre del item
      if (!preferredColor) {
        const itemName = inventoryItem.item.name.toLowerCase()
        if (itemName.includes('arcoiris') || itemName.includes('rainbow')) {
          preferredColor = 'pink'
        } else if (itemName.includes('neon') || itemName.includes('neón')) {
          preferredColor = 'cyan'
        } else {
          // Color por defecto si no se puede determinar
          preferredColor = 'blue'
        }
      }

      // Actualizar el preferred_color en el perfil
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ preferred_color: preferredColor })
        .eq('id', user.id)

      if (profileError) {
        console.error('[Equip Color] Error actualizando perfil:', profileError)
        return NextResponse.json({ error: profileError.message }, { status: 500 })
      }

      return NextResponse.json({ 
        success: true,
        message: 'Color equipado correctamente',
        preferred_color: preferredColor
      })
    } else {
      return NextResponse.json({ error: 'Tipo de item no soportado para equipar' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('[Equip Avatar] Error:', error)
    return NextResponse.json({ 
      error: error.message || 'Error al equipar avatar' 
    }, { status: 500 })
  }
}

