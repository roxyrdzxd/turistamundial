# 🔔 Sistema de Notificaciones Push

Este documento describe cómo funciona el sistema de notificaciones push en Turix.

## 📋 Requisitos Previos

1. **Claves VAPID**: Necesitas generar claves VAPID para autenticar las notificaciones
2. **Service Worker**: Ya está configurado en `public/sw.js`
3. **Base de datos**: Tabla `push_subscriptions` creada

## 🔑 Configuración Inicial

### 1. Generar Claves VAPID

Ejecuta el script para generar las claves:

```bash
node scripts/generate-vapid-keys.js
```

Esto generará:
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`: Clave pública (va en el cliente)
- `VAPID_PRIVATE_KEY`: Clave privada (solo en el servidor)
- `VAPID_EMAIL`: Email de contacto (formato: `mailto:email@dominio.com`)

### 2. Configurar Variables de Entorno

**En `.env.local` (desarrollo):**
```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=tu_clave_publica_aqui
VAPID_PRIVATE_KEY=tu_clave_privada_aqui
VAPID_EMAIL=mailto:noreply@turix.club
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**En Vercel (producción):**
1. Ve a tu proyecto en Vercel
2. Settings → Environment Variables
3. Agrega:
   - `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (pública)
   - `VAPID_PRIVATE_KEY` (privada, marcada como "Sensitive")
   - `VAPID_EMAIL` (mailto:...)
   - `NEXT_PUBLIC_APP_URL` (https://turix.club)

### 3. Ejecutar Migración SQL

Ejecuta en Supabase SQL Editor:
```sql
-- Ejecutar: supabase/migrations/028_create_push_subscriptions.sql
```

## 🎯 Funcionalidades

### Notificaciones Implementadas

1. **Es tu turno** (`notifyPlayerTurn`)
   - Se envía cuando cambia el turno en una partida
   - Ubicación: `app/api/game/end-turn/route.ts`

2. **Partida lista** (`notifyGameReady`)
   - Se envía cuando una partida pasa de "waiting" a "active"
   - Ubicación: `app/api/game/start-session/route.ts`

3. **Solicitud de amistad** (`notifyFriendRequest`)
   - Se envía cuando alguien te envía una solicitud de amistad
   - Ubicación: `app/api/friends/send-request/route.ts`

4. **Amistad aceptada** (`notifyFriendAccepted`)
   - Se envía cuando alguien acepta tu solicitud de amistad
   - Ubicación: `app/api/friends/respond-request/route.ts`

## 🛠️ Uso

### En el Frontend

El componente `NotificationPrompt` se muestra automáticamente en el dashboard:

```tsx
import NotificationPrompt from '@/components/notifications/NotificationPrompt'

// En tu página
<NotificationPrompt />
```

### En el Backend

Para enviar una notificación desde un API route:

```typescript
import { notifyPlayerTurn } from '@/lib/notifications/helpers'

// Enviar notificación
await notifyPlayerTurn(userId, sessionId)
```

### Funciones Helper Disponibles

- `notifyPlayerTurn(userId, sessionId)`: Notifica que es el turno del jugador
- `notifyGameInvitation(userId, sessionId, inviterUsername)`: Invitación a partida
- `notifyGameReady(userId, sessionId)`: Partida lista para iniciar
- `notifyFriendRequest(userId, requesterUsername)`: Solicitud de amistad
- `notifyFriendAccepted(userId, friendUsername)`: Amistad aceptada
- `sendPushNotification(userId, options)`: Notificación personalizada

## 📱 Compatibilidad

- ✅ Chrome/Edge (Windows, Android, macOS)
- ✅ Firefox (Windows, Android, macOS)
- ✅ Safari (macOS 13+, iOS 16.4+)
- ❌ Safari (iOS < 16.4) - No soportado

## 🔒 Seguridad

- Las claves VAPID privadas nunca se exponen al cliente
- Las suscripciones están vinculadas a usuarios autenticados
- RLS (Row Level Security) protege la tabla de suscripciones
- Solo el usuario puede ver/editar sus propias suscripciones

## 🐛 Troubleshooting

### Las notificaciones no aparecen

1. **Verificar permisos**: El usuario debe haber otorgado permiso
2. **Verificar Service Worker**: Abre DevTools → Application → Service Workers
3. **Verificar suscripción**: DevTools → Application → Storage → IndexedDB
4. **Verificar claves VAPID**: Deben estar configuradas correctamente

### Error: "VAPID keys not configured"

- Verifica que las variables de entorno estén configuradas
- En producción, verifica en Vercel que las variables estén correctas

### Notificaciones no se envían

1. Verifica que el usuario tenga una suscripción activa
2. Revisa los logs del servidor para errores
3. Verifica que el endpoint de notificación sea válido

## 📊 Monitoreo

Las notificaciones se envían de forma asíncrona y los errores se registran en la consola del servidor. Las suscripciones inválidas (410) se eliminan automáticamente.

## 🚀 Próximas Mejoras

- [ ] Panel de configuración de notificaciones por tipo
- [ ] Estadísticas de notificaciones enviadas
- [ ] Agrupación de notificaciones similares
- [ ] Notificaciones programadas

