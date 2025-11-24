# Sistema de Amigos y Usuarios en Línea

Este sistema permite a los usuarios:
- Ver otros jugadores en línea en el dashboard
- Enviar solicitudes de amistad
- Ver el estado de conexión de sus amigos
- Invitar amigos a partidas

## Configuración

### 1. Ejecutar la Migración SQL

Ejecuta `supabase/migrations/013_create_friends_system.sql` en el SQL Editor de Supabase.

Esta migración crea:
- Tabla `friend_requests`: Solicitudes de amistad pendientes
- Tabla `friendships`: Relaciones de amistad establecidas
- Tabla `user_online_status`: Estado online global de usuarios
- Políticas RLS para seguridad
- Triggers para crear amistades automáticamente

### 2. Configurar Detección Automática de Usuarios Desconectados (Opcional)

Para marcar automáticamente usuarios como desconectados, ejecuta periódicamente:

```sql
SELECT mark_offline_users();
```

O configura con `pg_cron` (cada minuto):

```sql
SELECT cron.schedule(
  'mark-offline-users',
  '* * * * *',  -- Cada minuto
  $$SELECT mark_offline_users();$$
);
```

## Funcionalidades

### Dashboard

1. **Jugadores en Línea**: Muestra hasta 20 usuarios en línea (últimos 5 minutos)
   - Avatares con indicador verde de "en línea"
   - Botón "+ Amigo" para enviar solicitudes
   - Actualización automática cada 30 segundos

2. **Lista de Amigos**: 
   - Muestra tus amigos con estado online/offline
   - Solicitudes recibidas con botones para aceptar/rechazar
   - Botón "Invitar" para invitar a partidas
   - Actualización automática cada 30 segundos

### API Endpoints

- `POST /api/friends/send-request`: Enviar solicitud de amistad
- `POST /api/friends/respond-request`: Aceptar/rechazar solicitud
- `GET /api/friends/list`: Obtener lista de amigos
- `GET /api/friends/requests`: Obtener solicitudes pendientes
- `GET /api/users/online`: Obtener usuarios en línea
- `POST /api/users/update-online-status`: Actualizar estado online

### Estado Online

El sistema rastrea el estado online de los usuarios:
- Los usuarios se marcan como online cuando están en el dashboard o en una partida
- Se actualiza automáticamente cada 30 segundos
- Los usuarios se marcan como offline después de 5 minutos sin actividad

## Notas

- Las solicitudes de amistad son bidireccionales (no puedes enviar múltiples solicitudes)
- Las amistades se crean automáticamente cuando se acepta una solicitud
- El estado online se actualiza automáticamente en el dashboard
- Los NPCs no aparecen en la lista de usuarios en línea

