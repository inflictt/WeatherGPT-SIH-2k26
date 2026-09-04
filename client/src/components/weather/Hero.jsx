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
          <div className="glass-pill inline-flex items-center gap-2 rounded-full px-4 py-1.5 font-mono text-xs text-ink-2 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-sev-orange animate-pulse" aria-hidden="true" />
            <span className="font-semibold text-ink">{LOCATION.name}</span>
            <span className="text-ink-3">·</span>
            <span className="text-ink-3">
              {LOCATION.district} district, {LOCATION.state}
            </span>
          </div>
        </Reveal>

        <Reveal delay={70}>
          <div className="mt-6 glass-panel rounded-2xl p-6 sm:p-8 flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-center gap-6 sm:gap-8">
              <div className="font-display text-6xl sm:text-7xl lg:text-8xl font-light text-pure tracking-tight leading-none tnum">
                {fmt.temp(c.tempC)}
                <span className="align-top text-2xl sm:text-3xl text-ash font-light ml-1">°{fmt.tempUnit}</span>
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-display font-light text-cloud leading-tight">
                  <span className="sr-only">
                    {LOCATION?.name}
                    {LOCATION?.district ? `, ${LOCATION.district} district` : ''} —{' '}
                  </span>
                  {c.condition}
                </h1>
                <p className="mt-1 text-sm text-ink-2">
                  Feels like <span className="font-semibold text-ink">{fmt.temp(c.feelsLikeC)}°</span> · {Math.round(c.rainProb * 100)}% chance of rain ·
                  observed {ago(c.observedAt)}
                </p>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-3">
              <span className="glass-pill px-3.5 py-2 rounded-xl text-xs font-mono text-ink-2 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Live Multi-Model Sync
              </span>
            </div>
          </div>
        </Reveal>

        <Reveal delay={140}>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            <div className="glass-card rounded-2xl p-3.5 flex flex-col justify-between">
              <span className="text-[11px] font-mono text-ink-3 uppercase">Wind</span>
              <span className="text-sm sm:text-base font-semibold text-ink mt-1">
                {fmt.speed(c.windKmh)} <span className="text-xs font-normal text-ink-3">{fmt.speedUnit} {c.windDir}</span>
              </span>
            </div>

            <div className="glass-card rounded-2xl p-3.5 flex flex-col justify-between">
              <span className="text-[11px] font-mono text-ink-3 uppercase">Gusts</span>
              <span className="text-sm sm:text-base font-semibold text-ink mt-1">
                {fmt.speed(c.gustKmh)} <span className="text-xs font-normal text-ink-3">{fmt.speedUnit}</span>
              </span>
            </div>

            <div className="glass-card rounded-2xl p-3.5 flex flex-col justify-between">
              <span className="text-[11px] font-mono text-ink-3 uppercase">Humidity</span>
              <span className="text-sm sm:text-base font-semibold text-ink mt-1">{c.humidity}%</span>
            </div>

            <div className="glass-card rounded-2xl p-3.5 flex flex-col justify-between">
              <span className="text-[11px] font-mono text-ink-3 uppercase">Visibility</span>
              <span className="text-sm sm:text-base font-semibold text-ink mt-1">
                {fmt.distance(c.visibilityKm)} <span className="text-xs font-normal text-ink-3">{fmt.distanceUnit}</span>
              </span>
            </div>

            <div className="glass-card rounded-2xl p-3.5 flex flex-col justify-between">
              <span className="text-[11px] font-mono text-ink-3 uppercase">Pressure</span>
              <span className="text-sm sm:text-base font-semibold text-ink mt-1">
                {c.pressureHpa} <span className="text-xs font-normal text-ink-3">hPa</span>
              </span>
            </div>

            <div className="glass-card rounded-2xl p-3.5 flex flex-col justify-between">
              <span className="text-[11px] font-mono text-ink-3 uppercase">UV Index</span>
              <span className="text-sm sm:text-base font-semibold text-ink mt-1">{c.uv ?? 2}</span>
            </div>

            <div className="glass-card rounded-2xl p-3.5 flex flex-col justify-between">
              <span className="text-[11px] font-mono text-ink-3 uppercase">Sunset</span>
              <span className="text-sm sm:text-base font-semibold text-ink mt-1">{c.sunset || '18:44'}</span>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
