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

Sube los siguientes archivos al bucket `sounds`:

- `dice-roll.wav` - Sonido al tirar los dados ✅ (Ya subido)
- `buy-property.mp3` - Sonido al comprar una propiedad
- `pay-toll.mp3` - Sonido al pagar peaje
- `money-received.mp3` - Sonido al recibir dinero (bonus de inicio, etc.)
- `card-draw.mp3` - Sonido al sacar una tarjeta de suerte/destino
- `build.mp3` - Sonido al construir casa/hotel
- `notification.mp3` - Sonido para notificaciones generales
- `victory.mp3` - Sonido de victoria/logro
- `error.mp3` - Sonido de error

**Nota**: El sistema soporta múltiples formatos de audio (.mp3, .wav, .ogg, etc.). Puedes usar el formato que prefieras para cada sonido.

### 4. Verificar las URLs

Las URLs de los sonidos seguirán este formato:
```
https://[tu-proyecto].supabase.co/storage/v1/object/public/sounds/[nombre-archivo].[extensión]
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

- **Formatos soportados**: MP3, WAV, OGG (cualquier formato soportado por el navegador)
- **Calidad**: 
  - MP3: 128-192 kbps es suficiente para sonidos cortos
  - WAV: Sin compresión, mejor calidad pero archivos más grandes
- **Volumen**: Normalizar todos los sonidos a un volumen similar
- **Tamaño**: Mantener archivos pequeños (< 500KB cada uno) para carga rápida

## Notas

- Si no se proporcionan los archivos de sonido, el juego funcionará normalmente pero sin sonidos
- Los errores de carga de sonidos se manejan silenciosamente
- Los usuarios pueden desactivar los sonidos desde el botón de configuración en el juego
- El bucket debe ser **público** para que los sonidos se carguen correctamente

