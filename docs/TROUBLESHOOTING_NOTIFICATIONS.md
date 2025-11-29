# 🔧 Solución de Problemas - Notificaciones Push

## Problema: Las notificaciones no aparecen visualmente

Si el Service Worker muestra `✅ Notificación mostrada exitosamente` pero no ves la notificación, sigue estos pasos:

### 1. Verificar Permisos del Navegador

**Chrome/Edge:**
1. Haz clic en el ícono de candado 🔒 en la barra de direcciones
2. Verifica que "Notificaciones" esté en "Permitir"
3. Si está bloqueado, cambia a "Permitir"

**Firefox:**
1. Haz clic en el ícono de candado 🔒
2. Ve a "Más información" → "Permisos"
3. Verifica que "Notificar" esté permitido

**Safari:**
1. Safari → Preferencias → Sitios web → Notificaciones
2. Verifica que `turix.club` esté permitido

### 2. Verificar Configuración del Sistema Operativo

**Windows:**
- Configuración → Sistema → Notificaciones
- Asegúrate de que las notificaciones estén activadas
- Verifica que Chrome/Firefox tenga permiso para mostrar notificaciones

**macOS:**
- Preferencias del Sistema → Notificaciones
- Verifica que Chrome/Firefox tenga permiso

**Android:**
- Configuración → Aplicaciones → Chrome → Notificaciones
- Asegúrate de que estén activadas

### 3. Verificar que la Ventana NO esté en Primer Plano

Las notificaciones push pueden no mostrarse si:
- La pestaña está activa y visible
- La ventana está en primer plano

**Solución:**
- Minimiza la ventana del navegador
- Cambia a otra pestaña
- Cierra la pestaña pero deja el navegador abierto
- Luego envía la notificación de prueba

### 4. Verificar Modo "No Molestar"

Algunos navegadores tienen un modo "No molestar" que bloquea notificaciones:
- Chrome: Verifica en Configuración → Privacidad → Notificaciones
- Firefox: Verifica en Configuración → Privacidad

### 5. Probar en Modo Incógnito

Abre una ventana incógnita y prueba las notificaciones. Esto ayuda a descartar extensiones o configuraciones que puedan estar bloqueando.

### 6. Verificar en la Consola del Service Worker

1. Abre DevTools (F12)
2. Ve a Application → Service Workers
3. Haz clic en el link del Service Worker (sw.js)
4. Revisa los logs:
   - Debe aparecer `[Service Worker] Push recibido`
   - Debe aparecer `[Service Worker] ✅ Notificación mostrada exitosamente`
   - Si hay errores, aparecerán en rojo

### 7. Verificar en los Logs del Servidor (Vercel)

1. Ve a tu proyecto en Vercel
2. Functions → Logs
3. Busca mensajes que empiecen con `[NotificationService]`
4. Verifica si hay errores al enviar

### 8. Probar con Notificación del Sistema

Abre la consola del navegador y ejecuta:

```javascript
Notification.requestPermission().then(permission => {
  if (permission === 'granted') {
    new Notification('Prueba Manual', {
      body: 'Si ves esto, las notificaciones del sistema funcionan',
      icon: 'https://cgoisveithzvituzyoga.supabase.co/storage/v1/object/public/icons/icon-192x192.png'
    })
  } else {
    console.log('Permiso denegado:', permission)
  }
})
```

Si esta notificación SÍ aparece pero las push no, el problema está en el Service Worker o en cómo se envían.

### 9. Verificar que el Service Worker Esté Actualizado

1. DevTools → Application → Service Workers
2. Haz clic en "Unregister" para eliminar el Service Worker antiguo
3. Recarga la página (Ctrl+Shift+R)
4. Verifica que se registre el nuevo Service Worker
5. Prueba de nuevo

### 10. Verificar Suscripción en la Base de Datos

Ejecuta este query en Supabase:

```sql
SELECT 
  ps.*,
  p.username
FROM push_subscriptions ps
JOIN profiles p ON p.id = ps.user_id
WHERE ps.user_id = 'TU_USER_ID';
```

Verifica que:
- Existe la suscripción
- El `endpoint` no está vacío
- Las claves `p256dh` y `auth` no están vacías

## Problemas Comunes y Soluciones

### "Enviadas: 0, Fallidas: 0"

Esto significa que el endpoint `/api/notifications/send` no se está llamando o está fallando silenciosamente.

**Solución:**
- Verifica los logs de Vercel
- Verifica que `NEXT_PUBLIC_APP_URL` esté configurado correctamente
- Verifica que el endpoint `/api/notifications/send` esté accesible

### "Service Worker recibe push pero no muestra notificación"

**Posibles causas:**
1. Permisos bloqueados
2. Ventana en primer plano
3. Modo "No molestar" activado
4. Sistema operativo bloqueando notificaciones

**Solución:** Sigue los pasos 1-4 arriba.

### "Error 410 al enviar notificación"

Esto significa que la suscripción es inválida (el usuario desinstaló la app o cambió de dispositivo).

**Solución:** El sistema elimina automáticamente estas suscripciones. El usuario debe reactivar las notificaciones.

## Verificación Final

Si después de todos estos pasos aún no ves las notificaciones:

1. **Prueba en otro navegador** (Chrome, Firefox, Edge)
2. **Prueba en otro dispositivo** (móvil, tablet)
3. **Revisa los logs completos** en Vercel Functions
4. **Comparte los logs** del Service Worker y del servidor para diagnóstico

