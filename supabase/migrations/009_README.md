# Sistema de Detección de Jugadores Desconectados

Esta migración implementa un sistema para detectar y manejar jugadores desconectados en las partidas.

## Características

1. **Campos de estado de conexión**:
   - `is_online`: Indica si el jugador está online
   - `last_seen`: Última vez que el jugador hizo ping

2. **Sistema de heartbeat**:
   - Los jugadores envían un ping cada 30 segundos
   - Si un jugador no hace ping en 2 minutos, se marca como desconectado

3. **Lógica de turnos mejorada**:
   - Los turnos saltan automáticamente jugadores desconectados
   - La partida continúa sin interrupciones

4. **Indicadores visuales**:
   - Jugadores desconectados aparecen con opacidad reducida
   - Indicador rojo en la ficha del jugador desconectado

## Configuración

### 1. Ejecutar la migración SQL

Ejecuta `supabase/migrations/009_add_player_online_status.sql` en el SQL Editor de Supabase.

### 2. Configurar detección automática (Opcional)

Para marcar automáticamente jugadores desconectados, ejecuta periódicamente:

```sql
SELECT mark_disconnected_players();
```

O configura con pg_cron (cada minuto):

```sql
SELECT cron.schedule(
  'mark-disconnected-players',
  '* * * * *',  -- Cada minuto
  $$SELECT mark_disconnected_players();$$
);
```

## Funcionamiento

1. **Heartbeat**: Cuando un jugador está en la página del juego, envía un ping cada 30 segundos
2. **Detección**: Si un jugador no hace ping en 2 minutos, se marca como desconectado
3. **Turnos**: Cuando es el turno de un jugador desconectado, se salta automáticamente
4. **Reconexión**: Si el jugador vuelve, su próximo heartbeat lo marca como online nuevamente

## Notas

- Los NPCs nunca se marcan como desconectados
- El sistema funciona automáticamente sin necesidad de intervención manual
- Los jugadores pueden reconectarse en cualquier momento

