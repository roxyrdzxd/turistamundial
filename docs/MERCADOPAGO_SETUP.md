# Configuración de Mercado Pago para Compra de TuristaCoins

## Requisitos Previos

1. Cuenta de Mercado Pago (https://www.mercadopago.com.mx/)
2. Acceso a las credenciales de API (Access Token)

## Configuración

### 1. Variables de Entorno

Agrega las siguientes variables de entorno en tu archivo `.env.local` y en Vercel:

```env
MERCADOPAGO_ACCESS_TOKEN=TU_ACCESS_TOKEN_AQUI
NEXT_PUBLIC_APP_URL=https://turix.club
```

### 2. Obtener Access Token de Mercado Pago

1. Inicia sesión en tu cuenta de Mercado Pago
2. Ve a: **Desarrolladores** > **Tus integraciones**
3. Crea una nueva aplicación o selecciona una existente
4. Copia el **Access Token** (Production o Test según corresponda)

### 3. Configurar Webhook

1. En la configuración de tu aplicación de Mercado Pago
2. Ve a **Webhooks**
3. Agrega la URL: `https://turix.club/api/payments/webhook`
4. Selecciona los eventos: `payment`

## Paquetes Disponibles

Los siguientes paquetes están configurados:

- **Paquete Básico**: 1000 TC - $50 MXN
- **Paquete Popular**: 2500 TC - $100 MXN
- **Paquete Premium**: 6000 TC - $200 MXN
- **Paquete Épico**: 16000 TC - $500 MXN

## Flujo de Pago

1. Usuario selecciona un paquete en `/wallet`
2. Se crea una preferencia de pago en Mercado Pago
3. Usuario es redirigido a Mercado Pago para completar el pago
4. Mercado Pago envía notificación al webhook
5. El sistema procesa el pago y otorga los TuristaCoins
6. Usuario es redirigido de vuelta a `/wallet?payment=success`

## Testing

Para probar en modo sandbox:

1. Usa el Access Token de **Test** en desarrollo
2. Mercado Pago proporcionará una URL `sandbox_init_point`
3. Puedes usar tarjetas de prueba de Mercado Pago

### Tarjetas de Prueba

- **Aprobada**: 5031 7557 3453 0604
- **Rechazada**: 5031 4332 1540 6351
- CVV: 123
- Fecha: Cualquier fecha futura

## Seguridad

- El webhook valida los pagos directamente con Mercado Pago
- Los pagos solo se procesan cuando el estado es `approved`
- Se registran todas las transacciones en `payment_transactions`
- Los coins se otorgan usando la función `grant_coins` existente

## Troubleshooting

### El pago no se procesa

1. Verifica que `MERCADOPAGO_ACCESS_TOKEN` esté configurado
2. Verifica que el webhook esté configurado correctamente
3. Revisa los logs del servidor para errores
4. Verifica que la función `process_payment_approval` exista en la base de datos

### Los coins no se agregan

1. Verifica que el webhook esté recibiendo las notificaciones
2. Revisa la tabla `payment_transactions` para ver el estado
3. Verifica que la función `grant_coins` funcione correctamente

