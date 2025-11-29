import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { MercadoPagoConfig, Preference } from 'mercadopago'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { packageId } = await request.json()

    if (!packageId) {
      return NextResponse.json({ error: 'packageId requerido' }, { status: 400 })
    }

    // Obtener información del paquete
    const { data: coinPackage, error: packageError } = await supabase
      .from('coin_packages')
      .select('*')
      .eq('id', packageId)
      .eq('is_active', true)
      .single()

    if (packageError || !coinPackage) {
      return NextResponse.json({ error: 'Paquete no encontrado' }, { status: 404 })
    }

    // Verificar que el usuario tenga perfil
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, username')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })
    }

    // Configurar Mercado Pago
    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN
    if (!accessToken) {
      console.error('[Create Preference] MERCADOPAGO_ACCESS_TOKEN no configurado')
      return NextResponse.json({ error: 'Configuración de pago no disponible' }, { status: 500 })
    }

    const client = new MercadoPagoConfig({ accessToken: accessToken })
    const preference = new Preference(client)

    // Crear preferencia de pago
    const preferenceData = {
      items: [
        {
          title: coinPackage.name,
          description: coinPackage.description,
          quantity: 1,
          unit_price: Number(coinPackage.price_mxn),
          currency_id: 'MXN',
        },
      ],
      payer: {
        email: user.email || undefined,
        name: profile.username || undefined,
      },
      back_urls: {
        success: `${process.env.NEXT_PUBLIC_APP_URL || 'https://turix.club'}/wallet?payment=success`,
        failure: `${process.env.NEXT_PUBLIC_APP_URL || 'https://turix.club'}/wallet?payment=failure`,
        pending: `${process.env.NEXT_PUBLIC_APP_URL || 'https://turix.club'}/wallet?payment=pending`,
      },
      auto_return: 'approved',
      notification_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://turix.club'}/api/payments/webhook`,
      external_reference: user.id,
      metadata: {
        user_id: user.id,
        package_id: packageId,
        coins: coinPackage.coins,
      },
    }

    const response = await preference.create({ body: preferenceData })

    // Crear registro de transacción
    const { data: transaction, error: transactionError } = await supabase
      .from('payment_transactions')
      .insert({
        user_id: user.id,
        package_id: packageId,
        mercadopago_preference_id: response.id,
        amount_mxn: coinPackage.price_mxn,
        coins_amount: coinPackage.coins + (coinPackage.bonus_coins || 0),
        status: 'pending',
      })
      .select()
      .single()

    if (transactionError) {
      console.error('[Create Preference] Error creando transacción:', transactionError)
      // No fallar si hay error, pero loguearlo
    }

    return NextResponse.json({
      preference_id: response.id,
      init_point: response.init_point,
      sandbox_init_point: response.sandbox_init_point,
      transaction_id: transaction?.id,
    })
  } catch (error: any) {
    console.error('[Create Preference] Error:', error)
    return NextResponse.json({ 
      error: error.message || 'Error al crear preferencia de pago' 
    }, { status: 500 })
  }
}

