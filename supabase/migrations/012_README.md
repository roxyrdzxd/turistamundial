# Configuración del Bucket de Sonidos

Este archivo contiene las políticas RLS para el bucket de sonidos en Supabase Storage.

## Pasos para Configurar

### 1. Crear el Bucket en Supabase Dashboard

1. Ve a tu proyecto en Supabase Dashboard
2. Navega a **Storage** en el menú lateral
3. Haz clic en **Create bucket**
4. Configura el bucket:
   - **Nombre**: `sounds`
   - **Public**: ✅ **Marcar como público** (importante para que los sonidos se carguen sin autenticación)
   - **File size limit**: 5MB (o el tamaño que prefieras)
   - **Allowed MIME types**: `audio/mpeg, audio/mp3` (opcional)

### 2. Ejecutar la Migración SQL

Ejecuta el archivo `012_create_sounds_bucket.sql` en el SQL Editor de Supabase para crear las políticas RLS.

### 3. Subir los Archivos de Sonido

Sube los siguientes archivos al bucket `sounds` (todos en formato .wav):

- `dice-roll.wav` - Sonido al tirar los dados ✅ (Ya subido)
- `buy-property.wav` - Sonido al comprar una propiedad
- `pay-toll.wav` - Sonido al pagar peaje
- `money-received.wav` - Sonido al recibir dinero (bonus de inicio, etc.)
- `card-draw.wav` - Sonido al sacar una tarjeta de suerte/destino
- `build.wav` - Sonido al construir casa/hotel
- `notification.wav` - Sonido para notificaciones generales
- `victory.wav` - Sonido de victoria/logro
- `error.wav` - Sonido de error

**Nota**: Todos los archivos deben estar en formato .wav.

### 4. Verificar las URLs

Las URLs de los sonidos seguirán este formato:
```
https://[tu-proyecto].supabase.co/storage/v1/object/public/sounds/[nombre-archivo].wav
```

Ejemplo real (ya configurado):
```
https://cgoisveithzvituzyoga.supabase.co/storage/v1/object/public/sounds/dice-roll.wav
```

El sistema automáticamente construirá estas URLs usando la variable de entorno `NEXT_PUBLIC_SUPABASE_URL`.

## Fuentes Recomendadas para Obtener Sonidos

### 1. Freesound.org (Recomendado)
- URL: https://freesound.org
- Licencia: Creative Commons (verificar atribución requerida)
- Búsquedas sugeridas:
  - "dice roll"
  - "coin drop"
  - "cash register"
  - "notification sound"
  - "card flip"
  - "construction build"
  - "victory fanfare"
  - "error beep"

### 2. Zapsplat.com
- URL: https://www.zapsplat.com
- Requiere registro gratuito
- Gran biblioteca de sonidos de alta calidad
- Licencia: Uso comercial permitido con atribución

### 3. OpenGameArt.org
- URL: https://opengameart.org
- Recursos específicos para juegos
- Varias licencias disponibles

### 4. Pixabay
- URL: https://pixabay.com/sound-effects/
- Sonidos libres de derechos
- No requiere atribución

## Recomendaciones de Duración

- Sonidos cortos (0.5-1 segundo): `dice-roll`, `notification`, `error`
- Sonidos medios (1-2 segundos): `buy-property`, `pay-toll`, `money-received`, `card-draw`
- Sonidos largos (2-4 segundos): `build`, `victory`

## Formato

- **Formato requerido**: WAV (.wav)
- **Calidad**: WAV sin compresión ofrece la mejor calidad de audio
- **Volumen**: Normalizar todos los sonidos a un volumen similar
- **Tamaño**: Mantener archivos pequeños (< 500KB cada uno) para carga rápida
- **Sample Rate**: 44.1 kHz es estándar y suficiente para sonidos de juego

## Notas

- Si no se proporcionan los archivos de sonido, el juego funcionará normalmente pero sin sonidos
- Los errores de carga de sonidos se manejan silenciosamente
- Los usuarios pueden desactivar los sonidos desde el botón de configuración en el juego
- El bucket debe ser **público** para que los sonidos se carguen correctamente

