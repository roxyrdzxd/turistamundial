# Reinicio Automático de Misiones Diarias

Este documento explica cómo funciona el sistema de reinicio automático de misiones diarias a medianoche.

## Funcionamiento

Las misiones diarias se reinician automáticamente a las 00:00 UTC cada día. El sistema incluye:

1. **Función SQL `reset_all_daily_missions()`**: Reinicia todas las misiones diarias para todos los usuarios
2. **Función mejorada `initialize_daily_missions()`**: Elimina misiones del día anterior y crea nuevas
3. **Función mejorada `update_mission_progress()`**: Detecta automáticamente cuando es un nuevo día y reinicia misiones

## Configuración del Cron Job

### Opción 1: pg_cron (Recomendado si está disponible en Supabase)

La migración `020_reset_daily_missions_at_midnight.sql` intenta configurar automáticamente pg_cron. Si pg_cron no está disponible, verás un mensaje en los logs.

Para verificar si pg_cron está disponible:
```sql
SELECT * FROM pg_extension WHERE extname = 'pg_cron';
```

Para ver los cron jobs configurados:
```sql
SELECT * FROM cron.job;
```

### Opción 2: Vercel Cron Jobs

Si estás usando Vercel, crea un archivo `vercel.json` en la raíz del proyecto:

```json
{
  "crons": [
    {
      "path": "/api/cron/reset-daily-missions",
      "schedule": "0 0 * * *"
    }
  ]
}
```

Y configura la variable de entorno `CRON_SECRET_TOKEN` en Vercel para proteger el endpoint.

### Opción 3: GitHub Actions (Gratis)

Crea `.github/workflows/reset-daily-missions.yml`:

```yaml
name: Reset Daily Missions

on:
  schedule:
    - cron: '0 0 * * *'  # Medianoche UTC todos los días
  workflow_dispatch:  # Permite ejecución manual

jobs:
  reset:
    runs-on: ubuntu-latest
    steps:
      - name: Reset Daily Missions
        run: |
          curl -X POST https://tu-dominio.com/api/cron/reset-daily-missions \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET_TOKEN }}"
```

### Opción 4: Servicio Externo (cron-job.org, EasyCron, etc.)

Configura un cron job que llame a:
```
POST https://tu-dominio.com/api/cron/reset-daily-missions
Authorization: Bearer YOUR_SECRET_TOKEN
```

## Variables de Entorno

Asegúrate de configurar:
- `CRON_SECRET_TOKEN`: Token secreto para proteger el endpoint de cron jobs

## Verificación Manual

Puedes probar el reinicio manualmente ejecutando:

```sql
SELECT reset_all_daily_missions();
```

O llamando a la API:
```bash
curl -X POST https://tu-dominio.com/api/cron/reset-daily-missions \
  -H "Authorization: Bearer YOUR_SECRET_TOKEN"
```

## Comportamiento

- Las misiones diarias del día anterior se eliminan automáticamente
- Se crean nuevas misiones diarias para todos los usuarios activos
- Si un usuario accede después de medianoche, sus misiones se reinician automáticamente
- El progreso de misiones diarias solo cuenta para el día actual

