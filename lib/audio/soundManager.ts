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
        console.warn(`No se puede cargar el sonido ${type}: URL de Supabase no configurada`)
        return
      }
      
      const audio = new Audio(url)
      audio.volume = this.volume
      audio.preload = 'auto'
      // Manejar errores silenciosamente si el archivo no existe
      audio.addEventListener('error', () => {
        console.warn(`No se pudo cargar el sonido: ${url}`)
      })
      this.sounds.set(type as SoundType, audio)
    })
  }

  play(soundType: SoundType) {
    if (!this.enabled || typeof window === 'undefined') return

    const sound = this.sounds.get(soundType)
    if (sound) {
      // Clonar el audio para permitir múltiples reproducciones simultáneas
      const audioClone = sound.cloneNode() as HTMLAudioElement
      audioClone.volume = this.volume
      audioClone.play().catch(err => {
        // Ignorar errores de reproducción (usuario no ha interactuado, etc.)
        console.warn('Error reproduciendo sonido:', err)
      })
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

