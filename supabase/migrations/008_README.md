# Configuración de Cierre Automático de Partidas

Esta migración agrega la funcionalidad de cierre automático de partidas abandonadas.

## Características

1. **Campo `last_activity`**: Rastrea la última actividad en cada partida
2. **Triggers automáticos**: Actualizan `last_activity` cuando hay cambios en:
   - `session_players` (jugadores se unen/salen)
   - `player_countries` (compra/venta de propiedades)
   - `game_moves` (cualquier movimiento en el juego)
3. **Función `close_abandoned_sessions()`**: Cierra partidas sin actividad:
   - Partidas 'waiting' sin actividad por más de 1 hora
   - Partidas 'active' sin actividad por más de 2 horas

## Configuración del Cierre Automático

### Opción 1: Usando pg_cron (Recomendado)

1. Habilita la extensión pg_cron en Supabase:
   ```sql
   CREATE EXTENSION IF NOT EXISTS pg_cron;
   ```

2. Programa la ejecución automática cada hora:
   ```sql
   SELECT cron.schedule(
     'close-abandoned-sessions',
     '0 * * * *',  -- Cada hora en el minuto 0
     $$SELECT close_abandoned_sessions();$$
   );
   ```

3. Para verificar que está programado:
   ```sql
   SELECT * FROM cron.job;
   ```

4. Para detener el cron job:
   ```sql
   SELECT cron.unschedule('close-abandoned-sessions');
   ```

### Opción 2: Usando Vercel Cron Jobs

Si prefieres usar Vercel, crea un archivo `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/close-sessions",
      "schedule": "0 * * * *"
    }
  ]
}
```

Y crea la ruta API `app/api/cron/close-sessions/route.ts` que llame a la función de Supabase.

### Opción 3: Ejecución Manual

Puedes ejecutar la función manualmente desde el SQL Editor de Supabase:

```sql
SELECT close_abandoned_sessions();
```

## Notas

- Los triggers se ejecutan automáticamente y no requieren configuración adicional
- La función `close_abandoned_sessions()` retorna el número de partidas cerradas
- Las partidas cerradas automáticamente tienen `status = 'finished'` y `finished_at` establecido

