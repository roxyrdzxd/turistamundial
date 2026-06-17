'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Activity,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  BarChart3,
  CalendarDays,
  Copy,
  Home,
  Music,
  Pause,
  Play,
  RotateCcw,
  Send,
  Share2,
  Sparkles,
  Trophy,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react'
import { soundManager } from '@/lib/audio/soundManager'

type Point = {
  x: number
  y: number
}

type RenderCache = {
  key: string
  canvas: HTMLCanvasElement
}

type FruitType = 'apple' | 'gold' | 'turbo' | 'frost' | 'rainbow'

type Fruit = Point & {
  type: FruitType
}

type VisualBurst = {
  id: number
  x: number
  y: number
  color: string
  label: string
  particles: Array<{
    id: number
    angle: number
    distance: number
  }>
}

type RewardCelebration = {
  id: number
  title: string
  detail: string
  amount: number
  tone: 'emerald' | 'amber'
}

type Direction = 'up' | 'down' | 'left' | 'right'
type GameState = 'ready' | 'playing' | 'paused' | 'gameOver'
type GameMode = 'classic' | 'arcade' | 'timeAttack' | 'training'
type RankedGameMode = 'classic' | 'arcade' | 'timeAttack'
type SnakeTheme = 'neon' | 'jungle' | 'frost' | 'gold' | 'classic'

type LeaderboardEntry = {
  rank: number
  user_id: string
  username: string
  avatar_url: string | null
  best_score: number
  games_played: number
  longest_snake: number
  best_level: number
  last_played_at: string | null
}

type SnakeSeason = {
  id: string
  slug: string
  title: string
  status: string
  starts_at: string
  ends_at: string
}

type SnakeSeasonHistory = {
  id: string
  slug: string
  title: string
  status: string
  starts_at: string
  ends_at: string
  champion_user_id: string | null
  champion_username: string | null
  champion_avatar_url: string | null
  champion_score: number | null
}

export type SnakeStats = {
  best_score: number
  games_played: number
  total_score: number
  total_food: number
  longest_snake: number
  best_level: number
  average_score: number
  last_played_at: string | null
  rank: number | null
}

type SaveResult = {
  rank: number
  personal_best: number
  is_personal_best: boolean
}

type SnakeAchievement = {
  id: string
  name: string
  description: string
  badge_url: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  requirement_type?: string
  requirement_value?: number
  coins_reward?: number
  is_unlocked?: boolean
  unlocked_at?: string | null
  progress_value?: number
  target_value?: number
  progress_label?: string
}

type SnakeDailyChallenge = {
  id: string
  challenge_id?: string
  challenge_key: string
  title: string
  description: string
  metric_type?: string
  progress: number
  target: number
  reward_coins: number
  completed_at?: string | null
  claimed_at?: string | null
  challenge_date?: string
  completed_now?: boolean
}

type SnakeDailyRewards = {
  current_streak: number
  best_streak: number
  last_played_date: string | null
  chest_id: string
  chest_date: string
  completed_challenges: number
  required_completed_challenges: number
  reward_coins: number
  opened_at: string | null
  can_open: boolean
}

type SnakeGameProps = {
  userId: string
  username: string
  initialStats: SnakeStats
}

const GRID_SIZE = 24
const CANVAS_SIZE = 480
const CELL_SIZE = CANVAS_SIZE / GRID_SIZE
const COMBO_WINDOW_MS = 6500
const TIME_ATTACK_LIMIT_MS = 60000
const TIME_ATTACK_COLLISION_PENALTY_MS = 5000
const TIME_ATTACK_COMBO_BONUS_MS = 3000
const TIME_ATTACK_COMBO_BIG_BONUS_MS = 6000
const TIME_ATTACK_COMBO_BONUS_THRESHOLD = 5
const TIME_ATTACK_COMBO_BIG_THRESHOLD = 10
const TIME_ATTACK_LEVEL_BONUS_MS = 4000
const TIME_ATTACK_GOLD_BONUS_MS = 3000
const TIME_ATTACK_FROST_BONUS_MS = 2000
const TIME_ATTACK_RAINBOW_BONUS_MS = 5000
const TIME_ATTACK_PRECISION_BONUS_MS = 3000
const TIME_ATTACK_PRECISION_WINDOW_MS = 15000
const TIME_ATTACK_MAX_TIME_MS = 90000
const BOARD_SWIPE_THRESHOLD_PX = 24
const INITIAL_SNAKE: Point[] = [
  { x: 8, y: 12 },
  { x: 7, y: 12 },
  { x: 6, y: 12 },
]

const GAME_MODE_CONFIG: Record<GameMode, {
  label: string
  shortLabel: string
  description: string
  ranked: boolean
  specialFruits: boolean
  combos: boolean
  speedOffset: number
}> = {
  classic: {
    label: 'Clasico',
    shortLabel: 'Ranked',
    description: 'Solo manzanas, reglas limpias y ranking competitivo.',
    ranked: true,
    specialFruits: false,
    combos: false,
    speedOffset: 0,
  },
  arcade: {
    label: 'Arcade',
    shortLabel: 'Global',
    description: 'Frutas especiales, combos, luces y ranking global.',
    ranked: true,
    specialFruits: true,
    combos: true,
    speedOffset: 0,
  },
  timeAttack: {
    label: 'Contra Reloj',
    shortLabel: '60s',
    description: 'Un minuto de caos: frutas raras, niveles y precision recuperan segundos.',
    ranked: true,
    specialFruits: true,
    combos: true,
    speedOffset: -6,
  },
  training: {
    label: 'Entrenamiento',
    shortLabel: 'Practica',
    description: 'Practica rutas y efectos sin guardar puntaje.',
    ranked: false,
    specialFruits: true,
    combos: true,
    speedOffset: 18,
  },
}

const SNAKE_THEME_CONFIG: Record<SnakeTheme, {
  label: string
  description: string
  boardStart: string
  boardMiddle: string
  boardEnd: string
  aura: string
  grid: string
  headStart: string
  headEnd: string
  bodyStart: string
  bodyEnd: string
  bodyAlt: string
  eye: string
  accent: string
}> = {
  neon: {
    label: 'Neon Arcade',
    description: 'Cian electrico con brillo competitivo.',
    boardStart: '#061b2d',
    boardMiddle: '#0f172a',
    boardEnd: '#102a28',
    aura: '#22d3ee',
    grid: 'rgba(148, 163, 184, 0.11)',
    headStart: '#67e8f9',
    headEnd: '#22d3ee',
    bodyStart: '#34d399',
    bodyEnd: '#2dd4bf',
    bodyAlt: '#16a34a',
    eye: '#052e2b',
    accent: '#22d3ee',
  },
  jungle: {
    label: 'Selva Digital',
    description: 'Verdes profundos y energia de expedicion.',
    boardStart: '#052e16',
    boardMiddle: '#0f1f18',
    boardEnd: '#123524',
    aura: '#4ade80',
    grid: 'rgba(134, 239, 172, 0.12)',
    headStart: '#bbf7d0',
    headEnd: '#22c55e',
    bodyStart: '#84cc16',
    bodyEnd: '#16a34a',
    bodyAlt: '#15803d',
    eye: '#052e16',
    accent: '#4ade80',
  },
  frost: {
    label: 'Hielo Cosmico',
    description: 'Azules frios con brillo cristalino.',
    boardStart: '#081826',
    boardMiddle: '#111827',
    boardEnd: '#172554',
    aura: '#93c5fd',
    grid: 'rgba(191, 219, 254, 0.13)',
    headStart: '#e0f2fe',
    headEnd: '#60a5fa',
    bodyStart: '#7dd3fc',
    bodyEnd: '#38bdf8',
    bodyAlt: '#2563eb',
    eye: '#082f49',
    accent: '#93c5fd',
  },
  gold: {
    label: 'Oro Turbo',
    description: 'Dorado intenso para carreras explosivas.',
    boardStart: '#221408',
    boardMiddle: '#171717',
    boardEnd: '#312e0f',
    aura: '#facc15',
    grid: 'rgba(253, 230, 138, 0.12)',
    headStart: '#fef3c7',
    headEnd: '#facc15',
    bodyStart: '#fb923c',
    bodyEnd: '#f59e0b',
    bodyAlt: '#b45309',
    eye: '#451a03',
    accent: '#facc15',
  },
  classic: {
    label: 'Clasico Pro',
    description: 'Contraste limpio para partidas serias.',
    boardStart: '#020617',
    boardMiddle: '#0f172a',
    boardEnd: '#111827',
    aura: '#94a3b8',
    grid: 'rgba(226, 232, 240, 0.1)',
    headStart: '#e2e8f0',
    headEnd: '#94a3b8',
    bodyStart: '#cbd5e1',
    bodyEnd: '#64748b',
    bodyAlt: '#475569',
    eye: '#020617',
    accent: '#cbd5e1',
  },
}

const SNAKE_BADGE_BASE_URL = 'https://cgoisveithzvituzyoga.supabase.co/storage/v1/object/public/snake-badges'

const SNAKE_BADGE_PUBLIC_URLS: Record<string, string> = {
  'snake-first-game.png': `${SNAKE_BADGE_BASE_URL}/snake-first-game.png`,
  'snake-level-3.png': `${SNAKE_BADGE_BASE_URL}/snake-level-3.png`,
  'snake-record-breaker.png': `${SNAKE_BADGE_BASE_URL}/snake-record-breaker.png`,
  'snake-rookie.png': `${SNAKE_BADGE_BASE_URL}/snake-rookie.png`,
  'snake-weekly-top-10.png': `${SNAKE_BADGE_BASE_URL}/snake-weekly-top-10.png`,
  'snake-combo-10.png': `${SNAKE_BADGE_BASE_URL}/snake-combo-10.png`,
  'snake-10-games.png': `${SNAKE_BADGE_BASE_URL}/snake-10-games.png`,
  'snake-100-fruits.png': `${SNAKE_BADGE_BASE_URL}/snake-100-fruits.png`,
  'snake-first-chest.png': `${SNAKE_BADGE_BASE_URL}/snake-first-chest.png`,
  'snake-streak-3.png': `${SNAKE_BADGE_BASE_URL}/snake-streak-3.png`,
  'snake-streak-7.png': `${SNAKE_BADGE_BASE_URL}/snake-streak-7.png`,
  'snake-score-1000.png': `${SNAKE_BADGE_BASE_URL}/snake-score-1000.png`,
  'snake-score-5000.png': `${SNAKE_BADGE_BASE_URL}/snake-score-5000.png`,
  'snake-rainbow-3.png': `${SNAKE_BADGE_BASE_URL}/snake-rainbow-3.png`,
  'snake-10-daily-challenges.png': `${SNAKE_BADGE_BASE_URL}/snake-10-daily-challenges.png`,
}

const FRUIT_CONFIG: Record<FruitType, {
  label: string
  shortLabel: string
  color: string
  glow: string
  points: (level: number) => number
  durationMs?: number
}> = {
  apple: {
    label: 'Manzana',
    shortLabel: '+',
    color: '#fb7185',
    glow: '#fda4af',
    points: (level) => level * 10,
  },
  gold: {
    label: 'Fruta dorada',
    shortLabel: 'x2',
    color: '#facc15',
    glow: '#fde68a',
    points: (level) => level * 20,
  },
  turbo: {
    label: 'Turbo',
    shortLabel: '2x',
    color: '#f97316',
    glow: '#fdba74',
    points: (level) => level * 12,
    durationMs: 5500,
  },
  frost: {
    label: 'Hielo',
    shortLabel: 'S',
    color: '#93c5fd',
    glow: '#bfdbfe',
    points: (level) => level * 8,
    durationMs: 5200,
  },
  rainbow: {
    label: 'Arcoiris',
    shortLabel: '★',
    color: '#c084fc',
    glow: '#f0abfc',
    points: (level) => level * 30,
    durationMs: 6500,
  },
}

function getOpposite(direction: Direction): Direction {
  const opposites: Record<Direction, Direction> = {
    up: 'down',
    down: 'up',
    left: 'right',
    right: 'left',
  }

  return opposites[direction]
}

function chooseFruitType(gameMode: GameMode): FruitType {
  if (!GAME_MODE_CONFIG[gameMode].specialFruits) return 'apple'

  const roll = Math.random()
  if (roll < 0.58) return 'apple'
  if (roll < 0.76) return 'gold'
  if (roll < 0.87) return 'turbo'
  if (roll < 0.96) return 'frost'
  return 'rainbow'
}

function getComboMultiplier(comboValue: number) {
  if (comboValue >= 10) return 1.35
  if (comboValue >= 6) return 1.25
  if (comboValue >= 3) return 1.15
  return 1
}

function isSnakeTheme(value: string | null): value is SnakeTheme {
  return Boolean(value && value in SNAKE_THEME_CONFIG)
}

function createFood(snake: Point[], gameMode: GameMode): Fruit {
  const occupied = new Set(snake.map((segment) => `${segment.x}-${segment.y}`))
  const openCells: Point[] = []

  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      if (!occupied.has(`${x}-${y}`)) {
        openCells.push({ x, y })
      }
    }
  }

  const point = openCells[Math.floor(Math.random() * openCells.length)] || { x: 12, y: 12 }
  return {
    ...point,
    type: chooseFruitType(gameMode),
  }
}

function createSeed() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function formatTime(durationMs: number) {
  return `${Math.floor(durationMs / 60000)}:${Math.floor((durationMs % 60000) / 1000)
    .toString()
    .padStart(2, '0')}`
}

function formatNumber(value: number | null | undefined) {
  return Number(value || 0).toLocaleString()
}

function fillRoundedCell(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  radius: number
) {
  context.beginPath()
  context.roundRect(x, y, size, size, radius)
  context.fill()
}

function getDirectionVector(direction: Direction) {
  if (direction === 'up') return { x: 0, y: -1 }
  if (direction === 'down') return { x: 0, y: 1 }
  if (direction === 'left') return { x: -1, y: 0 }
  return { x: 1, y: 0 }
}

function drawBoardLayer(context: CanvasRenderingContext2D, themeConfig: typeof SNAKE_THEME_CONFIG[SnakeTheme]) {
  const gradient = context.createLinearGradient(0, 0, CANVAS_SIZE, CANVAS_SIZE)
  gradient.addColorStop(0, themeConfig.boardStart)
  gradient.addColorStop(0.45, themeConfig.boardMiddle)
  gradient.addColorStop(1, themeConfig.boardEnd)
  context.fillStyle = gradient
  context.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

  context.save()
  context.globalAlpha = 0.08
  context.fillStyle = themeConfig.accent
  for (let y = 0; y < GRID_SIZE; y += 2) {
    for (let x = (y / 2) % 2; x < GRID_SIZE; x += 2) {
      context.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE)
    }
  }
  context.restore()

  context.strokeStyle = themeConfig.grid
  context.lineWidth = 1
  for (let i = 0; i <= GRID_SIZE; i++) {
    const position = i * CELL_SIZE
    context.beginPath()
    context.moveTo(position, 0)
    context.lineTo(position, CANVAS_SIZE)
    context.stroke()
    context.beginPath()
    context.moveTo(0, position)
    context.lineTo(CANVAS_SIZE, position)
    context.stroke()
  }
}

function drawFruitShape(
  context: CanvasRenderingContext2D,
  fruit: Fruit,
  fruitConfig: typeof FRUIT_CONFIG[FruitType],
  pulse: number
) {
  const fruitX = fruit.x * CELL_SIZE + CELL_SIZE / 2
  const fruitY = fruit.y * CELL_SIZE + CELL_SIZE / 2
  const fruitRadius = CELL_SIZE * (0.34 + pulse * 0.035)

  context.save()
  const fruitAura = context.createRadialGradient(fruitX, fruitY, 1, fruitX, fruitY, CELL_SIZE * 1.45)
  fruitAura.addColorStop(0, `${fruitConfig.glow}aa`)
  fruitAura.addColorStop(0.45, `${fruitConfig.glow}34`)
  fruitAura.addColorStop(1, 'rgba(15, 23, 42, 0)')
  context.fillStyle = fruitAura
  context.fillRect(
    fruitX - CELL_SIZE * 1.5,
    fruitY - CELL_SIZE * 1.5,
    CELL_SIZE * 3,
    CELL_SIZE * 3
  )

  context.shadowColor = fruitConfig.glow
  context.shadowBlur = 18 + Math.max(0, pulse) * 6

  if (fruit.type === 'apple') {
    const appleGradient = context.createRadialGradient(
      fruitX - CELL_SIZE * 0.12,
      fruitY - CELL_SIZE * 0.16,
      CELL_SIZE * 0.05,
      fruitX,
      fruitY,
      fruitRadius
    )
    appleGradient.addColorStop(0, '#fecdd3')
    appleGradient.addColorStop(0.45, fruitConfig.color)
    appleGradient.addColorStop(1, '#be123c')
    context.fillStyle = appleGradient
    context.beginPath()
    context.arc(fruitX - CELL_SIZE * 0.11, fruitY, fruitRadius * 0.82, 0, Math.PI * 2)
    context.arc(fruitX + CELL_SIZE * 0.11, fruitY, fruitRadius * 0.82, 0, Math.PI * 2)
    context.fill()
    context.shadowBlur = 0
    context.strokeStyle = '#15803d'
    context.lineWidth = 2
    context.beginPath()
    context.moveTo(fruitX, fruitY - fruitRadius * 0.72)
    context.quadraticCurveTo(fruitX + CELL_SIZE * 0.04, fruitY - fruitRadius * 1.08, fruitX + CELL_SIZE * 0.22, fruitY - fruitRadius * 1.05)
    context.stroke()
    context.fillStyle = 'rgba(255, 255, 255, 0.58)'
    context.beginPath()
    context.arc(fruitX - CELL_SIZE * 0.13, fruitY - CELL_SIZE * 0.12, CELL_SIZE * 0.07, 0, Math.PI * 2)
    context.fill()
  } else if (fruit.type === 'gold') {
    const goldGradient = context.createLinearGradient(
      fruitX - fruitRadius,
      fruitY - fruitRadius,
      fruitX + fruitRadius,
      fruitY + fruitRadius
    )
    goldGradient.addColorStop(0, '#fef3c7')
    goldGradient.addColorStop(0.5, fruitConfig.color)
    goldGradient.addColorStop(1, '#b45309')
    context.fillStyle = goldGradient
    context.beginPath()
    context.moveTo(fruitX, fruitY - fruitRadius)
    context.lineTo(fruitX + fruitRadius * 0.9, fruitY - fruitRadius * 0.12)
    context.lineTo(fruitX + fruitRadius * 0.54, fruitY + fruitRadius * 0.92)
    context.lineTo(fruitX - fruitRadius * 0.54, fruitY + fruitRadius * 0.92)
    context.lineTo(fruitX - fruitRadius * 0.9, fruitY - fruitRadius * 0.12)
    context.closePath()
    context.fill()
    context.shadowBlur = 0
    context.strokeStyle = 'rgba(255, 255, 255, 0.7)'
    context.lineWidth = 1.5
    context.stroke()
  } else if (fruit.type === 'turbo') {
    context.fillStyle = fruitConfig.color
    context.beginPath()
    context.arc(fruitX, fruitY, fruitRadius, 0, Math.PI * 2)
    context.fill()
    context.shadowBlur = 0
    context.fillStyle = '#fff7ed'
    context.beginPath()
    context.moveTo(fruitX - fruitRadius * 0.15, fruitY - fruitRadius * 0.72)
    context.lineTo(fruitX + fruitRadius * 0.42, fruitY - fruitRadius * 0.12)
    context.lineTo(fruitX + fruitRadius * 0.06, fruitY - fruitRadius * 0.12)
    context.lineTo(fruitX + fruitRadius * 0.2, fruitY + fruitRadius * 0.7)
    context.lineTo(fruitX - fruitRadius * 0.42, fruitY + fruitRadius * 0.02)
    context.lineTo(fruitX - fruitRadius * 0.06, fruitY + fruitRadius * 0.02)
    context.closePath()
    context.fill()
  } else if (fruit.type === 'frost') {
    context.fillStyle = fruitConfig.color
    context.beginPath()
    context.arc(fruitX, fruitY, fruitRadius, 0, Math.PI * 2)
    context.fill()
    context.shadowBlur = 0
    context.strokeStyle = '#eff6ff'
    context.lineWidth = 1.7
    for (let i = 0; i < 3; i++) {
      const angle = (Math.PI * i) / 3
      context.beginPath()
      context.moveTo(fruitX + Math.cos(angle) * fruitRadius * 0.72, fruitY + Math.sin(angle) * fruitRadius * 0.72)
      context.lineTo(fruitX - Math.cos(angle) * fruitRadius * 0.72, fruitY - Math.sin(angle) * fruitRadius * 0.72)
      context.stroke()
    }
  } else {
    const rainbowGradient = context.createConicGradient(0, fruitX, fruitY)
    rainbowGradient.addColorStop(0, '#f87171')
    rainbowGradient.addColorStop(0.2, '#facc15')
    rainbowGradient.addColorStop(0.4, '#4ade80')
    rainbowGradient.addColorStop(0.65, '#38bdf8')
    rainbowGradient.addColorStop(0.85, '#c084fc')
    rainbowGradient.addColorStop(1, '#f87171')
    context.fillStyle = rainbowGradient
    context.beginPath()
    context.arc(fruitX, fruitY, fruitRadius, 0, Math.PI * 2)
    context.fill()
    context.shadowBlur = 0
    context.fillStyle = 'rgba(255, 255, 255, 0.72)'
    context.beginPath()
    context.arc(fruitX - CELL_SIZE * 0.1, fruitY - CELL_SIZE * 0.1, CELL_SIZE * 0.07, 0, Math.PI * 2)
    context.fill()
  }

  if (fruit.type !== 'apple') {
    context.strokeStyle = fruitConfig.glow
    context.lineWidth = 2
    context.beginPath()
    context.arc(fruitX, fruitY, CELL_SIZE * (0.5 + Math.max(0, pulse) * 0.06), 0, Math.PI * 2)
    context.stroke()
  }

  context.restore()
}

function getSnakeBadgeUrl(badgeUrl: string) {
  if (badgeUrl.startsWith('https://')) return badgeUrl

  const filename = badgeUrl.split('/').pop() || ''
  return SNAKE_BADGE_PUBLIC_URLS[filename] || badgeUrl
}

export default function SnakeGame({ userId, username, initialStats }: SnakeGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const directionRef = useRef<Direction>('right')
  const nextDirectionRef = useRef<Direction>('right')
  const boardCacheRef = useRef<RenderCache | null>(null)
  const startTimeRef = useRef<number | null>(null)
  const elapsedBeforePauseRef = useRef(0)
  const submittedRef = useRef(false)
  const seedRef = useRef(createSeed())
  const timeAttackLastCollisionAtRef = useRef(0)
  const timeAttackLastPrecisionBonusAtRef = useRef(0)
  const boardPointerStartRef = useRef<{ x: number; y: number; pointerId: number } | null>(null)

  const [gameMode, setGameMode] = useState<GameMode>('arcade')
  const [snakeTheme, setSnakeTheme] = useState<SnakeTheme>(() => {
    if (typeof window === 'undefined') return 'neon'
    const storedTheme = window.localStorage.getItem('snake-theme')
    return isSnakeTheme(storedTheme) ? storedTheme : 'neon'
  })
  const [snake, setSnake] = useState<Point[]>(INITIAL_SNAKE)
  const [food, setFood] = useState<Fruit>(() => createFood(INITIAL_SNAKE, 'arcade'))
  const [gameState, setGameState] = useState<GameState>('ready')
  const [score, setScore] = useState(0)
  const [foodCount, setFoodCount] = useState(0)
  const [fruitCounts, setFruitCounts] = useState<Record<FruitType, number>>({
    apple: 0,
    gold: 0,
    turbo: 0,
    frost: 0,
    rainbow: 0,
  })
  const [level, setLevel] = useState(1)
  const [durationMs, setDurationMs] = useState(0)
  const [timeAttackRemainingMs, setTimeAttackRemainingMs] = useState(TIME_ATTACK_LIMIT_MS)
  const [timeAttackCollisions, setTimeAttackCollisions] = useState(0)
  const [combo, setCombo] = useState(0)
  const [bestCombo, setBestCombo] = useState(0)
  const [comboExpiresAt, setComboExpiresAt] = useState(0)
  const [scoreMultiplierUntil, setScoreMultiplierUntil] = useState(0)
  const [slowMotionUntil, setSlowMotionUntil] = useState(0)
  const [rainbowUntil, setRainbowUntil] = useState(0)
  const [visualBursts, setVisualBursts] = useState<VisualBurst[]>([])
  const [boardFlash, setBoardFlash] = useState<{ id: number; color: string } | null>(null)
  const [boardShake, setBoardShake] = useState(false)
  const [rewardCelebration, setRewardCelebration] = useState<RewardCelebration | null>(null)
  const [stats, setStats] = useState<SnakeStats>(initialStats)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [season, setSeason] = useState<SnakeSeason | null>(null)
  const [seasonLeaderboard, setSeasonLeaderboard] = useState<LeaderboardEntry[]>([])
  const [seasonHistory, setSeasonHistory] = useState<SnakeSeasonHistory[]>([])
  const [achievements, setAchievements] = useState<SnakeAchievement[]>([])
  const [newAchievements, setNewAchievements] = useState<SnakeAchievement[]>([])
  const [lastUnlockedAchievements, setLastUnlockedAchievements] = useState<SnakeAchievement[]>([])
  const [dailyChallenges, setDailyChallenges] = useState<SnakeDailyChallenge[]>([])
  const [completedChallenges, setCompletedChallenges] = useState<SnakeDailyChallenge[]>([])
  const [claimingChallengeId, setClaimingChallengeId] = useState<string | null>(null)
  const [challengeLoadError, setChallengeLoadError] = useState<string | null>(null)
  const [dailyRewards, setDailyRewards] = useState<SnakeDailyRewards | null>(null)
  const [rewardsLoadError, setRewardsLoadError] = useState<string | null>(null)
  const [claimingChest, setClaimingChest] = useState(false)
  const [saveResult, setSaveResult] = useState<SaveResult | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [shareStatus, setShareStatus] = useState<string | null>(null)
  const [lastMilestone, setLastMilestone] = useState<string | null>(null)
  const [soundEnabled, setSoundEnabled] = useState(() => soundManager?.isEnabled() ?? true)
  const [soundVolume, setSoundVolume] = useState(() => soundManager?.getVolume() ?? 0.5)
  const [musicEnabled, setMusicEnabled] = useState(() => soundManager?.isMusicEnabled() ?? true)
  const [musicVolume, setMusicVolume] = useState(() => soundManager?.getMusicVolume() ?? 0.35)

  const now = typeof performance !== 'undefined' ? performance.now() : 0
  const hasScoreMultiplier = scoreMultiplierUntil > now
  const hasSlowMotion = slowMotionUntil > now
  const hasRainbow = rainbowUntil > now
  const modeConfig = GAME_MODE_CONFIG[gameMode]
  const themeConfig = SNAKE_THEME_CONFIG[snakeTheme]
  const rankedMode = modeConfig.ranked
  const leaderboardMode: RankedGameMode = gameMode === 'training' ? 'arcade' : gameMode
  const leaderboardModeConfig = GAME_MODE_CONFIG[leaderboardMode]
  const modeLeaderboardEntry = leaderboard.find((entry) => entry.user_id === userId)
  const comboEnabled = modeConfig.combos
  const isTimeAttack = gameMode === 'timeAttack'
  const timeAttackUrgent = isTimeAttack && timeAttackRemainingMs <= 10000
  const comboActive = comboEnabled && combo > 0 && comboExpiresAt > now
  const comboProgress = comboActive
    ? Math.max(0, Math.min(100, ((comboExpiresAt - now) / COMBO_WINDOW_MS) * 100))
    : 0
  const cinematicBoard = gameState === 'playing' && (hasRainbow || hasScoreMultiplier || hasSlowMotion || timeAttackUrgent || (comboActive && combo >= 6))
  const baseSpeed = Math.max(68, 150 + modeConfig.speedOffset - (level - 1) * 9)
  const speed = hasSlowMotion ? Math.round(baseSpeed * 1.42) : baseSpeed
  const nextLevelProgress = (foodCount % 5) / 5
  const currentRank = rankedMode ? modeLeaderboardEntry?.rank ?? saveResult?.rank ?? stats.rank : null
  const modeBestScore = modeLeaderboardEntry?.best_score ?? (leaderboardMode === 'arcade' ? stats.best_score : 0)
  const projectedBest = Math.max(modeBestScore, score)
  const prefersReducedMotion = typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false
  const boardGlowColor = hasRainbow
    ? '#c084fc'
    : timeAttackUrgent
      ? '#fb7185'
      : hasScoreMultiplier
        ? '#f97316'
        : hasSlowMotion
          ? '#93c5fd'
          : themeConfig.accent

  const playSound = useCallback((soundType: Parameters<NonNullable<typeof soundManager>['play']>[0]) => {
    soundManager?.play(soundType)
  }, [])

  useEffect(() => {
    window.localStorage.setItem('snake-theme', snakeTheme)
  }, [snakeTheme])

  const toggleSound = useCallback(() => {
    const nextEnabled = !soundEnabled
    soundManager?.setEnabled(nextEnabled)
    setSoundEnabled(nextEnabled)
  }, [soundEnabled])

  const changeVolume = useCallback((value: number) => {
    soundManager?.setVolume(value)
    setSoundVolume(value)
  }, [])

  const toggleMusic = useCallback(() => {
    const nextEnabled = !musicEnabled
    soundManager?.setMusicEnabled(nextEnabled)
    setMusicEnabled(nextEnabled)
    if (nextEnabled && gameState === 'playing') {
      soundManager?.playRandomSnakeMusic()
    }
  }, [gameState, musicEnabled])

  const changeMusicVolume = useCallback((value: number) => {
    soundManager?.setMusicVolume(value)
    setMusicVolume(value)
  }, [])

  const triggerEatVisuals = useCallback((eatenFruit: Fruit, gainedScore: number, comboValue: number) => {
    const fruitConfig = FRUIT_CONFIG[eatenFruit.type]
    const burstId = Date.now() + Math.random()
    const comboLabel = comboValue >= 3 ? ` x${comboValue}` : ''

    if (!prefersReducedMotion) {
      setVisualBursts((current) => [
        ...current,
        {
          id: burstId,
          x: (eatenFruit.x + 0.5) / GRID_SIZE * 100,
          y: (eatenFruit.y + 0.5) / GRID_SIZE * 100,
          color: fruitConfig.glow,
          label: `+${gainedScore}${comboLabel}`,
          particles: Array.from({ length: eatenFruit.type === 'apple' ? 8 : 14 }, (_, index) => ({
            id: index,
            angle: (Math.PI * 2 * index) / (eatenFruit.type === 'apple' ? 8 : 14),
            distance: eatenFruit.type === 'apple' ? 34 : 52,
          })),
        },
      ])
      window.setTimeout(() => {
        setVisualBursts((current) => current.filter((burst) => burst.id !== burstId))
      }, 780)
    }

    if (eatenFruit.type !== 'apple' && !prefersReducedMotion) {
      setBoardFlash({ id: burstId, color: fruitConfig.glow })
      window.setTimeout(() => setBoardFlash(null), 180)

      setBoardShake(true)
      window.setTimeout(() => setBoardShake(false), 180)
    }
  }, [prefersReducedMotion])

  const triggerRewardCelebration = useCallback((celebration: Omit<RewardCelebration, 'id'>) => {
    const id = Date.now() + Math.random()
    setRewardCelebration({ id, ...celebration })

    window.setTimeout(() => {
      setRewardCelebration((current) => current?.id === id ? null : current)
    }, prefersReducedMotion ? 2400 : 3600)
  }, [prefersReducedMotion])

  const getElapsedDuration = useCallback(() => {
    if (!startTimeRef.current) return elapsedBeforePauseRef.current
    return elapsedBeforePauseRef.current + Math.round(performance.now() - startTimeRef.current)
  }, [])

  const addTimeAttackBonus = useCallback((bonusMs: number, label: string) => {
    setTimeAttackRemainingMs((current) => Math.min(TIME_ATTACK_MAX_TIME_MS, current + bonusMs))
    setLastMilestone(label)
    window.setTimeout(() => setLastMilestone(null), 900)
  }, [])

  const fetchLeaderboard = useCallback(async () => {
    try {
      const response = await fetch(`/api/snake/leaderboard?limit=10&mode=${leaderboardMode}`)
      const data = await response.json()
      setLeaderboard(data.leaderboard || [])
    } catch (error) {
      console.error('Error cargando ranking Snake:', error)
    }
  }, [leaderboardMode])

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch('/api/snake/stats')
      const data = await response.json()
      if (data.stats) {
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Error cargando estadisticas Snake:', error)
    }
  }, [])

  const fetchSeason = useCallback(async () => {
    try {
      const response = await fetch(`/api/snake/season?mode=${leaderboardMode}`)
      const data = await response.json()
      setSeason(data.season || null)
      setSeasonLeaderboard(data.leaderboard || [])
      setSeasonHistory(data.history || [])
    } catch (error) {
      console.error('Error cargando temporada Snake:', error)
    }
  }, [leaderboardMode])

  const fetchAchievements = useCallback(async () => {
    try {
      const response = await fetch('/api/snake/achievements')
      const data = await response.json()
      setAchievements(data.achievements || [])
    } catch (error) {
      console.error('Error cargando logros Snake:', error)
    }
  }, [])

  const fetchDailyChallenges = useCallback(async () => {
    try {
      const response = await fetch('/api/snake/challenges')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'No se pudieron cargar los retos diarios')
      }

      setDailyChallenges(data.challenges || [])
      setChallengeLoadError(null)
    } catch (error) {
      console.error('Error cargando retos diarios Snake:', error)
      setChallengeLoadError(error instanceof Error ? error.message : 'No se pudieron cargar los retos diarios')
    }
  }, [])

  const fetchDailyRewards = useCallback(async () => {
    try {
      const response = await fetch('/api/snake/rewards')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'No se pudieron cargar las recompensas')
      }

      setDailyRewards(data.rewards || null)
      setRewardsLoadError(null)
    } catch (error) {
      console.error('Error cargando recompensas Snake:', error)
      setRewardsLoadError(error instanceof Error ? error.message : 'No se pudieron cargar las recompensas')
    }
  }, [])

  const claimDailyChallenge = useCallback(async (challengeId: string) => {
    setClaimingChallengeId(challengeId)
    setSaveError(null)

    try {
      const response = await fetch('/api/snake/challenges/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userChallengeId: challengeId }),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'No se pudo reclamar el reto')
      }

      const rewardCoins = Number(data.result?.reward_coins || 0)
      setLastMilestone(`+${formatNumber(rewardCoins)} Turix Coins`)
      triggerRewardCelebration({
        title: 'Premio reclamado',
        detail: 'Reto diario completado',
        amount: rewardCoins,
        tone: 'emerald',
      })
      await Promise.all([fetchDailyChallenges(), fetchDailyRewards()])
    } catch (error: any) {
      setSaveError(error.message || 'No se pudo reclamar el reto')
    } finally {
      setClaimingChallengeId(null)
    }
  }, [fetchDailyChallenges, fetchDailyRewards, triggerRewardCelebration])

  const claimDailyChest = useCallback(async () => {
    if (!dailyRewards?.chest_id) return

    setClaimingChest(true)
    setSaveError(null)

    try {
      const response = await fetch('/api/snake/rewards/chest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chestId: dailyRewards.chest_id }),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'No se pudo abrir el cofre')
      }

      const rewardCoins = Number(data.result?.reward_coins || 0)
      const unlockedAchievements = (data.achievements || []) as SnakeAchievement[]
      setLastMilestone(`Cofre +${formatNumber(rewardCoins)} TC`)
      triggerRewardCelebration({
        title: 'Cofre abierto',
        detail: 'Recompensa diaria Snake',
        amount: rewardCoins,
        tone: 'amber',
      })
      if (unlockedAchievements.length > 0) {
        setLastUnlockedAchievements(unlockedAchievements)
        setNewAchievements(unlockedAchievements)
        window.setTimeout(() => setNewAchievements([]), 5200)
      }
      await Promise.all([fetchDailyRewards(), fetchAchievements()])
    } catch (error: any) {
      setSaveError(error.message || 'No se pudo abrir el cofre')
    } finally {
      setClaimingChest(false)
    }
  }, [dailyRewards?.chest_id, fetchAchievements, fetchDailyRewards, triggerRewardCelebration])

  const copyShareText = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setShareStatus('Copiado')
      window.setTimeout(() => setShareStatus(null), 1800)
    } catch {
      setShareStatus('No se pudo copiar')
      window.setTimeout(() => setShareStatus(null), 1800)
    }
  }, [])

  const openShareUrl = useCallback((url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer')
  }, [])

  const shareResult = useCallback(async (title: string, text: string, url: string) => {
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url })
        setShareStatus('Compartido')
        window.setTimeout(() => setShareStatus(null), 1800)
        return
      } catch (error) {
        if ((error as Error).name === 'AbortError') return
      }
    }

    await copyShareText(`${text} ${url}`)
  }, [copyShareText])

  useEffect(() => {
    fetchLeaderboard()
    fetchSeason()
    fetchAchievements()
    fetchDailyChallenges()
    fetchDailyRewards()
  }, [fetchAchievements, fetchDailyChallenges, fetchDailyRewards, fetchLeaderboard, fetchSeason])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')

    if (!canvas || !context) return

    context.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

    const pulse = prefersReducedMotion ? 0 : Math.sin(Date.now() / 210)
    const effectColor = hasRainbow
      ? '#c084fc'
      : hasScoreMultiplier
        ? '#f97316'
        : hasSlowMotion
          ? '#93c5fd'
          : themeConfig.aura

    const boardKey = `${snakeTheme}:${themeConfig.boardStart}:${themeConfig.boardMiddle}:${themeConfig.boardEnd}:${themeConfig.grid}`
    if (!boardCacheRef.current || boardCacheRef.current.key !== boardKey) {
      const boardCanvas = document.createElement('canvas')
      boardCanvas.width = CANVAS_SIZE
      boardCanvas.height = CANVAS_SIZE
      const boardContext = boardCanvas.getContext('2d')
      if (boardContext) {
        drawBoardLayer(boardContext, themeConfig)
      }
      boardCacheRef.current = { key: boardKey, canvas: boardCanvas }
    }

    context.drawImage(boardCacheRef.current.canvas, 0, 0)

    const boardAura = context.createRadialGradient(
      CANVAS_SIZE * 0.5,
      CANVAS_SIZE * 0.45,
      20,
      CANVAS_SIZE * 0.5,
      CANVAS_SIZE * 0.5,
      CANVAS_SIZE * 0.68
    )
    boardAura.addColorStop(0, `${effectColor}22`)
    boardAura.addColorStop(0.55, 'rgba(15, 23, 42, 0)')
    boardAura.addColorStop(1, 'rgba(15, 23, 42, 0)')
    context.fillStyle = boardAura
    context.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

    const fruitConfig = FRUIT_CONFIG[food.type]
    drawFruitShape(context, food, fruitConfig, pulse)

    if (snake.length > 1) {
      context.save()
      context.globalAlpha = hasRainbow ? 0.6 : 0.52
      context.strokeStyle = hasRainbow ? '#f0abfc' : themeConfig.bodyEnd
      context.lineWidth = CELL_SIZE * 0.58
      context.lineCap = 'round'
      context.lineJoin = 'round'
      context.shadowColor = hasRainbow ? '#f0abfc' : themeConfig.bodyStart
      context.shadowBlur = 9
      context.beginPath()
      snake.forEach((segment, index) => {
        const centerX = segment.x * CELL_SIZE + CELL_SIZE / 2
        const centerY = segment.y * CELL_SIZE + CELL_SIZE / 2
        if (index === 0) {
          context.moveTo(centerX, centerY)
        } else {
          context.lineTo(centerX, centerY)
        }
      })
      context.stroke()
      context.restore()
    }

    snake.forEach((segment, index) => {
      const isHead = index === 0
      const tailFade = snake.length <= 1 ? 1 : 1 - index / snake.length
      const segmentInset = isHead ? 1.8 : 3 + Math.min(2, index * 0.08)
      const segmentSize = CELL_SIZE - segmentInset * 2
      const segmentX = segment.x * CELL_SIZE + segmentInset
      const segmentY = segment.y * CELL_SIZE + segmentInset
      const segmentGradient = context.createLinearGradient(segmentX, segmentY, segmentX + segmentSize, segmentY + segmentSize)
      const previousSegment = snake[index - 1]
      const nextSegment = snake[index + 1]

      if (isHead) {
        segmentGradient.addColorStop(0, hasRainbow ? '#f0abfc' : themeConfig.headStart)
        segmentGradient.addColorStop(1, hasRainbow ? '#facc15' : themeConfig.headEnd)
      } else if (hasRainbow) {
        segmentGradient.addColorStop(0, index % 2 === 0 ? '#facc15' : '#c084fc')
        segmentGradient.addColorStop(1, index % 2 === 0 ? '#34d399' : '#f0abfc')
      } else {
        segmentGradient.addColorStop(0, themeConfig.bodyStart)
        segmentGradient.addColorStop(1, index % 2 === 0 ? themeConfig.bodyEnd : themeConfig.bodyAlt)
      }

      context.globalAlpha = isHead ? 1 : 0.72 + tailFade * 0.28
      context.fillStyle = segmentGradient
      context.shadowColor = isHead ? (hasRainbow ? '#f0abfc' : themeConfig.headStart) : themeConfig.bodyStart
      context.shadowBlur = isHead ? 18 : 5 + tailFade * 5

      if (!isHead && (previousSegment || nextSegment)) {
        const centerX = segment.x * CELL_SIZE + CELL_SIZE / 2
        const centerY = segment.y * CELL_SIZE + CELL_SIZE / 2
        context.beginPath()
        context.arc(centerX, centerY, segmentSize * 0.48, 0, Math.PI * 2)
        context.fill()
      } else {
        fillRoundedCell(context, segmentX, segmentY, segmentSize, isHead ? 7 : 5)
      }

      if (isHead) {
        const directionVector = getDirectionVector(directionRef.current)
        const centerX = segment.x * CELL_SIZE + CELL_SIZE / 2
        const centerY = segment.y * CELL_SIZE + CELL_SIZE / 2
        const eyeOffsetX = directionVector.x * CELL_SIZE * 0.15
        const eyeOffsetY = directionVector.y * CELL_SIZE * 0.15
        const sideOffsetX = directionVector.y * CELL_SIZE * 0.18
        const sideOffsetY = -directionVector.x * CELL_SIZE * 0.18

        context.shadowBlur = 0
        context.globalAlpha = 1
        context.fillStyle = hasRainbow ? '#fde68a' : themeConfig.headEnd
        context.beginPath()
        context.arc(
          centerX + directionVector.x * CELL_SIZE * 0.36,
          centerY + directionVector.y * CELL_SIZE * 0.36,
          CELL_SIZE * 0.18,
          0,
          Math.PI * 2
        )
        context.fill()

        context.fillStyle = themeConfig.eye
        context.beginPath()
        context.arc(centerX + eyeOffsetX + sideOffsetX, centerY + eyeOffsetY + sideOffsetY, 2.4, 0, Math.PI * 2)
        context.arc(centerX + eyeOffsetX - sideOffsetX, centerY + eyeOffsetY - sideOffsetY, 2.4, 0, Math.PI * 2)
        context.fill()

        if (comboActive && combo >= 3) {
          context.strokeStyle = 'rgba(255, 255, 255, 0.55)'
          context.lineWidth = 1.4
          context.beginPath()
          context.arc(
            centerX + directionVector.x * CELL_SIZE * 0.25,
            centerY + directionVector.y * CELL_SIZE * 0.25,
            CELL_SIZE * 0.13,
            0,
            Math.PI
          )
          context.stroke()
        }
      }
    })
    context.globalAlpha = 1
    context.shadowBlur = 0
  }, [combo, comboActive, food, hasRainbow, hasScoreMultiplier, hasSlowMotion, prefersReducedMotion, snake, themeConfig])

  useEffect(() => {
    draw()
  }, [draw])

  const resetGame = useCallback((nextState: GameState = 'ready') => {
    const nextFood = createFood(INITIAL_SNAKE, gameMode)
    setSnake(INITIAL_SNAKE)
    setFood(nextFood)
    setGameState(nextState)
    setScore(0)
    setFoodCount(0)
    setFruitCounts({
      apple: 0,
      gold: 0,
      turbo: 0,
      frost: 0,
      rainbow: 0,
    })
    setLevel(1)
    setDurationMs(0)
    setTimeAttackRemainingMs(TIME_ATTACK_LIMIT_MS)
    setTimeAttackCollisions(0)
    setCombo(0)
    setBestCombo(0)
    setComboExpiresAt(0)
    setScoreMultiplierUntil(0)
    setSlowMotionUntil(0)
    setRainbowUntil(0)
    setSaveResult(null)
    setSaveError(null)
    setShareStatus(null)
    setLastUnlockedAchievements([])
    setCompletedChallenges([])
    setLastMilestone(null)
    directionRef.current = 'right'
    nextDirectionRef.current = 'right'
    startTimeRef.current = nextState === 'playing' ? performance.now() : null
    timeAttackLastCollisionAtRef.current = 0
    timeAttackLastPrecisionBonusAtRef.current = nextState === 'playing' ? performance.now() : 0
    elapsedBeforePauseRef.current = 0
    submittedRef.current = false
    seedRef.current = createSeed()
  }, [gameMode])

  const selectGameMode = useCallback((nextMode: GameMode) => {
    if (gameState === 'playing' || gameState === 'paused') return

    setGameMode(nextMode)
    const nextFood = createFood(INITIAL_SNAKE, nextMode)
    setSnake(INITIAL_SNAKE)
    setFood(nextFood)
    setGameState('ready')
    setScore(0)
    setFoodCount(0)
    setFruitCounts({
      apple: 0,
      gold: 0,
      turbo: 0,
      frost: 0,
      rainbow: 0,
    })
    setLevel(1)
    setDurationMs(0)
    setTimeAttackRemainingMs(TIME_ATTACK_LIMIT_MS)
    setTimeAttackCollisions(0)
    setCombo(0)
    setBestCombo(0)
    setComboExpiresAt(0)
    setScoreMultiplierUntil(0)
    setSlowMotionUntil(0)
    setRainbowUntil(0)
    setSaveResult(null)
    setSaveError(null)
    setShareStatus(null)
    setLastUnlockedAchievements([])
    setCompletedChallenges([])
    setLastMilestone(null)
    directionRef.current = 'right'
    nextDirectionRef.current = 'right'
    startTimeRef.current = null
    timeAttackLastCollisionAtRef.current = 0
    timeAttackLastPrecisionBonusAtRef.current = 0
    elapsedBeforePauseRef.current = 0
    submittedRef.current = false
    seedRef.current = createSeed()
  }, [gameState])

  const startGame = useCallback(() => {
    if (gameState === 'gameOver') {
      resetGame('playing')
      playSound('snake_start')
      if (musicEnabled) {
        soundManager?.playRandomSnakeMusic()
      }
      return
    }

    if (!startTimeRef.current) {
      const startedAt = performance.now()
      startTimeRef.current = startedAt
      if (isTimeAttack) {
        timeAttackLastPrecisionBonusAtRef.current = startedAt
      }
    }
    setGameState('playing')
    playSound('snake_start')
    if (musicEnabled) {
      soundManager?.playRandomSnakeMusic()
    }
  }, [gameState, isTimeAttack, musicEnabled, playSound, resetGame])

  const pauseGame = useCallback(() => {
    elapsedBeforePauseRef.current = getElapsedDuration()
    startTimeRef.current = null
    setDurationMs(elapsedBeforePauseRef.current)
    setGameState('paused')
    soundManager?.stopMusic()
  }, [getElapsedDuration])

  const changeDirection = useCallback((direction: Direction) => {
    if (getOpposite(directionRef.current) === direction) return false
    if (nextDirectionRef.current === direction) return false
    nextDirectionRef.current = direction
    return true
  }, [])

  const changeDirectionWithFeedback = useCallback((direction: Direction) => {
    const changed = changeDirection(direction)
    if (changed && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(12)
    }
    return changed
  }, [changeDirection])

  const getBoardDirectionFromPoint = useCallback((clientX: number, clientY: number, boardElement: HTMLElement): Direction => {
    const rect = boardElement.getBoundingClientRect()
    const head = snake[0] || INITIAL_SNAKE[0]
    const headX = rect.left + ((head.x + 0.5) / GRID_SIZE) * rect.width
    const headY = rect.top + ((head.y + 0.5) / GRID_SIZE) * rect.height
    const deltaX = clientX - headX
    const deltaY = clientY - headY

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      return deltaX > 0 ? 'right' : 'left'
    }

    return deltaY > 0 ? 'down' : 'up'
  }, [snake])

  const handleBoardPointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (gameState !== 'playing' || !event.isPrimary) return
    event.preventDefault()
    boardPointerStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      pointerId: event.pointerId,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }, [gameState])

  const handleBoardPointerUp = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const pointerStart = boardPointerStartRef.current
    if (gameState !== 'playing' || !pointerStart || pointerStart.pointerId !== event.pointerId) return

    event.preventDefault()
    boardPointerStartRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    const deltaX = event.clientX - pointerStart.x
    const deltaY = event.clientY - pointerStart.y
    const isSwipe = Math.max(Math.abs(deltaX), Math.abs(deltaY)) >= BOARD_SWIPE_THRESHOLD_PX

    if (isSwipe) {
      changeDirectionWithFeedback(
        Math.abs(deltaX) > Math.abs(deltaY)
          ? deltaX > 0 ? 'right' : 'left'
          : deltaY > 0 ? 'down' : 'up'
      )
      return
    }

    changeDirectionWithFeedback(getBoardDirectionFromPoint(event.clientX, event.clientY, event.currentTarget))
  }, [changeDirectionWithFeedback, gameState, getBoardDirectionFromPoint])

  const handleBoardPointerCancel = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (boardPointerStartRef.current?.pointerId === event.pointerId) {
      boardPointerStartRef.current = null
    }
  }, [])

  const finishGame = useCallback(() => {
    const finalDuration = getElapsedDuration()
    elapsedBeforePauseRef.current = finalDuration
    startTimeRef.current = null
    setDurationMs(finalDuration)
    setGameState('gameOver')
    soundManager?.stopMusic()
    playSound('snake_game_over')
  }, [getElapsedDuration, playSound])

  useEffect(() => {
    return () => {
      soundManager?.stopMusic()
    }
  }, [])

  useEffect(() => {
    if (gameState !== 'playing') return

    const interval = window.setInterval(() => {
      setSnake((currentSnake) => {
        directionRef.current = nextDirectionRef.current
        const head = currentSnake[0]
        const nextHead: Point = { ...head }

        if (directionRef.current === 'up') nextHead.y -= 1
        if (directionRef.current === 'down') nextHead.y += 1
        if (directionRef.current === 'left') nextHead.x -= 1
        if (directionRef.current === 'right') nextHead.x += 1

        const hitWall =
          nextHead.x < 0 ||
          nextHead.x >= GRID_SIZE ||
          nextHead.y < 0 ||
          nextHead.y >= GRID_SIZE
        const hitSelf = currentSnake.some(
          (segment) => segment.x === nextHead.x && segment.y === nextHead.y
        )

        if (hitWall || hitSelf) {
          if (isTimeAttack) {
            const collisionAt = performance.now()
            timeAttackLastCollisionAtRef.current = collisionAt
            timeAttackLastPrecisionBonusAtRef.current = collisionAt
            setTimeAttackCollisions((current) => current + 1)
            setTimeAttackRemainingMs((current) => {
              const nextRemaining = Math.max(0, current - TIME_ATTACK_COLLISION_PENALTY_MS)
              if (current > 0 && nextRemaining <= 0) {
                window.setTimeout(() => finishGame(), 0)
              }
              return nextRemaining
            })
            setScore((currentScore) => Math.max(0, currentScore - 50))
            setLastMilestone('-5s')
            window.setTimeout(() => setLastMilestone(null), 900)
            setBoardShake(true)
            window.setTimeout(() => setBoardShake(false), 200)
            directionRef.current = 'right'
            nextDirectionRef.current = 'right'
            setFood(createFood(INITIAL_SNAKE, gameMode))
            return INITIAL_SNAKE
          }

          finishGame()
          return currentSnake
        }

        const ateFood = nextHead.x === food.x && nextHead.y === food.y
        const nextSnake = [nextHead, ...currentSnake]

        if (ateFood) {
          const nextFoodCount = foodCount + 1
          const nextLevel = Math.min(10, Math.floor(nextFoodCount / 5) + 1)
          const fruitConfig = FRUIT_CONFIG[food.type]
          const eatenAt = performance.now()
          const nextCombo = comboEnabled && comboExpiresAt > eatenAt ? combo + 1 : 1
          const activeMultiplier = scoreMultiplierUntil > eatenAt ? 2 : 1
          const comboMultiplier = comboEnabled ? getComboMultiplier(nextCombo) : 1
          const gainedScore = Math.min(
            100,
            Math.round(fruitConfig.points(nextLevel) * activeMultiplier * comboMultiplier)
          )

          playSound(nextFoodCount % 5 === 0 ? 'snake_level_up' : 'snake_eat')
          triggerEatVisuals(food, gainedScore, nextCombo)
          setFoodCount(nextFoodCount)
          setFruitCounts((current) => ({
            ...current,
            [food.type]: current[food.type] + 1,
          }))
          setLevel(nextLevel)
          setScore((currentScore) => currentScore + gainedScore)
          if (comboEnabled) {
            setCombo(nextCombo)
            setBestCombo((currentBest) => Math.max(currentBest, nextCombo))
            setComboExpiresAt(eatenAt + COMBO_WINDOW_MS)

            if (isTimeAttack && nextCombo % TIME_ATTACK_COMBO_BONUS_THRESHOLD === 0) {
              const comboBonusMs = nextCombo % TIME_ATTACK_COMBO_BIG_THRESHOLD === 0
                ? TIME_ATTACK_COMBO_BIG_BONUS_MS
                : TIME_ATTACK_COMBO_BONUS_MS
              addTimeAttackBonus(comboBonusMs, `+${comboBonusMs / 1000}s combo`)
            }
          }
          setFood(createFood(nextSnake, gameMode))

          if (isTimeAttack && food.type === 'gold') {
            addTimeAttackBonus(TIME_ATTACK_GOLD_BONUS_MS, '+3s dorada')
          }

          if (food.type === 'turbo') {
            setScoreMultiplierUntil(performance.now() + (fruitConfig.durationMs || 5000))
            setLastMilestone('Turbo 2x')
            window.setTimeout(() => setLastMilestone(null), 1100)
          }

          if (food.type === 'frost') {
            setSlowMotionUntil(performance.now() + (fruitConfig.durationMs || 5000))
            if (isTimeAttack) {
              addTimeAttackBonus(TIME_ATTACK_FROST_BONUS_MS, '+2s hielo')
            } else {
              setLastMilestone('Camara lenta')
              window.setTimeout(() => setLastMilestone(null), 1100)
            }
          }

          if (food.type === 'rainbow') {
            setScoreMultiplierUntil(performance.now() + (fruitConfig.durationMs || 6000))
            setRainbowUntil(performance.now() + (fruitConfig.durationMs || 6000))
            if (isTimeAttack) {
              addTimeAttackBonus(TIME_ATTACK_RAINBOW_BONUS_MS, '+5s arcoiris')
            } else {
              setLastMilestone('Arcoiris')
              window.setTimeout(() => setLastMilestone(null), 1100)
            }
          }

          if (nextFoodCount % 5 === 0) {
            if (isTimeAttack) {
              addTimeAttackBonus(TIME_ATTACK_LEVEL_BONUS_MS, '+4s nivel')
            } else {
              setLastMilestone(`Nivel ${nextLevel}`)
              window.setTimeout(() => setLastMilestone(null), 1100)
            }
          }

          return nextSnake
        }

        nextSnake.pop()
        return nextSnake
      })
    }, speed)

    return () => window.clearInterval(interval)
  }, [addTimeAttackBonus, combo, comboEnabled, comboExpiresAt, finishGame, food, foodCount, gameMode, gameState, isTimeAttack, playSound, scoreMultiplierUntil, speed, triggerEatVisuals])

  useEffect(() => {
    if (gameState !== 'playing') return

    const timer = window.setInterval(() => {
      setDurationMs(getElapsedDuration())
    }, 250)

    return () => window.clearInterval(timer)
  }, [gameState, getElapsedDuration])

  useEffect(() => {
    if (gameState !== 'playing' || !isTimeAttack) return

    const timer = window.setInterval(() => {
      const tickAt = performance.now()

      setTimeAttackRemainingMs((current) => {
        const nextRemaining = Math.max(0, current - 250)
        if (current > 0 && nextRemaining <= 0) {
          window.setTimeout(() => finishGame(), 0)
        }
        return nextRemaining
      })

      if (
        tickAt - timeAttackLastCollisionAtRef.current >= TIME_ATTACK_PRECISION_WINDOW_MS &&
        tickAt - timeAttackLastPrecisionBonusAtRef.current >= TIME_ATTACK_PRECISION_WINDOW_MS
      ) {
        timeAttackLastPrecisionBonusAtRef.current = tickAt
        addTimeAttackBonus(TIME_ATTACK_PRECISION_BONUS_MS, '+3s precision')
      }
    }, 250)

    return () => window.clearInterval(timer)
  }, [addTimeAttackBonus, finishGame, gameState, isTimeAttack])

  useEffect(() => {
    if (gameState !== 'playing' || !comboEnabled || combo === 0) return

    const timer = window.setInterval(() => {
      if (performance.now() > comboExpiresAt) {
        setCombo(0)
      }
    }, 250)

    return () => window.clearInterval(timer)
  }, [combo, comboEnabled, comboExpiresAt, gameState])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowUp' || event.key.toLowerCase() === 'w') {
        event.preventDefault()
        changeDirection('up')
      }
      if (event.key === 'ArrowDown' || event.key.toLowerCase() === 's') {
        event.preventDefault()
        changeDirection('down')
      }
      if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') {
        event.preventDefault()
        changeDirection('left')
      }
      if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') {
        event.preventDefault()
        changeDirection('right')
      }
      if (event.key === ' ') {
        event.preventDefault()
        if (gameState === 'playing') pauseGame()
        if (gameState === 'paused' || gameState === 'ready' || gameState === 'gameOver') startGame()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [changeDirection, gameState, pauseGame, startGame])

  useEffect(() => {
    const saveScore = async () => {
      if (gameState !== 'gameOver' || submittedRef.current || score <= 0) return

      submittedRef.current = true

      if (!rankedMode) {
        setSaveResult(null)
        setSaveError(null)
        return
      }

      setSaving(true)
      setSaveError(null)

      try {
        const response = await fetch('/api/snake/score', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            score,
            durationMs,
            foodCount,
            maxLength: snake.length,
            levelReached: level,
            clientSeed: seedRef.current,
            metadata: {
              gameMode,
              ranked: rankedMode,
              gridSize: GRID_SIZE,
              speed,
              baseSpeed,
              fruitCounts,
              combo: {
                current: combo,
                best: bestCombo,
                windowMs: COMBO_WINDOW_MS,
                enabled: comboEnabled,
              },
              effects: {
                scoreMultiplierUsed: fruitCounts.turbo + fruitCounts.rainbow,
                slowMotionUsed: fruitCounts.frost,
                specialFruitsEnabled: modeConfig.specialFruits,
              },
              timeAttack: {
                enabled: isTimeAttack,
                limitMs: TIME_ATTACK_LIMIT_MS,
                remainingMs: isTimeAttack ? timeAttackRemainingMs : null,
                collisionPenaltyMs: TIME_ATTACK_COLLISION_PENALTY_MS,
                collisions: timeAttackCollisions,
                maxTimeMs: TIME_ATTACK_MAX_TIME_MS,
                bonuses: {
                  comboMs: TIME_ATTACK_COMBO_BONUS_MS,
                  comboBigMs: TIME_ATTACK_COMBO_BIG_BONUS_MS,
                  levelMs: TIME_ATTACK_LEVEL_BONUS_MS,
                  goldMs: TIME_ATTACK_GOLD_BONUS_MS,
                  frostMs: TIME_ATTACK_FROST_BONUS_MS,
                  rainbowMs: TIME_ATTACK_RAINBOW_BONUS_MS,
                  precisionMs: TIME_ATTACK_PRECISION_BONUS_MS,
                  precisionWindowMs: TIME_ATTACK_PRECISION_WINDOW_MS,
                },
              },
              userAgent: navigator.userAgent.slice(0, 160),
            },
          }),
        })
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'No se pudo guardar el puntaje')
        }

        const result = data.result as SaveResult | null
        if (result) {
          setSaveResult(result)
          if (result.is_personal_best) {
            playSound('snake_new_record')
          }
        }
        const unlockedAchievements = (data.achievements || []) as SnakeAchievement[]
        if (unlockedAchievements.length > 0) {
          setLastUnlockedAchievements(unlockedAchievements)
          setNewAchievements(unlockedAchievements)
          window.setTimeout(() => setNewAchievements([]), 5200)
        }
        const unlockedChallenges = (data.completedChallenges || []) as SnakeDailyChallenge[]
        if (unlockedChallenges.length > 0) {
          setCompletedChallenges(unlockedChallenges)
          setLastMilestone(`${unlockedChallenges.length} reto${unlockedChallenges.length === 1 ? '' : 's'} diario${unlockedChallenges.length === 1 ? '' : 's'} listo${unlockedChallenges.length === 1 ? '' : 's'}`)
        }
        if (data.dailyReward?.reward_claimed) {
          setLastMilestone(`Racha dia ${data.dailyReward.current_streak}: +${formatNumber(data.dailyReward.reward_coins)} TC`)
        }
        await Promise.all([fetchLeaderboard(), fetchStats(), fetchSeason(), fetchAchievements(), fetchDailyChallenges(), fetchDailyRewards()])
      } catch (error: any) {
        setSaveError(error.message || 'No se pudo guardar el puntaje')
      } finally {
        setSaving(false)
      }
    }

    saveScore()
  }, [baseSpeed, bestCombo, combo, comboEnabled, durationMs, fetchAchievements, fetchDailyChallenges, fetchDailyRewards, fetchLeaderboard, fetchSeason, fetchStats, foodCount, fruitCounts, gameMode, gameState, isTimeAttack, level, modeConfig.specialFruits, playSound, rankedMode, score, snake.length, speed, timeAttackCollisions, timeAttackRemainingMs])

  const stateLabel = gameState === 'playing'
    ? 'En partida'
    : gameState === 'paused'
      ? 'Pausa'
      : gameState === 'gameOver'
        ? 'Partida terminada'
        : 'Listo para jugar'

  const overlayTitle = gameState === 'gameOver'
    ? !rankedMode
      ? 'Practica finalizada'
      : saveResult?.is_personal_best
      ? 'Nuevo record personal'
      : 'Partida finalizada'
    : gameState === 'paused'
      ? 'Partida en pausa'
      : 'Snake Mundial'

  const overlayText = gameState === 'gameOver'
    ? !rankedMode
      ? `Entrenaste con ${formatNumber(score)} puntos, nivel ${level} y ${foodCount} objetivos.`
      : `Cerraste con ${formatNumber(score)} puntos, nivel ${level} y ${foodCount} objetivos.`
      : gameState === 'paused'
        ? 'Respira, mira el tablero y vuelve cuando estes listo.'
      : isTimeAttack
        ? 'Tienes 60 segundos: frutas raras, niveles, combos y precision pueden rescatar la partida.'
        : rankedMode
        ? 'Una partida rapida puede moverte en el ranking global de Turix.'
        : 'Practica sin presion antes de competir por el ranking.'

  const seasonEndsAt = season?.ends_at ? new Date(season.ends_at) : null
  const seasonMsLeft = seasonEndsAt ? Math.max(0, seasonEndsAt.getTime() - Date.now()) : 0
  const seasonDaysLeft = Math.floor(seasonMsLeft / 86400000)
  const seasonHoursLeft = Math.floor((seasonMsLeft % 86400000) / 3600000)
  const seasonUserEntry = seasonLeaderboard.find((entry) => entry.user_id === userId)
  const visibleFruitTypes = modeConfig.specialFruits
    ? (Object.keys(FRUIT_CONFIG) as FruitType[])
    : (['apple'] as FruitType[])
  const topTenEntry = leaderboard[9]
  const pointsToTopTen = rankedMode && topTenEntry
    ? Math.max(0, topTenEntry.best_score - score + 1)
    : null
  const favoriteFruit = (Object.keys(fruitCounts) as FruitType[]).reduce<FruitType>((bestFruit, fruitType) => {
    return fruitCounts[fruitType] > fruitCounts[bestFruit] ? fruitType : bestFruit
  }, 'apple')
  const resultRankMessage = !rankedMode
    ? 'Practica libre: tu puntaje no afecta rankings.'
    : saveError
      ? 'Esta partida no fue aceptada por el ranking. Revisa el mensaje y juega otra partida.'
      : saving
        ? 'Guardando tu partida en el ranking...'
    : saveResult?.rank
      ? `Quedaste en la posicion #${saveResult.rank} del modo ${leaderboardModeConfig.label}.`
      : pointsToTopTen === null
        ? `El top 10 ${leaderboardModeConfig.label} todavia tiene espacio.`
        : pointsToTopTen <= 0
          ? `Entraste al top 10 ${leaderboardModeConfig.label}.`
          : `Te faltaron ${formatNumber(pointsToTopTen)} puntos para entrar al top 10.`
  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/snake` : 'https://turix.club/snake'
  const shareTitle = 'Snake Mundial en Turix'
  const shareText = saveResult?.rank
    ? `Hice ${formatNumber(score)} puntos y quede #${saveResult.rank} en Snake Mundial (${leaderboardModeConfig.label}) de Turix.`
    : `Hice ${formatNumber(score)} puntos en Snake Mundial de Turix.`
  const encodedShareText = encodeURIComponent(shareText)
  const encodedShareUrl = encodeURIComponent(shareUrl)

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <AnimatePresence>
        {rewardCelebration && (
          <motion.div
            key={rewardCelebration.id}
            className="pointer-events-none fixed inset-x-0 top-20 z-[60] flex justify-center px-4"
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -18, scale: 0.94 }}
            animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: prefersReducedMotion ? 0.12 : 0.28, ease: 'easeOut' }}
          >
            <div className={`relative w-[min(420px,calc(100vw-2rem))] overflow-hidden rounded-lg border p-4 shadow-2xl backdrop-blur ${
              rewardCelebration.tone === 'amber'
                ? 'border-amber-300/50 bg-amber-300/15 shadow-amber-950/50'
                : 'border-emerald-300/50 bg-emerald-300/15 shadow-emerald-950/50'
            }`}>
              <div className="absolute inset-0 opacity-30" style={{
                background: rewardCelebration.tone === 'amber'
                  ? 'radial-gradient(circle at 20% 20%, rgba(250, 204, 21, 0.75), transparent 34%), radial-gradient(circle at 90% 10%, rgba(34, 211, 238, 0.45), transparent 28%)'
                  : 'radial-gradient(circle at 20% 20%, rgba(52, 211, 153, 0.7), transparent 34%), radial-gradient(circle at 90% 10%, rgba(34, 211, 238, 0.45), transparent 28%)',
              }} />
              <div className="relative flex items-center gap-3">
                <motion.div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${
                    rewardCelebration.tone === 'amber'
                      ? 'bg-amber-300 text-slate-950'
                      : 'bg-emerald-300 text-slate-950'
                  }`}
                  animate={prefersReducedMotion ? undefined : { rotate: [0, -8, 8, 0], scale: [1, 1.08, 1] }}
                  transition={{ duration: 0.7, ease: 'easeOut' }}
                >
                  <Trophy className="h-6 w-6" />
                </motion.div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black uppercase tracking-wider text-cyan-50/65">
                    {rewardCelebration.detail}
                  </p>
                  <p className="truncate text-lg font-black text-white">{rewardCelebration.title}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs font-bold text-cyan-50/65">Turix Coins</p>
                  <p className={`text-2xl font-black ${
                    rewardCelebration.tone === 'amber' ? 'text-amber-200' : 'text-emerald-200'
                  }`}>
                    +{formatNumber(rewardCelebration.amount)}
                  </p>
                </div>
              </div>
              {!prefersReducedMotion && (
                <div className="pointer-events-none absolute inset-0">
                  {Array.from({ length: 10 }, (_, index) => (
                    <span
                      key={index}
                      className={`snake-reward-spark ${rewardCelebration.tone === 'amber' ? 'bg-amber-200' : 'bg-emerald-200'}`}
                      style={{
                        left: `${10 + index * 9}%`,
                        top: `${index % 2 === 0 ? 18 : 72}%`,
                        animationDelay: `${index * 55}ms`,
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {newAchievements.length > 0 && (
          <motion.div
            className="fixed right-4 top-20 z-50 w-[min(360px,calc(100vw-2rem))] space-y-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
          {newAchievements.map((achievement) => (
            <motion.div
              key={achievement.id}
              className="rounded-lg border border-emerald-300/40 bg-slate-950/95 p-4 shadow-2xl shadow-emerald-950/50 backdrop-blur"
              initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: 22, scale: 0.96 }}
              animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, x: 0, scale: 1 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: 22, scale: 0.96 }}
              transition={{ duration: prefersReducedMotion ? 0.12 : 0.24, ease: 'easeOut' }}
            >
              <div className="flex items-center gap-3">
                <AchievementImage achievement={achievement} size="sm" />
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wider text-emerald-200">Insignia desbloqueada</p>
                  <p className="truncate text-lg font-black">{achievement.name}</p>
                  <p className="text-sm text-cyan-50/70">
                    {achievement.coins_reward ? `+${formatNumber(achievement.coins_reward)} TC · ` : ''}
                    {achievement.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
          </motion.div>
        )}
      </AnimatePresence>

      <header className="border-b border-white/10 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-200 hover:text-white">
            <Home className="h-4 w-4" />
            Dashboard
          </Link>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wider text-cyan-200/80">Snake Mundial</p>
            <p className="font-bold text-white">{username}</p>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:px-8">
        <section className="space-y-4">
          <div className="rounded-lg border border-white/10 bg-gradient-to-r from-cyan-950 via-slate-900 to-emerald-950 p-5 shadow-2xl">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-cyan-100">
                  <Activity className="h-3.5 w-3.5" />
                  {stateLabel}
                </div>
                <h1 className="text-3xl font-black sm:text-5xl">Snake Mundial</h1>
                <p className="mt-2 max-w-2xl text-sm text-cyan-50/75 sm:text-base">
                  {modeConfig.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-right sm:grid-cols-3">
                <div className="rounded-lg bg-white/10 px-4 py-3">
                  <p className="text-xs text-cyan-100/70">Record {leaderboardModeConfig.label}</p>
                  <p className="text-2xl font-black">{formatNumber(projectedBest)}</p>
                </div>
                <div className="rounded-lg bg-white/10 px-4 py-3">
                  <p className="text-xs text-cyan-100/70">{rankedMode ? 'Ranking' : 'Modo'}</p>
                  <p className="text-2xl font-black">{rankedMode ? currentRank ? `#${currentRank}` : '-' : 'Libre'}</p>
                </div>
                <div className="rounded-lg bg-white/10 px-4 py-3">
                  <p className="text-xs text-cyan-100/70">Partidas</p>
                  <p className="text-2xl font-black">{formatNumber(stats.games_played)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wider text-cyan-100/60">Modo de partida</p>
                <p className="font-bold text-white">{modeConfig.label}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider ${
                rankedMode
                  ? 'bg-emerald-300 text-slate-950'
                  : 'bg-white/10 text-cyan-100'
              }`}>
                {rankedMode ? 'Cuenta para ranking' : 'Sin ranking'}
              </span>
            </div>
            <div className="grid gap-2 md:grid-cols-3">
              {(Object.keys(GAME_MODE_CONFIG) as GameMode[]).map((mode) => (
                <motion.button
                  key={mode}
                  type="button"
                  disabled={gameState === 'playing' || gameState === 'paused'}
                  onClick={() => selectGameMode(mode)}
                  whileHover={gameState === 'playing' || gameState === 'paused' || prefersReducedMotion ? undefined : { y: -2 }}
                  whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
                  className={`rounded-lg border p-3 text-left transition ${
                    gameMode === mode
                      ? 'border-cyan-300/60 bg-cyan-300/15 text-white shadow-lg shadow-cyan-950/30'
                      : 'border-white/10 bg-slate-950/50 text-cyan-50/75 hover:border-white/25 hover:bg-white/[0.06]'
                  } disabled:cursor-not-allowed disabled:opacity-70`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-black">{GAME_MODE_CONFIG[mode].label}</p>
                    <span className="rounded-full bg-white/10 px-2 py-1 text-[11px] font-bold uppercase tracking-wider">
                      {GAME_MODE_CONFIG[mode].shortLabel}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-cyan-50/65">
                    {GAME_MODE_CONFIG[mode].description}
                  </p>
                </motion.button>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wider text-cyan-100/60">Estilo visual</p>
                <p className="font-bold text-white">{themeConfig.label}</p>
              </div>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-cyan-100">
                Gratis
              </span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
              {(Object.keys(SNAKE_THEME_CONFIG) as SnakeTheme[]).map((theme) => {
                const themeOption = SNAKE_THEME_CONFIG[theme]
                const selected = snakeTheme === theme

                return (
                  <motion.button
                    key={theme}
                    type="button"
                    onClick={() => setSnakeTheme(theme)}
                    whileHover={prefersReducedMotion ? undefined : { y: -2 }}
                    whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
                    className={`rounded-lg border p-3 text-left transition ${
                      selected
                        ? 'border-cyan-300/60 bg-cyan-300/15 text-white shadow-lg shadow-cyan-950/30'
                        : 'border-white/10 bg-slate-950/50 text-cyan-50/75 hover:border-white/25 hover:bg-white/[0.06]'
                    }`}
                  >
                    <div className="mb-3 flex gap-1">
                      {[themeOption.headEnd, themeOption.bodyStart, themeOption.bodyEnd].map((color) => (
                        <span
                          key={color}
                          className="h-5 flex-1 rounded-full border border-white/20"
                          style={{ backgroundColor: color, boxShadow: `0 0 12px ${color}66` }}
                        />
                      ))}
                    </div>
                    <p className="text-sm font-black leading-tight">{themeOption.label}</p>
                    <p className="mt-1 text-xs leading-relaxed text-cyan-50/60">{themeOption.description}</p>
                  </motion.button>
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <MetricCard label="Puntaje" value={formatNumber(score)} tone="cyan" />
            <MetricCard label="Nivel" value={String(level)} tone="emerald" />
            <MetricCard label="Objetivos" value={String(foodCount)} tone="rose" />
            <MetricCard label="Combo" value={comboActive ? `x${combo}` : '-'} tone="amber" />
            <MetricCard
              label={isTimeAttack ? 'Restante' : 'Tiempo'}
              value={formatTime(isTimeAttack ? timeAttackRemainingMs : durationMs)}
              tone={timeAttackUrgent ? 'rose' : 'violet'}
            />
          </div>

          <div className="grid gap-3 md:grid-cols-[1fr_1.2fr]">
            <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
              <p className="text-xs uppercase tracking-wider text-cyan-100/60">Fruta en tablero</p>
              <div className="mt-2 flex items-center gap-3">
                <FruitDot fruitType={food.type} />
                <div>
                  <p className="font-black">{FRUIT_CONFIG[food.type].label}</p>
                  <p className="text-sm text-cyan-50/60">
                    {food.type === 'apple' && 'Puntos base.'}
                    {food.type === 'gold' && 'Mas puntos por objetivo.'}
                    {food.type === 'turbo' && 'Activa multiplicador 2x.'}
                    {food.type === 'frost' && 'Reduce la velocidad temporalmente.'}
                    {food.type === 'rainbow' && 'Bono grande y efecto visual.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
              <p className="text-xs uppercase tracking-wider text-cyan-100/60">Efectos activos</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <EffectPill active={hasScoreMultiplier} label="2x puntos" />
                <EffectPill active={comboActive && combo >= 3} label={`Combo x${combo}`} />
                <EffectPill active={hasSlowMotion} label="Camara lenta" />
                <EffectPill active={hasRainbow} label="Arcoiris" />
                <EffectPill active={isTimeAttack} label="Contra reloj" />
              </div>
            </div>
          </div>

          {isTimeAttack && (
            <div className={`rounded-lg border p-4 ${
              timeAttackUrgent
                ? 'border-rose-300/35 bg-rose-300/12'
                : 'border-cyan-300/20 bg-cyan-300/10'
            }`}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wider text-cyan-100/70">Modo Contra Reloj</p>
                  <p className="mt-1 font-bold text-white">
                    Dorada +3s, hielo +2s, arcoiris +5s, nivel +4s. Combo x5 +3s y x10 +6s.
                  </p>
                  <p className="mt-1 text-xs text-cyan-50/65">
                    Cada 15s sin chocar suma +3s. Chocar resta 5s.
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs text-cyan-100/70">Choques</p>
                  <p className="text-2xl font-black text-rose-100">{timeAttackCollisions}</p>
                </div>
              </div>
            </div>
          )}

          {comboEnabled ? (
            <div className="rounded-lg border border-amber-300/20 bg-amber-300/10 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wider text-amber-100/70">Racha activa</p>
                  <p className="text-lg font-black text-white">
                    {comboActive ? `Combo x${combo}` : 'Sin combo'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-amber-100/70">Mejor de esta partida</p>
                  <p className="text-2xl font-black text-amber-200">x{bestCombo}</p>
                </div>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-950/60">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-300 via-rose-300 to-cyan-300 transition-all"
                  style={{ width: `${comboProgress}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-amber-50/70">
                Encadena frutas antes de que se agote la barra para activar bonos de puntos.
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-emerald-300/20 bg-emerald-300/10 p-4">
              <p className="text-xs uppercase tracking-wider text-emerald-100/70">Reglas clasicas</p>
              <p className="mt-1 font-bold text-white">Sin combos ni frutas especiales.</p>
              <p className="mt-2 text-xs text-emerald-50/70">
                Este modo deja una base limpia para torneos competitivos con reglas estables.
              </p>
            </div>
          )}

          <div
            className={`overflow-hidden rounded-lg border border-white/10 bg-slate-950 shadow-2xl transition-shadow duration-300 ${
              boardShake ? 'snake-board-shake' : ''
            }`}
            style={{
              boxShadow: `0 22px 70px rgba(0, 0, 0, 0.45), 0 0 34px ${boardGlowColor}44`,
            }}
          >
            <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.03] px-4 py-3">
              <div>
                <p className="text-xs uppercase tracking-wider text-cyan-100/60">Velocidad</p>
                <p className="font-bold">{Math.round(1000 / speed)} pasos/s</p>
              </div>
              {isTimeAttack && (
                <div className="text-center">
                  <p className="text-xs uppercase tracking-wider text-cyan-100/60">Contra reloj</p>
                  <p className={`font-black ${timeAttackUrgent ? 'text-rose-200' : 'text-cyan-100'}`}>
                    {formatTime(timeAttackRemainingMs)}
                  </p>
                </div>
              )}
              <div className="w-48 max-w-[50%]">
                <div className="mb-1 flex justify-between text-xs text-cyan-100/70">
                  <span>Progreso nivel</span>
                  <span>{foodCount % 5}/5</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-emerald-300 transition-all"
                    style={{ width: `${nextLevelProgress * 100}%` }}
                  />
                </div>
              </div>
            </div>

            <div
              className="relative mx-auto aspect-square w-full max-w-[640px] touch-none select-none"
              onPointerDown={handleBoardPointerDown}
              onPointerUp={handleBoardPointerUp}
              onPointerCancel={handleBoardPointerCancel}
              onPointerLeave={handleBoardPointerCancel}
            >
              <canvas
                ref={canvasRef}
                width={CANVAS_SIZE}
                height={CANVAS_SIZE}
                className="h-full w-full"
              />

              {cinematicBoard && !prefersReducedMotion && (
                <>
                  <div
                    className="pointer-events-none absolute inset-0 snake-cinematic-vignette"
                    style={{ ['--snake-cinema-color' as string]: boardGlowColor }}
                  />
                  <div
                    className="pointer-events-none absolute inset-0 snake-cinematic-sweep"
                    style={{ ['--snake-cinema-color' as string]: boardGlowColor }}
                  />
                </>
              )}

              {boardFlash && (
                <div
                  className="pointer-events-none absolute inset-0 snake-board-flash"
                  style={{ backgroundColor: boardFlash.color }}
                />
              )}

              {visualBursts.map((burst) => (
                <div
                  key={burst.id}
                  className="pointer-events-none absolute"
                  style={{ left: `${burst.x}%`, top: `${burst.y}%` }}
                >
                  <div
                    className="snake-floating-score"
                    style={{ color: burst.color, textShadow: `0 0 12px ${burst.color}` }}
                  >
                    {burst.label}
                  </div>
                  {burst.particles.map((particle) => (
                    <span
                      key={particle.id}
                      className="snake-particle"
                      style={{
                        backgroundColor: burst.color,
                        ['--particle-x' as string]: `${Math.cos(particle.angle) * particle.distance}px`,
                        ['--particle-y' as string]: `${Math.sin(particle.angle) * particle.distance}px`,
                        boxShadow: `0 0 10px ${burst.color}`,
                      }}
                    />
                  ))}
                </div>
              ))}

              {lastMilestone && (
                <div className="pointer-events-none absolute inset-x-0 top-6 flex justify-center">
                  <div className="rounded-full border border-emerald-200/40 bg-emerald-300 px-4 py-2 font-black text-slate-950 shadow-lg">
                    {lastMilestone}
                  </div>
                </div>
              )}

              {gameState !== 'playing' && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-950/72 p-4 text-center backdrop-blur-sm sm:p-6">
                  {gameState === 'gameOver' ? (
                    <motion.div
                      className="max-h-full w-full max-w-2xl overflow-y-auto rounded-lg border border-white/10 bg-slate-950/90 p-5 text-left shadow-2xl"
                      initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 18, scale: 0.97 }}
                      animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: prefersReducedMotion ? 0.12 : 0.28, ease: 'easeOut' }}
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-cyan-100">
                            <Trophy className="h-3.5 w-3.5" />
                            {modeConfig.label}
                          </div>
                          <h2 className="text-3xl font-black text-white sm:text-4xl">{overlayTitle}</h2>
                          <p className="mt-2 max-w-xl text-sm text-cyan-50/75">{overlayText}</p>
                        </div>
                        <div className={`rounded-lg px-4 py-3 text-center ${
                          rankedMode && !saveError
                            ? 'bg-emerald-300 text-slate-950'
                            : saveError
                              ? 'bg-rose-300/15 text-rose-100'
                              : 'bg-white/10 text-cyan-50'
                        }`}>
                          <p className="text-xs font-bold uppercase tracking-wider opacity-75">
                            {rankedMode ? saveError ? 'No guardado' : 'Ranking' : 'Modo libre'}
                          </p>
                          <p className="text-2xl font-black">
                            {rankedMode ? saveError ? '-' : saving ? '...' : saveResult?.rank ? `#${saveResult.rank}` : '-' : 'Practica'}
                          </p>
                        </div>
                      </div>

                      <motion.div
                        className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4"
                        initial="hidden"
                        animate="show"
                        variants={{
                          hidden: {},
                          show: { transition: { staggerChildren: prefersReducedMotion ? 0 : 0.035 } },
                        }}
                      >
                        <ResultStat label="Puntos" value={formatNumber(score)} />
                        <ResultStat label="Nivel" value={String(level)} />
                        <ResultStat label="Frutas" value={String(foodCount)} />
                        <ResultStat label="Tiempo" value={formatTime(durationMs)} />
                        {isTimeAttack && <ResultStat label="Restante" value={formatTime(timeAttackRemainingMs)} />}
                        <ResultStat label="Mejor combo" value={comboEnabled ? `x${bestCombo}` : '-'} />
                        <ResultStat label="Longitud" value={String(snake.length)} />
                        {isTimeAttack && <ResultStat label="Choques" value={String(timeAttackCollisions)} />}
                        <ResultStat label="Fruta top" value={FRUIT_CONFIG[favoriteFruit].label} />
                        <ResultStat label="Record modo" value={formatNumber(projectedBest)} />
                      </motion.div>

                      <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.04] p-4">
                        <p className="text-xs font-bold uppercase tracking-wider text-cyan-100/60">
                          Progreso competitivo
                        </p>
                        <p className="mt-1 font-semibold text-white">{resultRankMessage}</p>
                        {saving && (
                          <p className="mt-2 text-sm font-bold text-cyan-100">
                            Guardando partida...
                          </p>
                        )}
                        {saveResult?.is_personal_best && (
                          <p className="mt-2 text-sm font-bold text-emerald-200">
                            Nuevo record personal en este modo.
                          </p>
                        )}
                        {saveError && (
                          <p className="mt-2 rounded-lg border border-rose-300/25 bg-rose-300/10 p-3 text-sm font-semibold text-rose-100">
                            {saveError}
                          </p>
                        )}
                      </div>

                      {lastUnlockedAchievements.length > 0 && (
                        <div className="mt-4 rounded-lg border border-violet-300/25 bg-violet-300/10 p-4">
                          <p className="text-xs font-bold uppercase tracking-wider text-violet-100/70">
                            Insignias desbloqueadas
                          </p>
                          <div className="mt-3 flex flex-wrap gap-3">
                            {lastUnlockedAchievements.map((achievement) => (
                              <div key={achievement.id} className="flex items-center gap-2 rounded-lg bg-slate-950/60 p-2 pr-3">
                                <AchievementImage achievement={achievement} size="sm" />
                                <div>
                                  <p className="text-sm font-black text-white">{achievement.name}</p>
                                  <p className="text-xs text-cyan-50/60">
                                    {achievement.coins_reward ? `+${formatNumber(achievement.coins_reward)} TC · ` : ''}
                                    {achievement.description}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {completedChallenges.length > 0 && (
                        <div className="mt-4 rounded-lg border border-emerald-300/25 bg-emerald-300/10 p-4">
                          <p className="text-xs font-bold uppercase tracking-wider text-emerald-100/70">
                            Retos diarios completados
                          </p>
                          <div className="mt-3 grid gap-2 sm:grid-cols-2">
                            {completedChallenges.map((challenge) => (
                              <div key={challenge.id} className="rounded-lg bg-slate-950/60 p-3">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-black text-white">{challenge.title}</p>
                                    <p className="mt-1 text-xs text-cyan-50/60">
                                      {challenge.progress}/{challenge.target}
                                    </p>
                                  </div>
                                  <span className="shrink-0 rounded-full bg-emerald-300 px-2 py-1 text-xs font-black text-slate-950">
                                    +{challenge.reward_coins}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="mt-4 rounded-lg border border-cyan-300/25 bg-cyan-300/10 p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-cyan-100/70">
                              Compartir resultado
                            </p>
                            <p className="mt-1 text-sm font-semibold text-white">
                              {shareText}
                            </p>
                          </div>
                          {shareStatus && (
                            <span className="shrink-0 rounded-full bg-emerald-300 px-3 py-1 text-xs font-black text-slate-950">
                              {shareStatus}
                            </span>
                          )}
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
                          <button
                            type="button"
                            onClick={() => shareResult(shareTitle, shareText, shareUrl)}
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-300 px-3 py-2 text-sm font-black text-slate-950 transition hover:bg-cyan-200"
                          >
                            <Share2 className="h-4 w-4" />
                            Compartir
                          </button>
                          <button
                            type="button"
                            onClick={() => copyShareText(`${shareText} ${shareUrl}`)}
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm font-bold text-white transition hover:bg-white/20"
                          >
                            <Copy className="h-4 w-4" />
                            Copiar
                          </button>
                          <button
                            type="button"
                            onClick={() => openShareUrl(`https://twitter.com/intent/tweet?text=${encodedShareText}&url=${encodedShareUrl}`)}
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm font-bold text-white transition hover:bg-white/20"
                          >
                            <Send className="h-4 w-4" />
                            X
                          </button>
                          <button
                            type="button"
                            onClick={() => openShareUrl(`https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`)}
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm font-bold text-white transition hover:bg-white/20"
                          >
                            <Send className="h-4 w-4" />
                            WhatsApp
                          </button>
                          <button
                            type="button"
                            onClick={() => openShareUrl(`https://www.facebook.com/sharer/sharer.php?u=${encodedShareUrl}&quote=${encodedShareText}`)}
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm font-bold text-white transition hover:bg-white/20"
                          >
                            <Share2 className="h-4 w-4" />
                            Facebook
                          </button>
                        </div>
                      </div>

                      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                        <button
                          type="button"
                          onClick={startGame}
                          className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-cyan-300 px-5 py-3 font-bold text-slate-950 transition hover:bg-cyan-200"
                        >
                          <Play className="h-5 w-5" />
                          Jugar de nuevo
                        </button>
                        <button
                          type="button"
                          onClick={() => resetGame()}
                          className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-white/10 px-5 py-3 font-bold text-white transition hover:bg-white/20"
                        >
                          <RotateCcw className="h-5 w-5" />
                          Cambiar modo
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="max-w-lg">
                      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-cyan-300 text-slate-950 shadow-lg shadow-cyan-500/30">
                        <Zap className="h-7 w-7" />
                      </div>
                      <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-cyan-200">
                        {stateLabel}
                      </p>
                      <h2 className="mb-3 text-3xl font-black sm:text-5xl">{overlayTitle}</h2>
                      <p className="mx-auto mb-5 max-w-md text-sm text-cyan-50/80 sm:text-base">
                        {overlayText}
                      </p>
                      <div className="flex flex-col items-center justify-center gap-2 sm:flex-row">
                        <button
                          type="button"
                          onClick={startGame}
                          className="inline-flex items-center gap-2 rounded-lg bg-cyan-300 px-5 py-3 font-bold text-slate-950 transition hover:bg-cyan-200"
                        >
                          <Play className="h-5 w-5" />
                          Jugar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-[1fr_220px]">
            <div className="flex flex-wrap gap-2 rounded-lg border border-white/10 bg-white/[0.04] p-3">
              <button
                type="button"
                onClick={gameState === 'playing' ? pauseGame : startGame}
                className="inline-flex items-center gap-2 rounded-lg bg-cyan-300 px-4 py-3 font-bold text-slate-950 transition hover:bg-cyan-200"
              >
                {gameState === 'playing' ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                {gameState === 'playing' ? 'Pausar' : 'Jugar'}
              </button>
              <button
                type="button"
                onClick={() => resetGame()}
                className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-3 font-semibold text-white transition hover:bg-white/20"
              >
                <RotateCcw className="h-5 w-5" />
                Reiniciar
              </button>
              <div className="flex items-center px-2 text-sm text-cyan-50/60">
                Flechas, WASD, swipe o toque en el tablero
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 rounded-lg border border-white/10 bg-white/[0.04] p-3">
              <span />
              <ControlButton label="Arriba" onClick={() => changeDirectionWithFeedback('up')}>
                <ArrowUp className="mx-auto h-5 w-5" />
              </ControlButton>
              <span />
              <ControlButton label="Izquierda" onClick={() => changeDirectionWithFeedback('left')}>
                <ArrowLeft className="mx-auto h-5 w-5" />
              </ControlButton>
              <ControlButton label="Abajo" onClick={() => changeDirectionWithFeedback('down')}>
                <ArrowDown className="mx-auto h-5 w-5" />
              </ControlButton>
              <ControlButton label="Derecha" onClick={() => changeDirectionWithFeedback('right')}>
                <ArrowRight className="mx-auto h-5 w-5" />
              </ControlButton>
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-lg border border-white/10 bg-white/[0.04] p-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={toggleSound}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-white/10 px-4 py-3 font-semibold text-white transition hover:bg-white/20"
            >
              {soundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
              {soundEnabled ? 'Sonido activo' : 'Sonido apagado'}
            </button>
            <label className="flex flex-1 items-center gap-3 text-sm text-cyan-50/70">
              Volumen
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={soundVolume}
                onChange={(event) => changeVolume(Number(event.target.value))}
                className="h-2 flex-1 accent-cyan-300"
                aria-label="Volumen de sonido"
              />
              <span className="w-10 text-right font-bold text-white">{Math.round(soundVolume * 100)}%</span>
            </label>
          </div>

          <div className="flex flex-col gap-3 rounded-lg border border-white/10 bg-white/[0.04] p-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={toggleMusic}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-white/10 px-4 py-3 font-semibold text-white transition hover:bg-white/20"
            >
              <Music className="h-5 w-5" />
              {musicEnabled ? 'Musica activa' : 'Musica apagada'}
            </button>
            <label className="flex flex-1 items-center gap-3 text-sm text-cyan-50/70">
              Musica
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={musicVolume}
                onChange={(event) => changeMusicVolume(Number(event.target.value))}
                className="h-2 flex-1 accent-emerald-300"
                aria-label="Volumen de musica"
              />
              <span className="w-10 text-right font-bold text-white">{Math.round(musicVolume * 100)}%</span>
            </label>
          </div>

          {(saving || saveResult || saveError) && (
            <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
              {saving && <p className="text-cyan-100">Guardando puntaje...</p>}
              {saveResult && (
                <p className="font-semibold text-emerald-200">
                  {saveResult.is_personal_best ? 'Nuevo record personal. ' : ''}
                  Posicion mundial: #{saveResult.rank}
                </p>
              )}
              {saveError && <p className="text-rose-200">{saveError}</p>}
            </div>
          )}

          <Panel title="Frutas especiales" icon={<Sparkles className="h-5 w-5 text-emerald-200" />}>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
              {visibleFruitTypes.map((fruitType) => {
                const config = FRUIT_CONFIG[fruitType]

                return (
                <div key={fruitType} className="rounded-lg bg-slate-950/50 p-3 text-center">
                  <div className="mb-2 flex justify-center">
                    <FruitDot fruitType={fruitType} />
                  </div>
                  <p className="text-sm font-bold">{config.label}</p>
                  <p className="mt-1 text-xs text-cyan-50/55">
                    {fruitCounts[fruitType]} tomada{fruitCounts[fruitType] === 1 ? '' : 's'}
                  </p>
                </div>
                )
              })}
            </div>
          </Panel>
        </section>

        <aside className="space-y-4">
          <Panel title="Tus estadisticas" icon={<BarChart3 className="h-5 w-5 text-cyan-200" />}>
            <div className="grid grid-cols-2 gap-2">
              <MiniStat label="Mejor puntaje" value={formatNumber(stats.best_score)} />
              <MiniStat label="Promedio" value={formatNumber(Math.round(Number(stats.average_score || 0)))} />
              <MiniStat label="Mejor nivel" value={String(stats.best_level || 1)} />
              <MiniStat label="Longitud max." value={String(stats.longest_snake || 3)} />
              <MiniStat label="Objetivos total" value={formatNumber(stats.total_food)} />
              <MiniStat label="Partidas" value={formatNumber(stats.games_played)} />
            </div>
          </Panel>

          <Panel title={`Ranking ${leaderboardModeConfig.label}`} icon={<Trophy className="h-5 w-5 text-yellow-300" />}>
            {leaderboard.length === 0 ? (
              <p className="text-sm text-cyan-50/70">
                Aun no hay puntajes en modo {leaderboardModeConfig.label}. Esta puede ser la primera marca.
              </p>
            ) : (
              <div className="space-y-2">
                {leaderboard.map((entry) => (
                  <div
                    key={entry.user_id}
                    className={`flex items-center gap-3 rounded-lg p-3 ${
                      entry.user_id === userId
                        ? 'border border-cyan-300/40 bg-cyan-300/10'
                        : 'bg-slate-950/50'
                    }`}
                  >
                    <div className="w-9 text-center text-lg font-black text-cyan-200">#{entry.rank}</div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{entry.username}</p>
                      <p className="text-xs text-cyan-50/60">
                        Nivel {entry.best_level} · {entry.games_played} partida{entry.games_played === 1 ? '' : 's'}
                      </p>
                    </div>
                    <div className="text-right font-black text-emerald-300">{formatNumber(entry.best_score)}</div>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title={`Temporada ${leaderboardModeConfig.label}`} icon={<CalendarDays className="h-5 w-5 text-emerald-200" />}>
            <div className="space-y-3 text-sm text-cyan-50/75">
              <div className="rounded-lg border border-emerald-300/20 bg-emerald-300/10 p-3">
                <p className="font-bold text-emerald-100">{season?.title || 'Temporada activa'}</p>
                <p>
                  Cierra en {seasonDaysLeft}d {seasonHoursLeft}h. Tabla {leaderboardModeConfig.label.toLowerCase()}.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <MiniStat label="Tu posicion" value={seasonUserEntry ? `#${seasonUserEntry.rank}` : '-'} />
                <MiniStat label="Tu marca" value={formatNumber(seasonUserEntry?.best_score || 0)} />
              </div>

              {seasonLeaderboard.length === 0 ? (
                <p className="rounded-lg bg-slate-950/50 p-3 text-cyan-50/65">
                  Aun no hay puntajes esta semana en modo {leaderboardModeConfig.label}. La primera partida abre la tabla.
                </p>
              ) : (
                <div className="space-y-2">
                  {seasonLeaderboard.slice(0, 5).map((entry) => (
                    <div
                      key={`season-${entry.user_id}`}
                      className={`flex items-center gap-3 rounded-lg p-3 ${
                        entry.user_id === userId
                          ? 'border border-emerald-300/40 bg-emerald-300/10'
                          : 'bg-slate-950/50'
                      }`}
                    >
                      <div className="w-8 text-center font-black text-emerald-200">#{entry.rank}</div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-white">{entry.username}</p>
                        <p className="text-xs text-cyan-50/55">Nivel {entry.best_level}</p>
                      </div>
                      <div className="font-black text-emerald-300">{formatNumber(entry.best_score)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Panel>

          <Panel title="Campeones" icon={<Trophy className="h-5 w-5 text-amber-200" />}>
            {seasonHistory.length === 0 ? (
              <p className="text-sm text-cyan-50/70">El historial aparecera cuando existan temporadas.</p>
            ) : (
              <div className="space-y-2">
                {seasonHistory.map((item) => (
                  <div key={item.id} className="rounded-lg bg-slate-950/50 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate font-semibold">{item.title}</p>
                      <span className={`rounded-full px-2 py-1 text-xs font-bold ${
                        item.status === 'active'
                          ? 'bg-emerald-300 text-slate-950'
                          : 'bg-white/10 text-cyan-100'
                      }`}>
                        {item.status === 'active' ? 'Activa' : 'Cerrada'}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-cyan-50/60">
                      {item.champion_score
                        ? `${item.champion_username || 'Campeon'} · ${formatNumber(item.champion_score)} pts`
                        : 'Sin campeon todavia'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Racha y cofre" icon={<Zap className="h-5 w-5 text-amber-200" />}>
            {rewardsLoadError ? (
              <div className="rounded-lg border border-rose-300/25 bg-rose-300/10 p-3">
                <p className="text-sm font-bold text-rose-100">No se pudieron cargar las recompensas.</p>
                <p className="mt-1 text-xs text-rose-50/70">{rewardsLoadError}</p>
              </div>
            ) : dailyRewards ? (
              <DailyRewardsCard
                rewards={dailyRewards}
                isClaiming={claimingChest}
                onClaim={claimDailyChest}
              />
            ) : (
              <p className="text-sm text-cyan-50/70">Juega una partida rankeada para iniciar tu racha.</p>
            )}
          </Panel>

          <Panel title="Retos diarios" icon={<Zap className="h-5 w-5 text-cyan-200" />}>
            {challengeLoadError ? (
              <div className="rounded-lg border border-rose-300/25 bg-rose-300/10 p-3">
                <p className="text-sm font-bold text-rose-100">No se pudieron cargar los retos diarios.</p>
                <p className="mt-1 text-xs text-rose-50/70">{challengeLoadError}</p>
              </div>
            ) : dailyChallenges.length === 0 ? (
              <p className="text-sm text-cyan-50/70">Los retos del dia apareceran al aplicar la migracion.</p>
            ) : (
              <div className="space-y-2">
                {dailyChallenges.map((challenge) => (
                  <DailyChallengeCard
                    key={challenge.id}
                    challenge={challenge}
                    isClaiming={claimingChallengeId === challenge.id}
                    onClaim={() => claimDailyChallenge(challenge.id)}
                  />
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Insignias Snake" icon={<Sparkles className="h-5 w-5 text-violet-200" />}>
            {achievements.length === 0 ? (
              <p className="text-sm text-cyan-50/70">Las insignias apareceran al aplicar la migracion de logros.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {achievements.map((achievement) => (
                  <div
                    key={achievement.id}
                    className={`rounded-lg border p-3 ${
                      achievement.is_unlocked
                        ? 'border-violet-300/40 bg-violet-300/10'
                        : 'border-white/10 bg-slate-950/50 opacity-70'
                    }`}
                  >
                    <div className="mb-2 flex justify-center">
                      <AchievementImage achievement={achievement} size="md" />
                    </div>
                    <p className="text-center text-sm font-bold leading-tight">{achievement.name}</p>
                    <p className="mt-1 text-center text-xs text-cyan-50/60">
                      {achievement.is_unlocked ? 'Desbloqueada' : 'Pendiente'}
                    </p>
                    <div className="mt-3">
                      <div className="mb-1 flex items-center justify-between gap-2 text-[11px] font-bold text-cyan-50/55">
                        <span>{achievement.progress_label || (achievement.is_unlocked ? 'Lista' : '0/1')}</span>
                        <span>+{formatNumber(achievement.coins_reward || 0)} TC</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                        <div
                          className={`h-full rounded-full ${achievement.is_unlocked ? 'bg-violet-300' : 'bg-cyan-300'}`}
                          style={{
                            width: `${Math.max(0, Math.min(100, ((achievement.progress_value || 0) / Math.max(achievement.target_value || achievement.requirement_value || 1, 1)) * 100))}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Objetivos de practica" icon={<Sparkles className="h-5 w-5 text-violet-200" />}>
            <div className="space-y-2">
              <PracticeGoal label="Llega a 100 puntos" complete={stats.best_score >= 100 || score >= 100} />
              <PracticeGoal label="Alcanza nivel 3" complete={stats.best_level >= 3 || level >= 3} />
              {comboEnabled && <PracticeGoal label="Logra combo x5" complete={bestCombo >= 5} />}
              <PracticeGoal label="Juega 5 partidas" complete={stats.games_played >= 5} />
            </div>
          </Panel>
        </aside>
      </main>
    </div>
  )
}

function MetricCard({ label, value, tone }: { label: string; value: string; tone: 'cyan' | 'emerald' | 'rose' | 'violet' | 'amber' }) {
  const tones = {
    cyan: 'border-cyan-300/20 text-cyan-100',
    emerald: 'border-emerald-300/20 text-emerald-100',
    rose: 'border-rose-300/20 text-rose-100',
    violet: 'border-violet-300/20 text-violet-100',
    amber: 'border-amber-300/20 text-amber-100',
  }

  return (
    <div className={`rounded-lg border bg-white/[0.06] p-4 ${tones[tone]}`}>
      <p className="text-xs uppercase tracking-wider opacity-70">{label}</p>
      <p className="mt-1 text-3xl font-black text-white">{value}</p>
    </div>
  )
}

function ControlButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      aria-label={label}
      type="button"
      onClick={onClick}
      className="rounded-lg bg-white/10 p-3 text-white transition hover:bg-white/20 active:scale-95"
    >
      {children}
    </button>
  )
}

function Panel({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.06] p-5 shadow-xl">
      <div className="mb-4 flex items-center gap-2">
        {icon}
        <h2 className="text-xl font-bold">{title}</h2>
      </div>
      {children}
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-950/50 p-3">
      <p className="text-xs text-cyan-50/55">{label}</p>
      <p className="mt-1 font-black text-white">{value}</p>
    </div>
  )
}

function ResultStat({ label, value }: { label: string; value: string }) {
  return (
    <motion.div
      className="rounded-lg border border-white/10 bg-white/[0.06] p-3"
      variants={{
        hidden: { opacity: 0, y: 8 },
        show: { opacity: 1, y: 0 },
      }}
    >
      <p className="text-xs uppercase tracking-wider text-cyan-50/55">{label}</p>
      <p className="mt-1 text-lg font-black text-white">{value}</p>
    </motion.div>
  )
}

function DailyChallengeCard({
  challenge,
  isClaiming,
  onClaim,
}: {
  challenge: SnakeDailyChallenge
  isClaiming: boolean
  onClaim: () => void
}) {
  const isComplete = Boolean(challenge.completed_at) || challenge.progress >= challenge.target
  const isClaimed = Boolean(challenge.claimed_at)
  const progress = Math.max(0, Math.min(100, (challenge.progress / challenge.target) * 100))

  return (
    <div className={`rounded-lg border p-3 ${
      isClaimed
        ? 'border-white/10 bg-slate-950/40 opacity-75'
        : isComplete
          ? 'border-emerald-300/35 bg-emerald-300/10'
          : 'border-white/10 bg-slate-950/50'
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-black leading-tight text-white">{challenge.title}</p>
          <p className="mt-1 text-xs leading-relaxed text-cyan-50/60">{challenge.description}</p>
        </div>
        <span className="shrink-0 rounded-full bg-cyan-300 px-2 py-1 text-xs font-black text-slate-950">
          +{formatNumber(challenge.reward_coins)}
        </span>
      </div>

      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between gap-3 text-xs font-bold text-cyan-50/65">
          <span>{formatNumber(Math.min(challenge.progress, challenge.target))}/{formatNumber(challenge.target)}</span>
          <span>{isClaimed ? 'Cobrado' : isComplete ? 'Listo' : 'Activo'}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className={`h-full rounded-full ${isComplete ? 'bg-emerald-300' : 'bg-cyan-300'}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {isComplete && !isClaimed && (
        <button
          type="button"
          onClick={onClaim}
          disabled={isClaiming}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-300 px-3 py-2 text-sm font-black text-slate-950 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Trophy className="h-4 w-4" />
          {isClaiming ? 'Cobrando...' : 'Reclamar premio'}
        </button>
      )}
    </div>
  )
}

function DailyRewardsCard({
  rewards,
  isClaiming,
  onClaim,
}: {
  rewards: SnakeDailyRewards
  isClaiming: boolean
  onClaim: () => void
}) {
  const completed = Math.min(rewards.completed_challenges, rewards.required_completed_challenges)
  const progress = Math.max(0, Math.min(100, (completed / rewards.required_completed_challenges) * 100))
  const opened = Boolean(rewards.opened_at)

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <MiniStat label="Racha actual" value={`${formatNumber(rewards.current_streak)}d`} />
        <MiniStat label="Mejor racha" value={`${formatNumber(rewards.best_streak)}d`} />
      </div>

      <div className={`rounded-lg border p-4 ${
        opened
          ? 'border-white/10 bg-slate-950/45 opacity-80'
          : rewards.can_open
            ? 'border-amber-300/40 bg-amber-300/10'
            : 'border-cyan-300/20 bg-cyan-300/10'
      }`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-black text-white">Cofre diario</p>
            <p className="mt-1 text-xs leading-relaxed text-cyan-50/65">
              Completa 3 retos diarios para abrirlo.
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-amber-300 px-2 py-1 text-xs font-black text-slate-950">
            +{formatNumber(rewards.reward_coins)}
          </span>
        </div>

        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-xs font-bold text-cyan-50/65">
            <span>{completed}/{rewards.required_completed_challenges} retos</span>
            <span>{opened ? 'Abierto' : rewards.can_open ? 'Listo' : 'Bloqueado'}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className={`h-full rounded-full ${rewards.can_open || opened ? 'bg-amber-300' : 'bg-cyan-300'}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {rewards.can_open && !opened && (
          <button
            type="button"
            onClick={onClaim}
            disabled={isClaiming}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-amber-300 px-3 py-2 text-sm font-black text-slate-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Trophy className="h-4 w-4" />
            {isClaiming ? 'Abriendo...' : 'Abrir cofre'}
          </button>
        )}
      </div>
    </div>
  )
}

function PracticeGoal({ label, complete }: { label: string; complete: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-slate-950/50 p-3">
      <span className="text-sm text-cyan-50/80">{label}</span>
      <span className={`rounded-full px-2 py-1 text-xs font-bold ${complete ? 'bg-emerald-300 text-slate-950' : 'bg-white/10 text-cyan-100'}`}>
        {complete ? 'Listo' : 'Activo'}
      </span>
    </div>
  )
}

function FruitDot({ fruitType }: { fruitType: FruitType }) {
  const config = FRUIT_CONFIG[fruitType]

  return (
    <div
      className="flex h-10 w-10 items-center justify-center rounded-full border border-white/25 text-xs font-black text-slate-950 shadow-lg"
      style={{
        backgroundColor: config.color,
        boxShadow: `0 0 18px ${config.glow}`,
      }}
      title={config.label}
    >
      {fruitType === 'apple' ? '' : config.shortLabel}
    </div>
  )
}

function EffectPill({ active, label }: { active: boolean; label: string }) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-bold ${
        active
          ? 'bg-emerald-300 text-slate-950'
          : 'bg-white/10 text-cyan-50/55'
      }`}
    >
      {label}
    </span>
  )
}

function AchievementImage({ achievement, size }: { achievement: SnakeAchievement; size: 'sm' | 'md' }) {
  const dimensions = size === 'sm' ? 'h-14 w-14' : 'h-16 w-16'
  const badgeUrl = getSnakeBadgeUrl(achievement.badge_url)
  const rarityBorder = {
    common: 'border-slate-300/40',
    rare: 'border-cyan-300/50',
    epic: 'border-violet-300/60',
    legendary: 'border-amber-300/70',
  }[achievement.rarity] || 'border-slate-300/40'

  return (
    <div className={`${dimensions} overflow-hidden rounded-full border ${rarityBorder} bg-white/10 p-1`}>
      <Image
        src={badgeUrl}
        alt={achievement.name}
        width={96}
        height={96}
        className="h-full w-full rounded-full object-cover"
        unoptimized
      />
    </div>
  )
}
