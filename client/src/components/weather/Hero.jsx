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
          <div className="glass-pill inline-flex items-center gap-2 rounded-full px-4 py-1.5 font-mono text-xs shadow-md border border-white/15 bg-black/40">
            <span className="h-2 w-2 rounded-full bg-sev-orange animate-pulse" aria-hidden="true" />
            <span className="font-semibold text-pure">{LOCATION?.name || 'Delhi'}</span>
            <span className="text-ash/60">·</span>
            <span className="text-ash font-medium">
              {LOCATION?.district ? `${LOCATION.district} district, ` : ''}{LOCATION?.state || 'Delhi'}
            </span>
          </div>
        </Reveal>

        <Reveal delay={70}>
          <div className="mt-6 glass-panel rounded-2xl p-6 sm:p-8 flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-center gap-6 sm:gap-8">
              <div className="font-display text-6xl sm:text-7xl lg:text-8xl font-light text-pure tracking-tight leading-none tnum flex items-baseline">
                <span>{fmt.temp(c.tempC)}</span>
                <span className="text-2xl sm:text-3xl text-ash font-light ml-1">{fmt.tempUnit}</span>
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-display font-light text-cloud leading-tight">
                  <span className="sr-only">
                    {LOCATION?.name}
                    {LOCATION?.district ? `, ${LOCATION.district} district` : ''} —{' '}
                  </span>
                  {c.condition}
                </h1>
                <p className="mt-1 text-sm text-ash">
                  Feels like <span className="font-semibold text-pure">{fmt.temp(c.feelsLikeC)}{fmt.tempUnit}</span> · {Math.round((c.rainProb || 0) * 100)}% chance of rain · observed {ago(c.observedAt)}
                </p>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-3">
              <span className="glass-pill px-3.5 py-2 rounded-xl text-xs font-mono text-cloud flex items-center gap-2 border border-white/10 bg-white/5">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Live Multi-Model Sync
              </span>
            </div>
          </div>
        </Reveal>

        <Reveal delay={140}>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {/* Wind */}
            <div className="bg-[#18191c]/95 border border-white/12 rounded-2xl p-3.5 flex flex-col justify-between shadow-sm hover:border-white/25 hover:bg-[#202227] transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-semibold tracking-wider text-ash uppercase">Wind</span>
                <span className="text-xs">💨</span>
              </div>
              <div className="text-base sm:text-lg font-bold text-pure mt-2 tnum">
                {fmt.speed(c.windKmh) ?? '0'}{' '}
                <span className="text-xs font-normal text-ash font-mono">{fmt.speedUnit} {c.windDir || ''}</span>
              </div>
            </div>

            {/* Gusts */}
            <div className="bg-[#18191c]/95 border border-white/12 rounded-2xl p-3.5 flex flex-col justify-between shadow-sm hover:border-white/25 hover:bg-[#202227] transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-semibold tracking-wider text-ash uppercase">Gusts</span>
                <span className="text-xs">🌪️</span>
              </div>
              <div className="text-base sm:text-lg font-bold text-pure mt-2 tnum">
                {fmt.speed(c.gustKmh || c.windKmh) ?? '0'}{' '}
                <span className="text-xs font-normal text-ash font-mono">{fmt.speedUnit}</span>
              </div>
            </div>

            {/* Humidity */}
            <div className="bg-[#18191c]/95 border border-white/12 rounded-2xl p-3.5 flex flex-col justify-between shadow-sm hover:border-white/25 hover:bg-[#202227] transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-semibold tracking-wider text-ash uppercase">Humidity</span>
                <span className="text-xs">💧</span>
              </div>
              <div className="text-base sm:text-lg font-bold text-pure mt-2 tnum">
                {c.humidity ?? 0}%
              </div>
            </div>

            {/* Visibility */}
            <div className="bg-[#18191c]/95 border border-white/12 rounded-2xl p-3.5 flex flex-col justify-between shadow-sm hover:border-white/25 hover:bg-[#202227] transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-semibold tracking-wider text-ash uppercase">Visibility</span>
                <span className="text-xs">👁️</span>
              </div>
              <div className="text-base sm:text-lg font-bold text-pure mt-2 tnum">
                {c.visibilityKm != null ? fmt.distance(c.visibilityKm) : '10'}{' '}
                <span className="text-xs font-normal text-ash font-mono">{fmt.distanceUnit}</span>
              </div>
            </div>

            {/* Pressure */}
            <div className="bg-[#18191c]/95 border border-white/12 rounded-2xl p-3.5 flex flex-col justify-between shadow-sm hover:border-white/25 hover:bg-[#202227] transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-semibold tracking-wider text-ash uppercase">Pressure</span>
                <span className="text-xs">⏲️</span>
              </div>
              <div className="text-base sm:text-lg font-bold text-pure mt-2 tnum">
                {c.pressureHpa || 1013}{' '}
                <span className="text-xs font-normal text-ash font-mono">hPa</span>
              </div>
            </div>

            {/* UV Index */}
            <div className="bg-[#18191c]/95 border border-white/12 rounded-2xl p-3.5 flex flex-col justify-between shadow-sm hover:border-white/25 hover:bg-[#202227] transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-semibold tracking-wider text-ash uppercase">UV Index</span>
                <span className="text-xs">☀️</span>
              </div>
              <div className="text-base sm:text-lg font-bold text-pure mt-2 tnum">
                {c.uv ?? 2}
              </div>
            </div>

            {/* Sunset */}
            <div className="bg-[#18191c]/95 border border-white/12 rounded-2xl p-3.5 flex flex-col justify-between shadow-sm hover:border-white/25 hover:bg-[#202227] transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-semibold tracking-wider text-ash uppercase">Sunset</span>
                <span className="text-xs">🌅</span>
              </div>
              <div className="text-base sm:text-lg font-bold text-pure mt-2 tnum">
                {c.sunset || '18:44'}
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
