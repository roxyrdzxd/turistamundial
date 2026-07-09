'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { CalendarDays, Pause, Play, RotateCcw, Sparkles, Trophy, Volume2, VolumeX } from 'lucide-react'
import { getWorldCup2026Country } from '@/lib/worldCup2026Countries'
import { createClient } from '@/lib/supabase/client'

type GameStatus = 'ready' | 'playing' | 'paused' | 'gameOver'

type TacoRainSnapshot = {
  score: number
  lives: number
  combo: number
  bestCombo: number
  time: number
  level: number
  levelName: string
  levelTimeLeft: number
  hiScore: number
  catchCount: number
  phrase: string
  powerUpLabel: string
  powerUpTime: number
  shieldActive: boolean
}

type TacoRainLocalScore = {
  username?: string
  world_cup_country_code?: string | null
  score: number
  tacos: number
  combo: number
  time: number
  durationMs?: number
  powerUps?: number
  level?: number
  date: string
}

type TacoRainLeaderboardEntry = {
  rank: number
  user_id: string
  username: string
  avatar_url?: string | null
  world_cup_country_code?: string | null
  best_score: number
  games_played: number
  total_tacos: number
  best_combo: number
  last_played_at?: string | null
}

type TacoRainSeason = {
  id: string
  title: string
  status: string
  starts_at: string
  ends_at: string
}

type TacoRainAchievement = {
  id: string
  name: string
  description: string
  badge_url: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  requirement_type?: string
  requirement_value?: number
  is_unlocked?: boolean
  unlocked_at?: string | null
}

type TacoRainSaveResult = {
  rank: number
  personal_best: number
  is_personal_best: boolean
}

type OnlineStatus = 'idle' | 'saving' | 'saved' | 'auth' | 'error'

type TacoRainPlayerProfile = {
  username: string
  world_cup_country_code?: string | null
}

type TacoRainControls = {
  start: () => void
  pause: () => void
  resume: () => void
  restart: () => void
  setMuted: (muted: boolean) => void
}

const GAME_WIDTH = 390
const GAME_HEIGHT = 680
const PLAYER_Y = GAME_HEIGHT - 52
const INITIAL_LIVES = 4
const LEVEL_DURATION_MS = 90000
const HI_SCORE_KEY = 'taco-rain-hi-score'
const LOCAL_RANKING_KEY = 'taco-rain-local-ranking'
const TACO_RAIN_THEME_URL = 'https://cgoisveithzvituzyoga.supabase.co/storage/v1/object/public/sounds/la%20lluvia%20del%20taco.mp3'
const TACO_RAIN_MUSIC_BASE_URL = 'https://cgoisveithzvituzyoga.supabase.co/storage/v1/object/public/sounds'
const TACO_ASSET_BASE_URL = 'https://cgoisveithzvituzyoga.supabase.co/storage/v1/object/public/tacos'
const TACO_ASSETS = {
  background: `${TACO_ASSET_BASE_URL}/bg-city.png`,
  taco: `${TACO_ASSET_BASE_URL}/taco.png`,
  goldTaco: `${TACO_ASSET_BASE_URL}/golden-taco.png`,
  chile: `${TACO_ASSET_BASE_URL}/chilli.png`,
  basket: `${TACO_ASSET_BASE_URL}/player%20(1).png`,
  shieldPower: `${TACO_ASSET_BASE_URL}/shield-power.png`,
  slowPower: `${TACO_ASSET_BASE_URL}/slow-power.png`,
  doublePower: `${TACO_ASSET_BASE_URL}/double-power.png`,
  lime: `${TACO_ASSET_BASE_URL}/lime.png`,
  megaTaco: `${TACO_ASSET_BASE_URL}/megataco.png`,
  redSalsa: `${TACO_ASSET_BASE_URL}/salsaroja.png`,
  soda: `${TACO_ASSET_BASE_URL}/soda.png`,
  rainbowTaco: `${TACO_ASSET_BASE_URL}/tacoarcoiris.png`,
  trompo: `${TACO_ASSET_BASE_URL}/trompoalpastor.png`,
}

const TACO_RAIN_LEVELS = [
  {
    name: 'Taquería Neon',
    background: `${TACO_ASSET_BASE_URL}/level-1-bg.png`,
    music: `${TACO_RAIN_MUSIC_BASE_URL}/level-1-music.mp3`,
    spawnDelay: 620,
    minFallSpeed: 165,
    maxFallSpeed: 255,
    chileRate: 12,
    goldRate: 8,
    specialRate: 4,
    specials: ['lime', 'soda'] as const,
  },
  {
    name: 'Mercado Nocturno',
    background: `${TACO_ASSET_BASE_URL}/level-2-bg.png`,
    music: `${TACO_RAIN_MUSIC_BASE_URL}/level-2-music.mp3`,
    spawnDelay: 520,
    minFallSpeed: 190,
    maxFallSpeed: 290,
    chileRate: 16,
    goldRate: 9,
    specialRate: 7,
    specials: ['lime', 'soda', 'trompo'] as const,
  },
  {
    name: 'Volcán de Salsa',
    background: `${TACO_ASSET_BASE_URL}/level-3-bg.png`,
    music: `${TACO_RAIN_MUSIC_BASE_URL}/level-3-music.mp3`,
    spawnDelay: 455,
    minFallSpeed: 220,
    maxFallSpeed: 330,
    chileRate: 20,
    goldRate: 8,
    specialRate: 9,
    specials: ['redSalsa', 'lime', 'megaTaco'] as const,
  },
  {
    name: 'Fiesta Dorada',
    background: `${TACO_ASSET_BASE_URL}/level-4-bg.png`,
    music: `${TACO_RAIN_MUSIC_BASE_URL}/level-4-music.mp3`,
    spawnDelay: 405,
    minFallSpeed: 245,
    maxFallSpeed: 365,
    chileRate: 22,
    goldRate: 12,
    specialRate: 10,
    specials: ['rainbowTaco', 'trompo', 'redSalsa'] as const,
  },
  {
    name: 'Tormenta Taquera',
    background: `${TACO_ASSET_BASE_URL}/level-5-bg.png`,
    music: `${TACO_RAIN_MUSIC_BASE_URL}/level-5-music.mp3`,
    spawnDelay: 360,
    minFallSpeed: 270,
    maxFallSpeed: 405,
    chileRate: 26,
    goldRate: 11,
    specialRate: 13,
    specials: ['megaTaco', 'rainbowTaco', 'redSalsa', 'soda'] as const,
  },
]

const initialSnapshot: TacoRainSnapshot = {
  score: 0,
  lives: INITIAL_LIVES,
  combo: 0,
  bestCombo: 0,
  time: 0,
  level: 1,
  levelName: TACO_RAIN_LEVELS[0].name,
  levelTimeLeft: 90,
  hiScore: 0,
  catchCount: 0,
  phrase: '¡Modo taquiza listo!',
  powerUpLabel: '',
  powerUpTime: 0,
  shieldActive: false,
}

function getStoredLocalRanking(): TacoRainLocalScore[] {
  if (typeof window === 'undefined') return []

  try {
    const storedValue = window.localStorage.getItem(LOCAL_RANKING_KEY)
    const parsedValue = storedValue ? JSON.parse(storedValue) : []
    return Array.isArray(parsedValue) ? parsedValue.slice(0, 5) : []
  } catch {
    return []
  }
}

function saveLocalScore(scoreEntry: TacoRainLocalScore) {
  const nextRanking = [...getStoredLocalRanking(), scoreEntry]
    .sort((a, b) => b.score - a.score || b.combo - a.combo || b.tacos - a.tacos)
    .slice(0, 5)

  window.localStorage.setItem(LOCAL_RANKING_KEY, JSON.stringify(nextRanking))
  return nextRanking
}

export default function TacoRainGame() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const controlsRef = useRef<TacoRainControls | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const musicRef = useRef<HTMLAudioElement | null>(null)
  const musicUrlRef = useRef(TACO_RAIN_THEME_URL)
  const mutedRef = useRef(false)
  const playerProfileRef = useRef<TacoRainPlayerProfile>({ username: 'Jugador local', world_cup_country_code: null })
  const submitOnlineScoreRef = useRef<(scoreEntry: TacoRainLocalScore) => void>(() => {})
  const [status, setStatus] = useState<GameStatus>('ready')
  const [snapshot, setSnapshot] = useState<TacoRainSnapshot>(initialSnapshot)
  const [localRanking, setLocalRanking] = useState<TacoRainLocalScore[]>([])
  const [onlineRanking, setOnlineRanking] = useState<TacoRainLeaderboardEntry[]>([])
  const [seasonRanking, setSeasonRanking] = useState<TacoRainLeaderboardEntry[]>([])
  const [season, setSeason] = useState<TacoRainSeason | null>(null)
  const [achievements, setAchievements] = useState<TacoRainAchievement[]>([])
  const [newAchievements, setNewAchievements] = useState<TacoRainAchievement[]>([])
  const [saveResult, setSaveResult] = useState<TacoRainSaveResult | null>(null)
  const [onlineStatus, setOnlineStatus] = useState<OnlineStatus>('idle')
  const [onlineError, setOnlineError] = useState<string | null>(null)
  const [muted, setMuted] = useState(false)

  const fetchLeaderboard = useCallback(async () => {
    try {
      const response = await fetch('/api/taco-rain/leaderboard?limit=10')
      const data = await response.json()
      if (response.ok) {
        setOnlineRanking(data.leaderboard || [])
      }
    } catch (error) {
      console.warn('[TacoRain] No se pudo cargar el ranking global:', error)
    }
  }, [])

  const fetchSeason = useCallback(async () => {
    try {
      const response = await fetch('/api/taco-rain/season')
      const data = await response.json()
      if (response.ok) {
        setSeason(data.season || null)
        setSeasonRanking(data.leaderboard || [])
      }
    } catch (error) {
      console.warn('[TacoRain] No se pudo cargar la temporada:', error)
    }
  }, [])

  const fetchAchievements = useCallback(async () => {
    try {
      const response = await fetch('/api/taco-rain/achievements')
      const data = await response.json()
      if (response.ok) {
        setAchievements(data.achievements || [])
      }
    } catch (error) {
      console.warn('[TacoRain] No se pudieron cargar los logros:', error)
    }
  }, [])

  const submitOnlineScore = useCallback(async (scoreEntry: TacoRainLocalScore) => {
    setOnlineStatus('saving')
    setOnlineError(null)
    setSaveResult(null)
    setNewAchievements([])

    try {
      const response = await fetch('/api/taco-rain/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          score: scoreEntry.score,
          durationMs: scoreEntry.durationMs ?? scoreEntry.time * 1000,
          tacosCaught: scoreEntry.tacos,
          bestCombo: scoreEntry.combo,
          metadata: {
            arcade: 'taco-rain',
            localDate: scoreEntry.date,
            powerUps: scoreEntry.powerUps || 0,
            level: scoreEntry.level || 1,
          },
        }),
      })
      const data = await response.json().catch(() => ({}))

      if (response.status === 401) {
        setOnlineStatus('auth')
        setOnlineError('Inicia sesion para guardar tu taquiza online.')
        return
      }

      if (!response.ok) {
        throw new Error(data.error || 'No se pudo guardar el puntaje online.')
      }

      setSaveResult(data.result || null)
      const unlockedAchievements = (data.achievements || []) as TacoRainAchievement[]
      if (unlockedAchievements.length > 0) {
        setNewAchievements(unlockedAchievements)
        window.setTimeout(() => setNewAchievements([]), 5200)
      }
      setOnlineStatus('saved')
      await Promise.all([fetchLeaderboard(), fetchSeason(), fetchAchievements()])
    } catch (error: any) {
      console.error('[TacoRain] Error guardando puntaje online:', error)
      setOnlineStatus('error')
      setOnlineError(error.message || 'No se pudo guardar el puntaje online.')
    }
  }, [fetchAchievements, fetchLeaderboard, fetchSeason])

  useEffect(() => {
    const storedHiScore = Number(window.localStorage.getItem(HI_SCORE_KEY) || 0)
    const storedRanking = getStoredLocalRanking()
    setSnapshot((current) => ({ ...current, hiScore: storedHiScore }))
    setLocalRanking(storedRanking)
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadPlayerProfile() {
      try {
        const supabase = createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user || cancelled) return

        const { data: profile } = await supabase
          .from('profiles')
          .select('username, world_cup_country_code')
          .eq('id', user.id)
          .single()

        if (cancelled) return

        playerProfileRef.current = {
          username: profile?.username || user.user_metadata?.username || 'Jugador local',
          world_cup_country_code: profile?.world_cup_country_code || null,
        }

        setLocalRanking((currentRanking) => {
          const updatedRanking = currentRanking.map((entry) => ({
            ...entry,
            username: entry.username || playerProfileRef.current.username,
            world_cup_country_code: entry.world_cup_country_code || playerProfileRef.current.world_cup_country_code,
          }))
          window.localStorage.setItem(LOCAL_RANKING_KEY, JSON.stringify(updatedRanking))
          return updatedRanking
        })
      } catch (error) {
        console.warn('[TacoRain] No se pudo cargar el perfil local:', error)
      }
    }

    loadPlayerProfile()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    submitOnlineScoreRef.current = submitOnlineScore
  }, [submitOnlineScore])

  useEffect(() => {
    fetchLeaderboard()
    fetchSeason()
    fetchAchievements()
  }, [fetchAchievements, fetchLeaderboard, fetchSeason])

  useEffect(() => {
    mutedRef.current = muted
    if (musicRef.current) {
      musicRef.current.muted = muted
      if (muted) {
        musicRef.current.pause()
      } else if (status === 'playing') {
        musicRef.current.play().catch((error) => {
          console.warn('[TacoRain] No se pudo reanudar la musica:', error)
        })
      }
    }
    controlsRef.current?.setMuted(muted)
  }, [muted, status])

  useEffect(() => {
    let game: any
    let destroyed = false

    const ensureMusic = (url = musicUrlRef.current) => {
      if (typeof window === 'undefined') return null

      const targetUrl = new URL(url, window.location.href).href
      if (!musicRef.current || musicRef.current.src !== targetUrl) {
        musicRef.current?.pause()
        const music = new Audio(url)
        music.loop = true
        music.volume = 0.38
        music.preload = 'auto'
        music.muted = mutedRef.current
        musicRef.current = music
      }

      return musicRef.current
    }

    const playMusic = (url = musicUrlRef.current) => {
      if (mutedRef.current) return

      const music = ensureMusic(url)
      music?.play().catch((error) => {
        console.warn('[TacoRain] El navegador bloqueo la musica hasta una interaccion:', error)
      })
    }

    const setMusicTrack = (url: string) => {
      musicUrlRef.current = url
      const music = ensureMusic(url)
      if (!mutedRef.current && music && controlsRef.current) {
        music.play().catch((error) => {
          console.warn('[TacoRain] No se pudo cambiar la musica del nivel:', error)
        })
      }
    }

    const pauseMusic = () => {
      musicRef.current?.pause()
    }

    const stopMusic = () => {
      if (!musicRef.current) return
      musicRef.current.pause()
      musicRef.current.currentTime = 0
    }

    const playTone = (frequency: number, duration = 0.08, type: OscillatorType = 'square', gainValue = 0.035) => {
      if (mutedRef.current || typeof window === 'undefined') return

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioContextClass) return

      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContextClass()
      }

      const audioContext = audioContextRef.current
      const oscillator = audioContext.createOscillator()
      const gain = audioContext.createGain()
      oscillator.type = type
      oscillator.frequency.value = frequency
      gain.gain.value = gainValue
      oscillator.connect(gain)
      gain.connect(audioContext.destination)
      oscillator.start()
      oscillator.stop(audioContext.currentTime + duration)
    }

    const boot = async () => {
      const Phaser = await import('phaser')
      if (destroyed || !containerRef.current) return

      class TacoRainScene extends Phaser.Scene {
        player!: any
        tacos!: any
        cursors!: any
        keys!: any
        score = 0
        lives = INITIAL_LIVES
        combo = 0
        bestCombo = 0
        catchCount = 0
        startedAt = 0
        levelStartedAt = 0
        currentLevelIndex = 0
        spawnDelay = 850
        nextSpawnAt = 0
        nextChileAt = 9000
        speedBoostAt = 0
        shieldActiveUntil = 0
        slowActiveUntil = 0
        doubleActiveUntil = 0
        rainbowActiveUntil = 0
        powerUpsUsed = 0
        backgroundImage: any = null
        gameStatus: GameStatus = 'ready'
        currentPhrase = '¡Modo taquiza listo!'
        hiScore = Number(window.localStorage.getItem(HI_SCORE_KEY) || 0)

        constructor() {
          super('TacoRainScene')
        }

        preload() {
          this.load.image('assetBackground', TACO_ASSETS.background)
          this.load.image('assetTaco', TACO_ASSETS.taco)
          this.load.image('assetGoldTaco', TACO_ASSETS.goldTaco)
          this.load.image('assetChile', TACO_ASSETS.chile)
          this.load.image('assetBasket', TACO_ASSETS.basket)
          this.load.image('assetShieldPower', TACO_ASSETS.shieldPower)
          this.load.image('assetSlowPower', TACO_ASSETS.slowPower)
          this.load.image('assetDoublePower', TACO_ASSETS.doublePower)
          this.load.image('assetLime', TACO_ASSETS.lime)
          this.load.image('assetMegaTaco', TACO_ASSETS.megaTaco)
          this.load.image('assetRedSalsa', TACO_ASSETS.redSalsa)
          this.load.image('assetSoda', TACO_ASSETS.soda)
          this.load.image('assetRainbowTaco', TACO_ASSETS.rainbowTaco)
          this.load.image('assetTrompo', TACO_ASSETS.trompo)
          TACO_RAIN_LEVELS.forEach((level, index) => {
            this.load.image(`assetLevelBackground${index + 1}`, level.background)
          })
        }

        create() {
          this.createTextures()
          this.drawNeonCity()
          this.setLevelBackground(0, false)

          this.tacos = this.physics.add.group()
          this.player = this.physics.add.sprite(GAME_WIDTH / 2, PLAYER_Y, this.getTextureKey('assetBasket', 'basket'))
          this.player.setDisplaySize(96, 72)
          this.player.setCollideWorldBounds(true)
          this.player.body.setSize(78, 34)

          this.cursors = this.input.keyboard?.createCursorKeys()
          this.keys = this.input.keyboard?.addKeys('A,D,SPACE,ENTER')
          this.input.on('pointermove', (pointer: any) => {
            if (this.gameStatus !== 'playing') return
            this.player.x = Phaser.Math.Clamp(pointer.x, 42, GAME_WIDTH - 42)
          })
          this.input.on('pointerdown', (pointer: any) => {
            if (this.gameStatus !== 'playing') return
            this.player.x = Phaser.Math.Clamp(pointer.x, 42, GAME_WIDTH - 42)
          })

          controlsRef.current = {
            start: () => this.startRound(),
            pause: () => this.pauseRound(),
            resume: () => this.resumeRound(),
            restart: () => this.startRound(),
            setMuted: (nextMuted) => {
              mutedRef.current = nextMuted
              if (musicRef.current) {
                musicRef.current.muted = nextMuted
              }
            },
          }

          this.publish()
        }

        getTextureKey(assetKey: string, fallbackKey: string) {
          return this.textures.exists(assetKey) ? assetKey : fallbackKey
        }

        createTextures() {
          const taco = this.add.graphics()
          taco.fillStyle(0xffd84d, 1)
          taco.fillEllipse(28, 24, 50, 30)
          taco.fillStyle(0x111827, 1)
          taco.fillRect(5, 24, 46, 16)
          taco.fillStyle(0x22c55e, 1)
          taco.fillCircle(18, 20, 4)
          taco.fillCircle(34, 18, 4)
          taco.fillStyle(0xef4444, 1)
          taco.fillCircle(26, 19, 3)
          taco.lineStyle(3, 0x7c2d12, 1)
          taco.strokeEllipse(28, 24, 50, 30)
          taco.generateTexture('taco', 56, 44)
          taco.destroy()

          const gold = this.add.graphics()
          gold.fillStyle(0xfacc15, 1)
          gold.fillEllipse(28, 24, 52, 32)
          gold.lineStyle(4, 0xffffff, 0.65)
          gold.strokeEllipse(28, 24, 52, 32)
          gold.fillStyle(0x22c55e, 1)
          gold.fillCircle(18, 20, 4)
          gold.fillCircle(36, 18, 4)
          gold.generateTexture('goldTaco', 56, 44)
          gold.destroy()

          const chile = this.add.graphics()
          chile.fillStyle(0xef4444, 1)
          chile.fillEllipse(18, 25, 18, 42)
          chile.fillStyle(0x22c55e, 1)
          chile.fillRect(15, 2, 8, 14)
          chile.lineStyle(3, 0x7f1d1d, 1)
          chile.strokeEllipse(18, 25, 18, 42)
          chile.generateTexture('chile', 36, 52)
          chile.destroy()

          const basket = this.add.graphics()
          basket.fillStyle(0x92400e, 1)
          basket.fillRoundedRect(0, 14, 86, 36, 12)
          basket.fillStyle(0xf59e0b, 1)
          basket.fillRoundedRect(9, 6, 68, 16, 8)
          basket.lineStyle(3, 0xfef3c7, 0.65)
          basket.strokeRoundedRect(0, 14, 86, 36, 12)
          basket.generateTexture('basket', 86, 54)
          basket.destroy()

          const shield = this.add.graphics()
          shield.fillStyle(0x22d3ee, 0.95)
          shield.fillCircle(28, 28, 24)
          shield.lineStyle(5, 0xf0f9ff, 0.9)
          shield.strokeCircle(28, 28, 22)
          shield.fillStyle(0x0f172a, 0.92)
          shield.fillTriangle(28, 14, 43, 25, 36, 43)
          shield.fillTriangle(28, 14, 13, 25, 20, 43)
          shield.generateTexture('shieldPower', 56, 56)
          shield.destroy()

          const slow = this.add.graphics()
          slow.fillStyle(0xa78bfa, 0.95)
          slow.fillCircle(28, 28, 24)
          slow.lineStyle(4, 0xffffff, 0.85)
          slow.strokeCircle(28, 28, 18)
          slow.lineStyle(4, 0xffffff, 0.95)
          slow.beginPath()
          slow.moveTo(28, 28)
          slow.lineTo(28, 16)
          slow.moveTo(28, 28)
          slow.lineTo(39, 32)
          slow.strokePath()
          slow.generateTexture('slowPower', 56, 56)
          slow.destroy()

          const double = this.add.graphics()
          double.fillStyle(0xfacc15, 1)
          double.fillRoundedRect(4, 8, 48, 40, 12)
          double.lineStyle(4, 0xffffff, 0.75)
          double.strokeRoundedRect(4, 8, 48, 40, 12)
          double.generateTexture('doublePower', 56, 56)
          double.destroy()

          const lime = this.add.graphics()
          lime.fillStyle(0x84cc16, 1)
          lime.slice(28, 28, 24, Phaser.Math.DegToRad(205), Phaser.Math.DegToRad(335), false)
          lime.fillPath()
          lime.lineStyle(4, 0xecfccb, 0.9)
          lime.strokeCircle(28, 28, 22)
          lime.generateTexture('limeBonus', 56, 56)
          lime.destroy()

          const soda = this.add.graphics()
          soda.fillStyle(0x38bdf8, 1)
          soda.fillRoundedRect(18, 8, 20, 40, 7)
          soda.fillStyle(0xffffff, 0.9)
          soda.fillCircle(28, 30, 8)
          soda.fillStyle(0xef4444, 1)
          soda.fillCircle(28, 30, 4)
          soda.generateTexture('sodaBonus', 56, 56)
          soda.destroy()

          const redSalsa = this.add.graphics()
          redSalsa.fillStyle(0xdc2626, 1)
          redSalsa.fillCircle(28, 30, 20)
          redSalsa.fillStyle(0xfef2f2, 0.95)
          redSalsa.fillCircle(21, 24, 4)
          redSalsa.fillCircle(35, 24, 4)
          redSalsa.lineStyle(4, 0x7f1d1d, 1)
          redSalsa.strokeCircle(28, 30, 20)
          redSalsa.generateTexture('redSalsa', 56, 56)
          redSalsa.destroy()

          const mega = this.add.graphics()
          mega.fillStyle(0xfacc15, 1)
          mega.fillEllipse(32, 28, 64, 42)
          mega.lineStyle(5, 0xffffff, 0.65)
          mega.strokeEllipse(32, 28, 60, 38)
          mega.generateTexture('megaTaco', 68, 58)
          mega.destroy()

          const rainbow = this.add.graphics()
          rainbow.fillStyle(0xfef08a, 1)
          rainbow.fillEllipse(30, 30, 58, 36)
          rainbow.lineStyle(4, 0xf472b6, 0.9)
          rainbow.strokeEllipse(30, 30, 58, 36)
          rainbow.lineStyle(3, 0x22d3ee, 0.9)
          rainbow.strokeEllipse(30, 30, 44, 24)
          rainbow.generateTexture('rainbowTaco', 62, 56)
          rainbow.destroy()

          const trompo = this.add.graphics()
          trompo.fillStyle(0xf97316, 1)
          trompo.fillEllipse(28, 30, 34, 48)
          trompo.fillStyle(0xfacc15, 1)
          trompo.fillCircle(28, 8, 7)
          trompo.lineStyle(4, 0x7c2d12, 0.95)
          trompo.strokeEllipse(28, 30, 34, 48)
          trompo.generateTexture('trompo', 56, 60)
          trompo.destroy()
        }

        drawNeonCity() {
          this.cameras.main.setBackgroundColor('#09031c')

          if (this.textures.exists('assetBackground')) {
            const background = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'assetBackground')
            background.setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
            background.setDepth(-20)
          }

          const sky = this.add.graphics()
          sky.setDepth(this.textures.exists('assetBackground') ? -18 : -20)
          sky.setAlpha(this.textures.exists('assetBackground') ? 0.28 : 1)
          sky.fillGradientStyle(0x07111f, 0x12043a, 0x050816, 0x250052, 1)
          sky.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)

          for (let i = 0; i < 80; i += 1) {
            const x = Phaser.Math.Between(0, GAME_WIDTH)
            const y = Phaser.Math.Between(28, GAME_HEIGHT - 120)
            const color = Phaser.Math.RND.pick([0x22d3ee, 0xf0abfc, 0xfacc15, 0xa3e635])
            const drop = this.add.rectangle(x, y, 2, Phaser.Math.Between(14, 42), color, 0.35)
            drop.setAngle(12)
            this.tweens.add({
              targets: drop,
              y: y + 90,
              alpha: 0.05,
              duration: Phaser.Math.Between(900, 1600),
              repeat: -1,
              yoyo: false,
            })
          }

          const clouds = this.add.graphics()
          clouds.setDepth(-8)
          clouds.fillStyle(0x2e1065, 0.95)
          clouds.fillEllipse(66, 68, 120, 54)
          clouds.fillEllipse(140, 48, 110, 46)
          clouds.fillEllipse(290, 62, 150, 58)
          clouds.lineStyle(4, 0xd946ef, 0.65)
          clouds.strokeEllipse(66, 68, 120, 54)
          clouds.strokeEllipse(290, 62, 150, 58)

          const bolt = this.add.graphics()
          bolt.setDepth(-7)
          bolt.lineStyle(4, 0x67e8f9, 0.8)
          bolt.beginPath()
          bolt.moveTo(92, 84)
          bolt.lineTo(74, 136)
          bolt.lineTo(96, 130)
          bolt.lineTo(72, 196)
          bolt.strokePath()
          this.tweens.add({ targets: bolt, alpha: 0.25, duration: 500, yoyo: true, repeat: -1 })

          for (let i = 0; i < 12; i += 1) {
            const width = Phaser.Math.Between(22, 46)
            const height = Phaser.Math.Between(72, 150)
            const x = i * 36
            const y = GAME_HEIGHT - 58 - height
            const building = this.add.rectangle(x + width / 2, y + height / 2, width, height, 0x0f172a, 0.95)
            building.setDepth(-6)
            building.setStrokeStyle(2, Phaser.Math.RND.pick([0x22d3ee, 0xec4899, 0xa855f7]), 0.45)

            for (let wy = y + 12; wy < y + height - 8; wy += 18) {
              for (let wx = x + 8; wx < x + width - 6; wx += 13) {
                this.add.rectangle(wx, wy, 5, 7, Phaser.Math.RND.pick([0xfacc15, 0x22d3ee, 0xf472b6]), 0.55).setDepth(-5)
              }
            }
          }

          this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - 28, GAME_WIDTH, 56, 0x020617, 0.94).setDepth(-4)
          this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - 56, GAME_WIDTH, 4, 0x22d3ee, 0.8).setDepth(-3)
        }

        setLevelBackground(levelIndex: number, animate = true) {
          const textureKey = this.getTextureKey(`assetLevelBackground${levelIndex + 1}`, 'assetBackground')
          if (!this.textures.exists(textureKey)) return

          const nextBackground = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, textureKey)
          nextBackground.setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
          nextBackground.setDepth(-19)
          nextBackground.setAlpha(animate ? 0 : 1)

          if (animate) {
            this.tweens.add({
              targets: nextBackground,
              alpha: 1,
              duration: 500,
              ease: 'Sine.easeOut',
            })
          }

          const previousBackground = this.backgroundImage
          this.backgroundImage = nextBackground

          if (previousBackground) {
            this.tweens.add({
              targets: previousBackground,
              alpha: 0,
              duration: animate ? 500 : 0,
              onComplete: () => previousBackground.destroy(),
            })
          }
        }

        startRound() {
          this.tacos.clear(true, true)
          this.score = 0
          this.lives = INITIAL_LIVES
          this.combo = 0
          this.bestCombo = 0
          this.catchCount = 0
          this.currentLevelIndex = 0
          this.spawnDelay = TACO_RAIN_LEVELS[0].spawnDelay
          this.startedAt = this.time.now
          this.levelStartedAt = this.time.now
          this.nextSpawnAt = this.time.now + 500
          this.nextChileAt = this.time.now + 9000
          this.speedBoostAt = this.time.now + 14000
          this.shieldActiveUntil = 0
          this.slowActiveUntil = 0
          this.doubleActiveUntil = 0
          this.rainbowActiveUntil = 0
          this.powerUpsUsed = 0
          this.setLevelBackground(0)
          this.currentPhrase = `Nivel 1: ${TACO_RAIN_LEVELS[0].name}`
          this.gameStatus = 'playing'
          this.scene.resume()
          this.physics.resume()
          setStatus('playing')
          this.publish()
          setMusicTrack(TACO_RAIN_LEVELS[0].music)
          playTone(220, 0.08, 'square', 0.04)
          playTone(440, 0.12, 'square', 0.03)
        }

        pauseRound() {
          if (this.gameStatus !== 'playing') return
          this.gameStatus = 'paused'
          setStatus('paused')
          this.physics.pause()
          pauseMusic()
          this.publish()
        }

        resumeRound() {
          if (this.gameStatus !== 'paused') return
          this.gameStatus = 'playing'
          setStatus('playing')
          this.physics.resume()
          playMusic()
          this.publish()
        }

        update(_time: number, delta: number) {
          if (this.gameStatus !== 'playing') return

          this.updateLevelProgress()
          if (this.gameStatus !== 'playing') return

          const leftDown = this.cursors?.left?.isDown || this.keys?.A?.isDown
          const rightDown = this.cursors?.right?.isDown || this.keys?.D?.isDown
          const velocity = leftDown ? -330 : rightDown ? 330 : 0
          this.player.setVelocityX(velocity)

          if (this.time.now >= this.nextSpawnAt) {
            this.spawnItem()
            this.nextSpawnAt = this.time.now + this.spawnDelay
          }

          this.tacos.getChildren().forEach((item: any) => {
            if (!item?.active) return

            const fallSpeed = item.getData('fallSpeed') || 180
            const slowMultiplier = this.time.now < this.slowActiveUntil ? 0.55 : 1
            item.y += fallSpeed * slowMultiplier * (delta / 1000)

            if (Phaser.Geom.Intersects.RectangleToRectangle(this.player.getBounds(), item.getBounds())) {
              this.collectItem(item)
              return
            }

            if (item.y > GAME_HEIGHT + 48) {
              const kind = item.getData('kind')
              item.destroy()
              if (!['chile', 'redSalsa', 'lime', 'soda'].includes(kind)) {
                this.combo = 0
                this.flashPhrase('¡Se escapó un taco!')
                this.publish()
              }
            }
          })

          if (this.keys?.SPACE?.isDown) this.pauseRound()
          this.publishThrottled(delta)
        }

        updateLevelProgress() {
          const levelElapsed = this.time.now - this.levelStartedAt
          if (levelElapsed < LEVEL_DURATION_MS) return

          if (this.currentLevelIndex >= TACO_RAIN_LEVELS.length - 1) {
            this.endRound()
            return
          }

          this.currentLevelIndex += 1
          this.levelStartedAt = this.time.now
          const level = this.getCurrentLevel()
          this.spawnDelay = level.spawnDelay
          this.setLevelBackground(this.currentLevelIndex)
          setMusicTrack(level.music)
          this.flashPhrase(`Nivel ${this.currentLevelIndex + 1}: ${level.name}`)
          this.cameras.main.flash(260, 34, 211, 238, false)
          playTone(520, 0.08, 'square', 0.035)
          playTone(780, 0.1, 'square', 0.032)
          this.publish()
        }

        getCurrentLevel() {
          return TACO_RAIN_LEVELS[this.currentLevelIndex] || TACO_RAIN_LEVELS[0]
        }

        spawnItem() {
          const elapsed = this.time.now - this.startedAt
          const level = this.getCurrentLevel()
          const canSpawnChile = elapsed > 7000
          const canSpawnPowerUp = elapsed > 10000
          const roll = Phaser.Math.Between(1, 100)
          const specialStart = level.chileRate + 1
          const specialEnd = level.chileRate + level.specialRate
          const goldStart = 100 - level.goldRate + 1
          const kind = canSpawnChile && roll <= level.chileRate
            ? 'chile'
            : canSpawnPowerUp && roll >= specialStart && roll <= specialEnd
              ? Phaser.Math.RND.pick([...level.specials])
              : canSpawnPowerUp && roll >= 78 && roll <= 84
              ? Phaser.Math.RND.pick(['shield', 'slow', 'double'])
              : roll >= goldStart ? 'gold' : 'taco'
          const texture = kind === 'chile'
            ? this.getTextureKey('assetChile', 'chile')
            : kind === 'shield'
              ? this.getTextureKey('assetShieldPower', 'shieldPower')
              : kind === 'slow'
                ? this.getTextureKey('assetSlowPower', 'slowPower')
                : kind === 'double'
                  ? this.getTextureKey('assetDoublePower', 'doublePower')
                  : kind === 'lime'
                    ? this.getTextureKey('assetLime', 'limeBonus')
                    : kind === 'soda'
                      ? this.getTextureKey('assetSoda', 'sodaBonus')
                      : kind === 'redSalsa'
                        ? this.getTextureKey('assetRedSalsa', 'redSalsa')
                        : kind === 'megaTaco'
                          ? this.getTextureKey('assetMegaTaco', 'megaTaco')
                          : kind === 'rainbowTaco'
                            ? this.getTextureKey('assetRainbowTaco', 'rainbowTaco')
                            : kind === 'trompo'
                              ? this.getTextureKey('assetTrompo', 'trompo')
            : kind === 'gold'
              ? this.getTextureKey('assetGoldTaco', 'goldTaco')
              : this.getTextureKey('assetTaco', 'taco')
          const x = Phaser.Math.Between(32, GAME_WIDTH - 32)
          const item = this.physics.add.sprite(x, -36, texture)
          const fallSpeed = Phaser.Math.Between(level.minFallSpeed, level.maxFallSpeed)
          if (kind === 'chile') {
            item.setDisplaySize(36, 52)
          } else if (kind === 'shield' || kind === 'slow' || kind === 'double') {
            item.setDisplaySize(48, 48)
          } else if (kind === 'lime' || kind === 'soda' || kind === 'redSalsa') {
            item.setDisplaySize(48, 48)
          } else if (kind === 'megaTaco') {
            item.setDisplaySize(74, 60)
          } else if (kind === 'rainbowTaco' || kind === 'trompo') {
            item.setDisplaySize(60, 56)
          } else if (kind === 'gold') {
            item.setDisplaySize(62, 48)
          } else {
            item.setDisplaySize(56, 44)
          }
          item.setData('kind', kind)
          item.setData('fallSpeed', fallSpeed)
          item.setDepth(8)
          item.body?.setAllowGravity?.(false)
          item.setVelocityY(0)
          item.setAngularVelocity(kind === 'chile' ? 80 : Phaser.Math.Between(-80, 80))
          this.tacos.add(item)
        }

        burstAt(x: number, y: number, color: number, label: string) {
          const text = this.add.text(x, y - 16, label, {
            fontFamily: 'Arial Black, Arial, sans-serif',
            fontSize: '18px',
            color: '#ffffff',
            stroke: '#020617',
            strokeThickness: 4,
          })
          text.setOrigin(0.5)
          text.setDepth(18)

          this.tweens.add({
            targets: text,
            y: y - 58,
            alpha: 0,
            scale: 1.22,
            duration: 720,
            ease: 'Cubic.easeOut',
            onComplete: () => text.destroy(),
          })

          for (let index = 0; index < 12; index += 1) {
            const angle = (Math.PI * 2 * index) / 12
            const particle = this.add.circle(x, y, index % 3 === 0 ? 3 : 2, color, 0.95)
            particle.setDepth(16)
            this.tweens.add({
              targets: particle,
              x: x + Math.cos(angle) * Phaser.Math.Between(18, 46),
              y: y + Math.sin(angle) * Phaser.Math.Between(18, 46),
              alpha: 0,
              scale: 0.2,
              duration: 520,
              ease: 'Cubic.easeOut',
              onComplete: () => particle.destroy(),
            })
          }
        }

        spicyHitEffect(x: number, y: number) {
          const flash = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0xef4444, 0.2)
          flash.setDepth(14)
          this.tweens.add({
            targets: flash,
            alpha: 0,
            duration: 180,
            onComplete: () => flash.destroy(),
          })
          this.burstAt(x, y, 0xef4444, '-1 vida')
        }

        collectItem(item: any) {
          if (!item?.active) return

          const kind = item.getData('kind')
          const itemX = item.x
          const itemY = item.y
          item.destroy()

          if (kind === 'chile') {
            if (this.time.now < this.shieldActiveUntil) {
              this.shieldActiveUntil = 0
              this.cameras.main.flash(120, 34, 211, 238, false)
              this.burstAt(itemX, itemY, 0x22d3ee, 'Escudo')
              this.flashPhrase('¡Escudo bloqueó el chile!')
              playTone(660, 0.09, 'triangle', 0.04)
              this.publish()
              return
            }

            this.lives -= 1
            this.combo = 0
            this.cameras.main.shake(130, 0.009)
            this.spicyHitEffect(itemX, itemY)
            this.flashPhrase('¡Cuidado con el chile!')
            playTone(110, 0.12, 'sawtooth', 0.045)
            if (this.lives <= 0) {
              this.endRound()
              return
            }
            this.publish()
            return
          }

          if (kind === 'shield' || kind === 'slow' || kind === 'double') {
            this.activatePowerUp(kind, itemX, itemY)
            return
          }

          if (kind === 'redSalsa') {
            this.combo = 0
            this.lives -= 1
            this.cameras.main.shake(160, 0.012)
            this.spicyHitEffect(itemX, itemY)
            this.flashPhrase('¡Salsa roja! Combo perdido')
            playTone(90, 0.14, 'sawtooth', 0.048)
            if (this.lives <= 0) {
              this.endRound()
              return
            }
            this.publish()
            return
          }

          if (kind === 'lime') {
            this.clearDangerItems(itemX, itemY)
            this.flashPhrase('¡Limón salvador!')
            playTone(700, 0.1, 'triangle', 0.035)
            this.publish()
            return
          }

          if (kind === 'soda') {
            this.lives = Math.min(INITIAL_LIVES, this.lives + 1)
            this.burstAt(itemX, itemY, 0x38bdf8, '+ vida')
            this.flashPhrase('¡Refresco de vida!')
            playTone(880, 0.12, 'sine', 0.035)
            this.publish()
            return
          }

          if (kind === 'rainbowTaco') {
            this.powerUpsUsed += 1
            this.rainbowActiveUntil = this.time.now + 8000
            this.combo += 1
            this.bestCombo = Math.max(this.bestCombo, this.combo)
            this.catchCount += 1
            this.score += 100
            this.burstAt(itemX, itemY, 0xf472b6, '+100 x3')
            this.flashPhrase('¡Taco arcoíris x3!')
            playTone(920, 0.12, 'square', 0.035)
            this.publish()
            return
          }

          this.combo += 1
          this.bestCombo = Math.max(this.bestCombo, this.combo)
          this.catchCount += kind === 'megaTaco' ? 2 : 1
          const comboBonus = this.combo >= 10 ? 3 : this.combo >= 5 ? 2 : 1
          const doubleBonus = kind === 'taco' && this.time.now < this.doubleActiveUntil ? 2 : 1
          const rainbowBonus = kind === 'taco' && this.time.now < this.rainbowActiveUntil ? 3 : 1
          const basePoints = kind === 'gold'
            ? 75
            : kind === 'megaTaco'
              ? 120
              : kind === 'trompo'
                ? 60
                : 10 * doubleBonus
          const gained = basePoints * comboBonus * rainbowBonus
          this.score += gained
          this.burstAt(itemX, itemY, kind === 'gold' || kind === 'megaTaco' ? 0xfacc15 : 0x22d3ee, kind === 'gold' || kind === 'megaTaco' ? `+${gained} bonus` : `+${gained}`)
          if (kind === 'gold' || kind === 'megaTaco') {
            this.cameras.main.flash(120, 250, 204, 21, false)
          }
          this.flashPhrase(this.combo >= 10 ? 'Combo x10: taquero legendario' : kind === 'trompo' ? '¡Trompo al pastor!' : this.combo >= 5 ? '¡Taco Power!' : '+ taco')
          playTone(kind === 'gold' ? 740 : 520, 0.07, 'square', 0.03)
          this.publish()
        }

        clearDangerItems(x: number, y: number) {
          let cleared = 0
          this.tacos.getChildren().forEach((item: any) => {
            const kind = item?.getData?.('kind')
            if (item?.active && (kind === 'chile' || kind === 'redSalsa')) {
              cleared += 1
              item.destroy()
            }
          })
          this.score += cleared * 20
          this.burstAt(x, y, 0x84cc16, cleared > 0 ? `+${cleared * 20}` : 'Limpio')
        }

        activatePowerUp(kind: 'shield' | 'slow' | 'double', x: number, y: number) {
          this.powerUpsUsed += 1

          if (kind === 'shield') {
            this.shieldActiveUntil = this.time.now + 15000
            this.burstAt(x, y, 0x22d3ee, 'Escudo')
            this.flashPhrase('¡Escudo anti-chile activo!')
            playTone(620, 0.11, 'triangle', 0.035)
          } else if (kind === 'slow') {
            this.slowActiveUntil = this.time.now + 8000
            this.burstAt(x, y, 0xa78bfa, 'Slow')
            this.flashPhrase('¡Cámara lenta!')
            playTone(380, 0.12, 'sine', 0.035)
          } else {
            this.doubleActiveUntil = this.time.now + 10000
            this.burstAt(x, y, 0xfacc15, 'x2')
            this.flashPhrase('¡Tacos comunes x2!')
            playTone(820, 0.1, 'square', 0.035)
          }

          this.publish()
        }

        endRound() {
          this.gameStatus = 'gameOver'
          this.physics.pause()
          if (this.score > this.hiScore) {
            this.hiScore = this.score
            window.localStorage.setItem(HI_SCORE_KEY, String(this.hiScore))
          }
          if (this.score > 0) {
            const playerProfile = playerProfileRef.current
            const scoreEntry = {
              username: playerProfile.username,
              world_cup_country_code: playerProfile.world_cup_country_code,
              score: this.score,
              tacos: this.catchCount,
              combo: this.bestCombo,
              time: this.startedAt ? Math.floor((this.time.now - this.startedAt) / 1000) : 0,
              durationMs: this.startedAt ? Math.floor(this.time.now - this.startedAt) : 0,
              powerUps: this.powerUpsUsed,
              level: this.currentLevelIndex + 1,
              date: new Date().toISOString(),
            }
            const nextRanking = saveLocalScore(scoreEntry)
            setLocalRanking(nextRanking)
            submitOnlineScoreRef.current(scoreEntry)
          }
          this.flashPhrase(this.score >= this.hiScore ? '¡Nuevo hi-score!' : 'Taquiza terminada')
          setStatus('gameOver')
          stopMusic()
          this.publish()
          playTone(90, 0.18, 'sawtooth', 0.05)
        }

        flashPhrase(phrase: string) {
          this.currentPhrase = phrase
        }

        publishThrottled(_delta: number) {
          if (Math.floor(this.time.now / 180) !== Math.floor((this.time.now - _delta) / 180)) {
            this.publish()
          }
        }

        publish() {
          setSnapshot({
            score: this.score,
            lives: this.lives,
            combo: this.combo,
            bestCombo: this.bestCombo,
            time: this.startedAt ? Math.floor((this.time.now - this.startedAt) / 1000) : 0,
            level: this.currentLevelIndex + 1,
            levelName: this.getCurrentLevel().name,
            levelTimeLeft: this.gameStatus === 'playing'
              ? Math.max(0, Math.ceil((LEVEL_DURATION_MS - (this.time.now - this.levelStartedAt)) / 1000))
              : LEVEL_DURATION_MS / 1000,
            hiScore: this.hiScore,
            catchCount: this.catchCount,
            phrase: this.currentPhrase,
            powerUpLabel: this.getActivePowerUpLabel(),
            powerUpTime: this.getActivePowerUpTime(),
            shieldActive: this.time.now < this.shieldActiveUntil,
          })
        }

        getActivePowerUpLabel() {
          if (this.time.now < this.rainbowActiveUntil) return 'Arcoíris x3'
          if (this.time.now < this.doubleActiveUntil) return 'Tacos x2'
          if (this.time.now < this.slowActiveUntil) return 'Cámara lenta'
          if (this.time.now < this.shieldActiveUntil) return 'Escudo'
          return ''
        }

        getActivePowerUpTime() {
          const activeUntil = this.time.now < this.rainbowActiveUntil
            ? this.rainbowActiveUntil
            : this.time.now < this.doubleActiveUntil
              ? this.doubleActiveUntil
              : this.time.now < this.slowActiveUntil
                ? this.slowActiveUntil
                : this.time.now < this.shieldActiveUntil
                  ? this.shieldActiveUntil
                  : 0
          return Math.max(0, Math.ceil((activeUntil - this.time.now) / 1000))
        }
      }

      game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: containerRef.current,
        width: GAME_WIDTH,
        height: GAME_HEIGHT,
        transparent: true,
        backgroundColor: '#050816',
        physics: {
          default: 'arcade',
          arcade: { debug: false },
        },
        scale: {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
        scene: TacoRainScene,
      })
    }

    boot()

    return () => {
      destroyed = true
      controlsRef.current = null
      stopMusic()
      game?.destroy(true)
    }
  }, [])

  const hearts = Array.from({ length: INITIAL_LIVES }, (_, index) => index < snapshot.lives)
  const seasonEndsAt = season?.ends_at
    ? new Date(season.ends_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
    : null
  const onlineStatusText = onlineStatus === 'saving'
    ? 'Guardando puntaje online...'
    : onlineStatus === 'saved' && saveResult
      ? saveResult.is_personal_best
        ? `Nuevo record personal. Puesto #${saveResult.rank}.`
        : `Puntaje guardado. Tu mejor marca sigue en ${saveResult.personal_best.toLocaleString()} pts.`
      : onlineStatus === 'auth'
        ? 'Inicia sesion para entrar al ranking global.'
        : onlineStatus === 'error'
          ? onlineError || 'No se pudo guardar online.'
          : 'Tus mejores partidas tambien compiten online.'

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050816] px-3 py-5 text-white sm:px-6 lg:h-screen lg:px-4 lg:py-3">
      {newAchievements.length > 0 && (
        <div className="pointer-events-none fixed right-4 top-4 z-50 w-[min(22rem,calc(100vw-2rem))] space-y-2">
          {newAchievements.map((achievement) => (
            <div key={achievement.id} className="rounded-lg border border-yellow-300/40 bg-slate-950/95 p-3 shadow-2xl shadow-yellow-950/40">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-yellow-200">Insignia desbloqueada</p>
              <div className="mt-2 flex items-center gap-3">
                <AchievementIcon achievement={achievement} />
                <div className="min-w-0">
                  <p className="font-black text-white">{achievement.name}</p>
                  <p className="text-xs text-yellow-50/70">{achievement.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] w-full max-w-7xl flex-col items-center justify-center gap-4 lg:h-[calc(100vh-1.5rem)] lg:min-h-0 lg:flex-row lg:items-stretch">
        <section className="relative w-full max-w-[430px] overflow-hidden rounded-lg border border-cyan-300/30 bg-slate-950 shadow-2xl shadow-cyan-950/60 lg:max-w-[390px] xl:max-w-[410px]">
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10">
            <div className="flex items-start justify-between px-4 py-3 font-black uppercase tracking-wider">
              <div>
                <p className="text-sm text-fuchsia-200">1UP</p>
                <p className="text-3xl leading-none text-cyan-300">{snapshot.score.toString().padStart(6, '0')}</p>
                <div className="mt-2 flex gap-1">
                  {hearts.map((alive, index) => (
                    <span key={index} className={`text-2xl ${alive ? 'text-pink-400' : 'text-slate-700'}`}>♥</span>
                  ))}
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm text-yellow-200">HI-SCORE</p>
                <p className="text-3xl leading-none text-yellow-300">{snapshot.hiScore.toString().padStart(6, '0')}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-lime-300">2UP</p>
                <p className="text-3xl leading-none text-lime-300">000000</p>
              </div>
            </div>
          </div>

          <div ref={containerRef} className="relative h-[min(680px,calc(100vh-7.5rem))] min-h-[540px] w-full touch-none lg:h-[calc(100vh-7.25rem)] lg:min-h-0" />

          <div className="relative z-10 border-t border-cyan-300/25 bg-slate-950/96 px-3 py-3 backdrop-blur">
            <div className="grid grid-cols-4 gap-2 text-center text-[11px] font-black uppercase text-cyan-50 sm:text-xs">
              <div><span className="text-lg">🌮</span><p>Catch tacos</p></div>
              <div><span className="text-lg">⭐</span><p>Score points</p></div>
              <div><span className="text-lg">🌶️</span><p>Avoid spicy</p></div>
              <div><span className="text-lg">?</span><p>Bonus round</p></div>
            </div>
          </div>

          {status !== 'playing' && (
            <div className="absolute inset-x-0 top-0 z-20 flex h-[min(680px,calc(100vh-7.5rem))] min-h-[540px] items-center justify-center bg-slate-950/72 p-5 text-center backdrop-blur-sm lg:h-[calc(100vh-7.25rem)] lg:min-h-0">
              <div className="max-w-sm">
                <p className="text-sm font-black uppercase tracking-[0.35em] text-cyan-200">Turix Arcade</p>
                <h1 className="mt-3 text-5xl font-black uppercase leading-none text-yellow-300 drop-shadow-[0_0_18px_rgba(34,211,238,0.8)] sm:text-6xl">
                  Rain<br />of Tacos
                </h1>
                {status === 'gameOver' ? (
                  <div className="mt-5 grid grid-cols-2 gap-2 text-left">
                    <MiniPanel label="Score" value={String(snapshot.score)} />
                    <MiniPanel label="Tacos" value={String(snapshot.catchCount)} />
                    <MiniPanel label="Combo" value={`x${snapshot.bestCombo}`} />
                    <MiniPanel label="Tiempo" value={`${snapshot.time}s`} />
                  </div>
                ) : (
                  <p className="mt-4 text-sm font-bold text-cyan-50/80">
                    Atrapa tacos, evita chiles y encadena combos para convertirte en taquero legendario.
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => controlsRef.current?.start()}
                  className="mt-6 inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-300 px-6 py-3 font-black text-slate-950 transition hover:bg-cyan-200"
                >
                  <Play className="h-5 w-5" />
                  {status === 'gameOver' ? 'Jugar de nuevo' : 'Jugar'}
                </button>
              </div>
            </div>
          )}
        </section>

        <aside className="w-full max-w-[430px] space-y-4 rounded-lg border border-white/10 bg-white/[0.06] p-5 shadow-xl lg:grid lg:max-w-[820px] lg:grid-cols-2 lg:content-start lg:gap-3 lg:space-y-0 lg:overflow-hidden lg:p-3 xl:max-w-[900px]">
          <div className="lg:rounded-lg lg:bg-slate-950/35 lg:p-3">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-cyan-200">Frase arcade</p>
            <p className="mt-2 text-2xl font-black text-white">{snapshot.phrase}</p>
            <p className="mt-1 text-sm font-bold text-cyan-50/65">
              Nivel {snapshot.level}/5 · {snapshot.levelName} · {snapshot.levelTimeLeft}s
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:gap-2">
            <MiniPanel label="Nivel" value={`${snapshot.level}/5`} />
            <MiniPanel label="Fase" value={`${snapshot.levelTimeLeft}s`} />
            <MiniPanel label="Combo" value={snapshot.combo > 0 ? `x${snapshot.combo}` : '-'} />
            <MiniPanel label="Mejor combo" value={`x${snapshot.bestCombo}`} />
            <MiniPanel label="Tacos" value={String(snapshot.catchCount)} />
            <MiniPanel label="Tiempo" value={`${snapshot.time}s`} />
            <MiniPanel
              label="Power-up"
              value={snapshot.powerUpTime > 0 ? `${snapshot.powerUpLabel} ${snapshot.powerUpTime}s` : snapshot.powerUpLabel || '-'}
            />
            <MiniPanel label="Escudo" value={snapshot.shieldActive ? 'Activo' : '-'} />
          </div>

          <div className="flex flex-wrap gap-2 lg:col-span-2">
            {status === 'playing' ? (
              <button
                type="button"
                onClick={() => controlsRef.current?.pause()}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-white/10 px-4 py-3 font-bold text-white transition hover:bg-white/20"
              >
                <Pause className="h-5 w-5" />
                Pausar
              </button>
            ) : status === 'paused' ? (
              <button
                type="button"
                onClick={() => controlsRef.current?.resume()}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-cyan-300 px-4 py-3 font-bold text-slate-950 transition hover:bg-cyan-200"
              >
                <Play className="h-5 w-5" />
                Continuar
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => controlsRef.current?.restart()}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-white/10 px-4 py-3 font-bold text-white transition hover:bg-white/20"
            >
              <RotateCcw className="h-5 w-5" />
              Reiniciar
            </button>

            <button
              type="button"
              onClick={() => setMuted((current) => !current)}
              className="inline-flex items-center justify-center rounded-lg bg-white/10 px-4 py-3 text-white transition hover:bg-white/20"
              aria-label={muted ? 'Activar sonido' : 'Silenciar sonido'}
            >
              {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </button>
          </div>

          <div className="rounded-lg border border-cyan-300/20 bg-cyan-300/10 p-4 text-sm text-cyan-50/75 lg:p-3">
            <p className="font-bold text-white">Controles</p>
            <p className="mt-1">Celular: arrastra el dedo para mover la canasta.</p>
            <p>Desktop: flechas o A/D.</p>
          </div>

          <div className="rounded-lg border border-emerald-300/20 bg-emerald-300/10 p-4 text-sm text-emerald-50/75 lg:p-3">
            <p className="font-bold text-white">Ranking online</p>
            <p className="mt-1">{onlineStatusText}</p>
          </div>

          <div className="rounded-lg border border-violet-300/20 bg-violet-300/10 p-4 lg:p-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-violet-100">
                <Sparkles className="h-4 w-4" />
                Insignias
              </p>
              <span className="rounded-full bg-violet-300 px-2 py-1 text-xs font-black text-slate-950">
                {achievements.filter((achievement) => achievement.is_unlocked).length}/{achievements.length || 0}
              </span>
            </div>
            <AchievementList achievements={achievements} />
          </div>

          <div className="rounded-lg border border-fuchsia-300/20 bg-fuchsia-300/10 p-4 lg:p-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-fuchsia-100">
                <Trophy className="h-4 w-4" />
                Top global
              </p>
              <span className="rounded-full bg-fuchsia-300 px-2 py-1 text-xs font-black text-slate-950">Top 10</span>
            </div>
            <OnlineRankingList
              entries={onlineRanking}
              emptyText="Aun no hay taqueros en el ranking global."
            />
          </div>

          <div className="rounded-lg border border-emerald-300/20 bg-emerald-300/10 p-4 lg:p-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-emerald-100">
                <CalendarDays className="h-4 w-4" />
                Temporada
              </p>
              {seasonEndsAt && (
                <span className="rounded-full bg-emerald-300 px-2 py-1 text-xs font-black text-slate-950">
                  Cierra {seasonEndsAt}
                </span>
              )}
            </div>
            <OnlineRankingList
              entries={seasonRanking.slice(0, 5)}
              emptyText="La primera taquiza de la semana abre la temporada."
            />
          </div>

          <div className="rounded-lg border border-yellow-300/20 bg-yellow-300/10 p-4 lg:p-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-sm font-black uppercase tracking-[0.22em] text-yellow-100">Top local</p>
              <span className="rounded-full bg-yellow-300 px-2 py-1 text-xs font-black text-slate-950">Top 5</span>
            </div>
            {localRanking.length === 0 ? (
              <p className="text-sm text-yellow-50/70">Tu primera taquiza abrirá el ranking local.</p>
            ) : (
              <div className="space-y-2">
                {localRanking.map((entry, index) => (
                  <div key={`${entry.date}-${index}`} className="grid grid-cols-[2rem_1fr_auto] items-center gap-2 rounded-lg bg-slate-950/55 p-2 lg:p-1.5">
                    <div className="text-center text-sm font-black text-yellow-200">#{index + 1}</div>
                    <div className="min-w-0">
                      <div className="flex min-w-0 items-center gap-2">
                        <CountryFlagBadge countryCode={entry.world_cup_country_code} />
                        <p className="truncate text-xs font-bold text-yellow-50/75">{entry.username || 'Jugador local'}</p>
                      </div>
                      <p className="truncate text-sm font-black text-white">{entry.score.toLocaleString()} pts</p>
                      <p className="text-xs text-yellow-50/55">{entry.tacos} tacos · combo x{entry.combo} · {entry.time}s</p>
                    </div>
                    <span className="text-lg">🌮</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}

function MiniPanel({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-950/60 p-3 lg:p-2">
      <p className="text-xs text-cyan-50/55">{label}</p>
      <p className="mt-1 text-xl font-black text-white lg:text-lg">{value}</p>
    </div>
  )
}

function OnlineRankingList({
  entries,
  emptyText,
}: {
  entries: TacoRainLeaderboardEntry[]
  emptyText: string
}) {
  if (entries.length === 0) {
    return <p className="text-sm text-white/65">{emptyText}</p>
  }

  return (
    <div className="space-y-2">
      {entries.map((entry) => (
        <div key={`${entry.user_id}-${entry.rank}`} className="grid grid-cols-[2rem_1fr_auto] items-center gap-2 rounded-lg bg-slate-950/55 p-2 lg:p-1.5">
          <div className="text-center text-sm font-black text-white">#{entry.rank}</div>
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <CountryFlagBadge countryCode={entry.world_cup_country_code} />
              <p className="truncate text-sm font-black text-white">{entry.username || 'Usuario'}</p>
            </div>
            <p className="mt-0.5 text-xs text-white/55">
              {entry.best_score.toLocaleString()} pts · {entry.total_tacos.toLocaleString()} tacos · combo x{entry.best_combo}
            </p>
          </div>
          <span className="text-lg">🌮</span>
        </div>
      ))}
    </div>
  )
}

function AchievementList({ achievements }: { achievements: TacoRainAchievement[] }) {
  if (achievements.length === 0) {
    return <p className="text-sm text-white/65">Las insignias apareceran al aplicar la migracion de logros.</p>
  }

  return (
    <div className="grid grid-cols-2 gap-2 lg:gap-1.5">
      {achievements.map((achievement) => (
        <div
          key={achievement.id}
          className={`rounded-lg border p-2 lg:p-1.5 ${
            achievement.is_unlocked
              ? 'border-violet-200/40 bg-slate-950/65 text-white'
              : 'border-white/10 bg-slate-950/35 text-white/45'
          }`}
        >
          <div className="flex items-center gap-2">
            <AchievementIcon achievement={achievement} />
            <div className="min-w-0">
              <p className="truncate text-xs font-black">{achievement.name}</p>
              <p className="text-[10px] uppercase tracking-wider">{achievement.is_unlocked ? 'Lista' : 'Pendiente'}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function AchievementIcon({ achievement }: { achievement: TacoRainAchievement }) {
  const icon = getAchievementIcon(achievement.id)
  const rarityClass = achievement.rarity === 'legendary'
    ? 'border-yellow-200/60 bg-yellow-300/20'
    : achievement.rarity === 'epic'
      ? 'border-fuchsia-200/50 bg-fuchsia-300/15'
      : achievement.rarity === 'rare'
        ? 'border-cyan-200/50 bg-cyan-300/15'
        : 'border-white/15 bg-white/10'

  return (
    <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border text-lg lg:h-8 lg:w-8 lg:text-base ${rarityClass}`}>
      {icon}
    </span>
  )
}

function getAchievementIcon(id: string) {
  if (id.includes('combo')) return 'x10'
  if (id.includes('power')) return '⚡'
  if (id.includes('weekly')) return '#'
  if (id.includes('record')) return '★'
  if (id.includes('2000')) return '👑'
  if (id.includes('100')) return '100'
  return '🌮'
}

function CountryFlagBadge({ countryCode }: { countryCode?: string | null }) {
  const country = getWorldCup2026Country(countryCode)

  if (!country) return null

  return (
    <span
      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/10 text-base"
      title={`${country.name} · Grupo ${country.group}`}
      aria-label={`${country.name}, grupo ${country.group}`}
    >
      {country.flag}
    </span>
  )
}
