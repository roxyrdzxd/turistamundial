import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { MercadoPagoConfig, Payment } from 'mercadopago'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const supabase = await createClient()

    // Mercado Pago envía diferentes tipos de notificaciones
    const { type, data } = body

    if (type === 'payment') {
      const paymentId = data.id

      if (!paymentId) {
        return NextResponse.json({ error: 'Payment ID requerido' }, { status: 400 })
      }

      // Obtener información del pago desde Mercado Pago
      const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN
      if (!accessToken) {
        console.error('[Webhook] MERCADOPAGO_ACCESS_TOKEN no configurado')
        return NextResponse.json({ error: 'Configuración no disponible' }, { status: 500 })
      }

      const client = new MercadoPagoConfig({ accessToken: accessToken })
      const payment = new Payment(client)

      const paymentData = await payment.get({ id: paymentId })

      // Buscar transacción por preference_id o payment_id
      const { data: transaction } = await supabase
        .from('payment_transactions')
        .select('*')
        .or(`mercadopago_preference_id.eq.${paymentData.preference_id},mercadopago_payment_id.eq.${paymentId}`)
        .single()

      if (!transaction) {
        console.error('[Webhook] Transacción no encontrada para payment_id:', paymentId)
        return NextResponse.json({ error: 'Transacción no encontrada' }, { status: 404 })
      }

      // Actualizar payment_id si no estaba guardado
      if (!transaction.mercadopago_payment_id) {
        await supabase
          .from('payment_transactions')
          .update({ mercadopago_payment_id: paymentId })
          .eq('id', transaction.id)
      }

      // Procesar según el estado del pago
      const status = paymentData.status
      let dbStatus = 'pending'

      if (status === 'approved') {
        dbStatus = 'approved'
      } else if (status === 'rejected' || status === 'cancelled') {
        dbStatus = status === 'rejected' ? 'rejected' : 'cancelled'
      }

      // Procesar pago usando la función SQL
      const { data: result, error: processError } = await supabase.rpc('process_payment_approval', {
        p_payment_id: paymentId,
        p_status: dbStatus,
        p_metadata: paymentData as any,
      })

      if (processError) {
        console.error('[Webhook] Error procesando pago:', processError)
        return NextResponse.json({ error: 'Error procesando pago' }, { status: 500 })
      }

      return NextResponse.json({ success: true, result })
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('[Webhook] Error:', error)
    return NextResponse.json({ 
      error: error.message || 'Error procesando webhook' 
    }, { status: 500 })
  }
}

