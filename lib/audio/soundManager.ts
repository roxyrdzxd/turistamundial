// Gestor de sonidos para el juego
// Los sonidos se cargarán desde Supabase Storage

export type SoundType = 
  | 'dice_roll'
  | 'buy_property'
  | 'pay_toll'
  | 'money_received'
  | 'card_draw'
  | 'build'
  | 'notification'
  | 'victory'
  | 'error'

class SoundManager {
  private sounds: Map<SoundType, HTMLAudioElement> = new Map()
  private enabled: boolean = true
  private volume: number = 0.5
  private supabaseUrl: string | null = null

  constructor() {
    // Solo inicializar en el cliente
    if (typeof window !== 'undefined') {
      // Obtener URL de Supabase desde variables de entorno
      this.supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || null
      
      if (!this.supabaseUrl) {
        console.error('[SoundManager] NEXT_PUBLIC_SUPABASE_URL no está configurada')
      } else {
        console.log('[SoundManager] Inicializando con URL:', this.supabaseUrl)
      }
      
      this.loadSounds()
      // Cargar preferencia de usuario desde localStorage
      const savedEnabled = localStorage.getItem('soundEnabled')
      if (savedEnabled !== null) {
        this.enabled = savedEnabled === 'true'
      }
      const savedVolume = localStorage.getItem('soundVolume')
      if (savedVolume !== null) {
        this.volume = parseFloat(savedVolume)
      }
      
      console.log('[SoundManager] Estado inicial:', {
        enabled: this.enabled,
        volume: this.volume,
        soundsLoaded: this.sounds.size
      })
    }
  }

  private getSoundUrl(filename: string): string {
    // Construir URL pública de Supabase Storage
    // Formato: https://[project].supabase.co/storage/v1/object/public/[bucket]/[path]
    if (!this.supabaseUrl) {
      console.warn('NEXT_PUBLIC_SUPABASE_URL no está configurada')
      return ''
    }
    
    // El bucket de sonidos debe llamarse "sounds" y ser público
    return `${this.supabaseUrl}/storage/v1/object/public/sounds/${filename}`
  }

  private loadSounds() {
    // Mapeo de sonidos a archivos en Supabase Storage
    // Nota: Los archivos deben estar en el bucket "sounds" de Supabase Storage
    // Todos los archivos usan formato .wav
    const soundFiles: Record<SoundType, string> = {
      dice_roll: 'dice-roll.wav',
      buy_property: 'buy-property.wav',
      pay_toll: 'pay-toll.wav',
      money_received: 'money-received.wav',
      card_draw: 'card-draw.wav',
      build: 'build.wav',
      notification: 'notification.wav',
      victory: 'victory.wav',
      error: 'error.wav',
    }

    Object.entries(soundFiles).forEach(([type, filename]) => {
      const url = this.getSoundUrl(filename)
      if (!url) {
        console.warn(`[SoundManager] No se puede cargar el sonido ${type}: URL de Supabase no configurada`)
        return
      }
      
      console.log(`[SoundManager] Cargando sonido ${type} desde: ${url}`)
      
      const audio = new Audio(url)
      audio.volume = this.volume
      audio.preload = 'auto'
      
      // Manejar eventos de carga
      audio.addEventListener('loadeddata', () => {
        console.log(`[SoundManager] ✅ Sonido ${type} cargado correctamente`)
      })
      
      // Manejar errores si el archivo no existe
      audio.addEventListener('error', (e) => {
        console.error(`[SoundManager] ❌ Error cargando sonido ${type}:`, {
          url,
          error: e,
          code: audio.error?.code,
          message: audio.error?.message
        })
      })
      
      // Manejar cuando el audio está listo
      audio.addEventListener('canplaythrough', () => {
        console.log(`[SoundManager] ✅ Sonido ${type} listo para reproducir`)
      })
      
      this.sounds.set(type as SoundType, audio)
    })
  }

  play(soundType: SoundType) {
    if (!this.enabled || typeof window === 'undefined') {
      console.log(`[SoundManager] Sonido ${soundType} no reproducido:`, {
        enabled: this.enabled,
        isClient: typeof window !== 'undefined'
      })
      return
    }

    const sound = this.sounds.get(soundType)
    if (!sound) {
      console.warn(`[SoundManager] Sonido ${soundType} no encontrado en el mapa`)
      return
    }
    
    console.log(`[SoundManager] Reproduciendo sonido: ${soundType}`)
    
    try {
      // Clonar el audio para permitir múltiples reproducciones simultáneas
      const audioClone = sound.cloneNode() as HTMLAudioElement
      audioClone.volume = this.volume
      
      const playPromise = audioClone.play()
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log(`[SoundManager] ✅ Sonido ${soundType} reproducido correctamente`)
          })
          .catch(err => {
            // Error común: el navegador bloquea la reproducción automática
            console.error(`[SoundManager] ❌ Error reproduciendo sonido ${soundType}:`, err)
            console.log('[SoundManager] 💡 Nota: Los navegadores bloquean audio hasta que el usuario interactúe con la página')
          })
      }
    } catch (err) {
      console.error(`[SoundManager] ❌ Excepción al reproducir sonido ${soundType}:`, err)
    }
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled
    if (typeof window !== 'undefined') {
      localStorage.setItem('soundEnabled', String(enabled))
    }
  }

  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume))
    this.sounds.forEach(sound => {
      sound.volume = this.volume
    })
    if (typeof window !== 'undefined') {
      localStorage.setItem('soundVolume', String(this.volume))
    }
  }

  isEnabled(): boolean {
    return this.enabled
  }

  getVolume(): number {
    return this.volume
  }
}

// Singleton
export const soundManager = typeof window !== 'undefined' ? new SoundManager() : null

