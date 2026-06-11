import Image from 'next/image'
import Link from 'next/link'
import {
  Activity,
  ArrowRight,
  Bolt,
  Gamepad2,
  Globe2,
  Medal,
  Play,
  Sparkles,
  Trophy,
  Zap,
} from 'lucide-react'

const modes = [
  {
    title: 'Clasico',
    text: 'Reglas limpias para competir con una base justa.',
    tone: 'border-emerald-300/30 bg-emerald-300/10 text-emerald-100',
  },
  {
    title: 'Arcade',
    text: 'Frutas especiales, combos y partidas llenas de ritmo.',
    tone: 'border-cyan-300/30 bg-cyan-300/10 text-cyan-100',
  },
  {
    title: 'Entrenamiento',
    text: 'Practica rutas y reacciones sin afectar el ranking.',
    tone: 'border-violet-300/30 bg-violet-300/10 text-violet-100',
  },
]

const features = [
  {
    icon: <Globe2 className="h-5 w-5" />,
    title: 'Ranking Global',
    text: 'Tu mejor marca queda registrada por modo.',
  },
  {
    icon: <Zap className="h-5 w-5" />,
    title: 'Frutas Especiales',
    text: 'Turbo, hielo, doradas y arcoiris cambian cada partida.',
  },
  {
    icon: <Trophy className="h-5 w-5" />,
    title: 'Temporadas',
    text: 'Tabla semanal lista para torneos y premios.',
  },
  {
    icon: <Medal className="h-5 w-5" />,
    title: 'Insignias',
    text: 'Desbloquea logros mientras subes tu nivel.',
  },
]

export default function SnakeMundialLanding() {
  return (
    <main className="min-h-screen overflow-hidden bg-slate-950 text-white">
      <section className="relative min-h-screen border-b border-cyan-300/20 bg-[radial-gradient(circle_at_72%_28%,rgba(34,211,238,0.20),transparent_32%),radial-gradient(circle_at_25%_75%,rgba(16,185,129,0.18),transparent_30%),linear-gradient(135deg,#020617_0%,#082f49_45%,#031b2f_100%)]">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(34,211,238,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.08)_1px,transparent_1px)] bg-[size:42px_42px] opacity-40" />

        <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
          <Link href="/" className="inline-flex items-center gap-3 font-black tracking-wide text-white">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-cyan-300/40 bg-cyan-300/10 text-cyan-200">
              <Bolt className="h-6 w-6" />
            </span>
            <span>TURIX</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/login" className="rounded-lg px-4 py-2 text-sm font-bold text-cyan-100 hover:bg-white/10">
              Entrar
            </Link>
            <Link href="/snake" className="rounded-lg bg-cyan-300 px-4 py-2 text-sm font-black text-slate-950 hover:bg-cyan-200">
              Jugar
            </Link>
          </div>
        </header>

        <div className="relative z-10 mx-auto grid min-h-[calc(100vh-82px)] max-w-7xl items-center gap-10 px-4 pb-10 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <div className="pb-8 pt-8">
            <div className="mb-5 inline-flex items-center gap-2 rounded-lg border border-cyan-300/40 bg-cyan-300/10 px-4 py-2 text-xs font-black uppercase tracking-[0.35em] text-cyan-100 shadow-lg shadow-cyan-950/40">
              Nuevo reto
            </div>
            <h1 className="max-w-3xl text-6xl font-black uppercase leading-[0.85] tracking-normal text-white sm:text-7xl lg:text-8xl">
              Snake
              <span className="block text-cyan-300 drop-shadow-[0_0_22px_rgba(34,211,238,0.65)]">
                Mundial
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-lg font-semibold text-cyan-50/85 sm:text-xl">
              Demuestra tu velocidad, encadena combos y domina el ranking global de Turix.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/snake"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-300 px-6 py-4 text-lg font-black uppercase text-slate-950 shadow-2xl shadow-cyan-500/30 transition hover:bg-cyan-200"
              >
                <Play className="h-5 w-5 fill-slate-950" />
                Juega Ahora
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 px-6 py-4 text-lg font-black text-white transition hover:bg-white/15"
              >
                Crear Cuenta
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <PromoStat label="Modos" value="3" />
              <PromoStat label="Ranking" value="Global" />
              <PromoStat label="Temporadas" value="Semanal" />
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[560px] pb-8 lg:max-w-[620px]">
            <div className="absolute inset-x-6 bottom-2 h-20 rounded-full bg-cyan-300/30 blur-3xl" />
            <Image
              src="/images/snake-mundial-promo.png"
              alt="Promocional Snake Mundial de Turix"
              width={548}
              height={704}
              priority
              className="relative w-full rounded-lg border border-cyan-300/25 shadow-2xl shadow-cyan-950/70"
            />
          </div>
        </div>
      </section>

      <section className="border-b border-white/10 bg-slate-950 px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.3em] text-cyan-300">Arcade competitivo</p>
              <h2 className="mt-2 text-3xl font-black sm:text-5xl">Partidas rapidas, progreso real</h2>
            </div>
            <Link href="/snake" className="inline-flex items-center gap-2 font-bold text-cyan-200 hover:text-white">
              Entrar al juego
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            {features.map((feature) => (
              <div key={feature.title} className="rounded-lg border border-white/10 bg-white/[0.05] p-5">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-cyan-300 text-slate-950">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-black">{feature.title}</h3>
                <p className="mt-2 text-sm text-cyan-50/65">{feature.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[linear-gradient(135deg,#031b2f,#020617)] px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-lg bg-emerald-300 text-slate-950">
              <Gamepad2 className="h-7 w-7" />
            </div>
            <h2 className="mt-5 text-3xl font-black sm:text-5xl">Elige tu ritmo</h2>
            <p className="mt-4 text-cyan-50/70">
              Snake Mundial ya separa la competencia limpia del caos arcade y la practica libre.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {modes.map((mode) => (
              <div key={mode.title} className={`rounded-lg border p-5 ${mode.tone}`}>
                <p className="text-xl font-black text-white">{mode.title}</p>
                <p className="mt-3 text-sm">{mode.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-cyan-300 px-4 py-12 text-slate-950 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.25em]">Solo en turix.club</p>
            <h2 className="mt-1 text-3xl font-black sm:text-4xl">Sube al ranking antes del proximo torneo</h2>
          </div>
          <Link
            href="/snake"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-6 py-4 font-black uppercase text-cyan-200 shadow-xl transition hover:bg-slate-900"
          >
            Jugar Snake Mundial
            <Sparkles className="h-5 w-5" />
          </Link>
        </div>
      </section>
    </main>
  )
}

function PromoStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-cyan-300/25 bg-slate-950/60 p-4">
      <p className="text-xs font-bold uppercase tracking-wider text-cyan-100/60">{label}</p>
      <p className="mt-1 text-2xl font-black text-white">{value}</p>
    </div>
  )
}
