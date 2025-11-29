// Script para generar claves VAPID para notificaciones push
// Ejecutar con: node scripts/generate-vapid-keys.js

const webpush = require('web-push')

console.log('🔑 Generando claves VAPID...\n')

const vapidKeys = webpush.generateVAPIDKeys()

console.log('✅ Claves generadas exitosamente!\n')
console.log('📋 Agrega estas variables a tu archivo .env.local:\n')
console.log('NEXT_PUBLIC_VAPID_PUBLIC_KEY=' + vapidKeys.publicKey)
console.log('VAPID_PRIVATE_KEY=' + vapidKeys.privateKey)
console.log('VAPID_EMAIL=mailto:noreply@turix.club\n')
console.log('⚠️  IMPORTANTE:')
console.log('   - La clave PRIVADA debe mantenerse SECRETA')
console.log('   - Solo agrega NEXT_PUBLIC_VAPID_PUBLIC_KEY al .env.local del cliente')
console.log('   - Agrega VAPID_PRIVATE_KEY y VAPID_EMAIL a las variables de entorno de Vercel (solo servidor)\n')

