import { useData } from '../../lib/DataContext'
import { ago } from '../../lib/utils'
import { Stat, Skeleton } from '../ui/Bits'
import { formatters } from '../../lib/usePreferences'
import Reveal from '../ui/Reveal'

/**
 * The page's thesis: where you are, what it is doing, how it feels.
 * Figures are tabular so the row does not reflow as values update.
 */
export default function Hero({ prefs }) {
  const { current: c, location: LOCATION, loading } = useData()
  const fmt = formatters(prefs?.units)

  if (loading) {
    return (
      <section className="shell pb-10 pt-9 sm:pt-12" aria-busy="true">
        <Skeleton className="h-6 w-52 rounded-full" />
        <div className="mt-7 flex flex-wrap items-start gap-x-8 gap-y-4">
          <Skeleton className="h-[76px] w-[150px] sm:h-[96px] sm:w-[190px]" />
          <div className="pt-2 sm:pt-5">
            <Skeleton className="h-7 w-64" />
            <Skeleton className="mt-3 h-4 w-72" />
          </div>
        </div>
        <div className="mt-8 grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-7">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i}>
              <Skeleton className="h-2.5 w-14" />
              <Skeleton className="mt-2 h-5 w-16" />
            </div>
          ))}
        </div>
      </section>
    )
  }

  return (
    <section className="relative overflow-hidden">
      <div className="shell relative pb-4 pt-6 sm:pt-8">
        <Reveal>
          <div className="flex flex-wrap items-center gap-2">
            <div className="glass-pill inline-flex items-center gap-2 rounded-full px-4 py-1.5 font-mono text-xs shadow-sm border border-line">
              <span className="h-2 w-2 rounded-full bg-sev-orange animate-pulse" aria-hidden="true" />
              <span className="font-semibold text-ink">{LOCATION?.name || 'Delhi'}</span>
              <span className="text-ink-3">·</span>
              <span className="text-ink-2 font-medium">
                {LOCATION?.district ? `${LOCATION.district} district, ` : ''}{LOCATION?.state || 'Delhi'}
              </span>
            </div>

            {/* Anti-Hallucination Provenance Chip */}
            <div className="inline-flex items-center gap-1.5 rounded-full border border-sev-green/30 bg-sev-green/10 px-3 py-1 font-mono text-[10.5px] font-semibold text-sev-green shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-sev-green" />
              <span>ECMWF 9km Physics · IMD CAP Grounded</span>
            </div>
          </div>
        </Reveal>

        <Reveal delay={70}>
          <div className="mt-6 glass-panel rounded-2xl p-6 sm:p-8 flex flex-wrap items-center justify-between gap-6 shadow-xl relative overflow-hidden">
            {/* Subtle atmospheric ambient glow inside card */}
            <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-iris/10 blur-3xl pointer-events-none" />
            <div className="absolute -left-16 -bottom-16 w-64 h-64 rounded-full bg-cyanSignal/10 blur-3xl pointer-events-none" />

            <div className="flex items-center gap-6 sm:gap-8 relative z-10">
              <div className="font-display text-6xl sm:text-7xl lg:text-8xl font-light text-ink tracking-tight leading-none tnum flex items-baseline">
                <span>{fmt.temp(c.tempC)}</span>
                <span className="text-2xl sm:text-3xl text-ink-3 font-light ml-1.5">{fmt.tempUnit}</span>
              </div>
              <div className="space-y-1.5">
                <h1 className="text-2xl sm:text-3xl font-display font-light text-ink leading-tight flex items-center gap-2.5">
                  <span className="sr-only">
                    {LOCATION?.name}
                    {LOCATION?.district ? `, ${LOCATION.district} district` : ''} —{' '}
                  </span>
                  <span>{c.condition}</span>
                </h1>
                <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-ink-2">
                  <span className="glass-pill px-2.5 py-1 rounded-md">
                    Feels like <strong className="text-ink font-semibold">{fmt.temp(c.feelsLikeC)}{fmt.tempUnit}</strong>
                  </span>
                  <span className="glass-pill px-2.5 py-1 rounded-md">
                    💧 {Math.round((c.rainProb || 0) * 100)}% rain chance
                  </span>
                  <span className="glass-pill px-2.5 py-1 rounded-md text-ink-3">
                    observed {ago(c.observedAt)}
                  </span>
                </div>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-3 relative z-10">
              <span className="glass-pill px-3.5 py-2 rounded-xl text-xs font-mono text-ink flex items-center gap-2 shadow-sm">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Live Multi-Model Sync
              </span>
            </div>
          </div>
        </Reveal>

        <Reveal delay={140}>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {/* Wind */}
            <div className="glass-card rounded-2xl p-3.5 flex flex-col justify-between shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-250">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold tracking-wider text-ink-3 uppercase">Wind</span>
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-cyanSignal/15 text-xs">💨</span>
              </div>
              <div className="text-base sm:text-lg font-bold text-ink mt-3 tnum">
                {fmt.speed(c.windKmh) ?? '0'}{' '}
                <span className="text-[11px] font-normal text-ink-3 font-mono">{fmt.speedUnit} {c.windDir || ''}</span>
              </div>
            </div>

            {/* Gusts */}
            <div className="glass-card rounded-2xl p-3.5 flex flex-col justify-between shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-250">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold tracking-wider text-ink-3 uppercase">Gusts</span>
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-500/15 text-xs">🌪️</span>
              </div>
              <div className="text-base sm:text-lg font-bold text-ink mt-3 tnum">
                {fmt.speed(c.gustKmh || c.windKmh) ?? '0'}{' '}
                <span className="text-[11px] font-normal text-ink-3 font-mono">{fmt.speedUnit}</span>
              </div>
            </div>

            {/* Humidity */}
            <div className="glass-card rounded-2xl p-3.5 flex flex-col justify-between shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-250">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold tracking-wider text-ink-3 uppercase">Humidity</span>
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-sky-500/15 text-xs">💧</span>
              </div>
              <div className="text-base sm:text-lg font-bold text-ink mt-3 tnum">
                {c.humidity ?? 0}%
              </div>
            </div>

            {/* Visibility */}
            <div className="glass-card rounded-2xl p-3.5 flex flex-col justify-between shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-250">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold tracking-wider text-ink-3 uppercase">Visibility</span>
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-500/15 text-xs">👁️</span>
              </div>
              <div className="text-base sm:text-lg font-bold text-ink mt-3 tnum">
                {c.visibilityKm != null ? fmt.distance(c.visibilityKm) : '10'}{' '}
                <span className="text-[11px] font-normal text-ink-3 font-mono">{fmt.distanceUnit}</span>
              </div>
            </div>

            {/* Pressure */}
            <div className="glass-card rounded-2xl p-3.5 flex flex-col justify-between shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-250">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold tracking-wider text-ink-3 uppercase">Pressure</span>
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/15 text-xs">⏲️</span>
              </div>
              <div className="text-base sm:text-lg font-bold text-ink mt-3 tnum">
                {c.pressureHpa || 1013}{' '}
                <span className="text-[11px] font-normal text-ink-3 font-mono">hPa</span>
              </div>
            </div>

            {/* UV Index */}
            <div className="glass-card rounded-2xl p-3.5 flex flex-col justify-between shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-250">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold tracking-wider text-ink-3 uppercase">UV Index</span>
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-500/15 text-xs">☀️</span>
              </div>
              <div className="text-base sm:text-lg font-bold text-ink mt-3 tnum">
                {c.uv ?? 2}
              </div>
            </div>

            {/* Sunset */}
            <div className="glass-card rounded-2xl p-3.5 flex flex-col justify-between shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-250">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold tracking-wider text-ink-3 uppercase">Sunset</span>
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-orange-500/15 text-xs">🌅</span>
              </div>
              <div className="text-base sm:text-lg font-bold text-ink mt-3 tnum">
                {c.sunset || '18:44'}
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
