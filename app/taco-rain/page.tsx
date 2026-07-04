import Link from 'next/link'
import TacoRainGame from '@/components/taco-rain/TacoRainGame'

export default function TacoRainPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <TacoRainGame />
      <div className="fixed left-4 top-4 z-20">
        <Link
          href="/dashboard"
          className="rounded-lg border border-cyan-300/30 bg-slate-950/70 px-4 py-2 text-sm font-bold text-cyan-100 backdrop-blur transition hover:bg-cyan-300/10"
        >
          ← Dashboard
        </Link>
      </div>
    </main>
  )
}
