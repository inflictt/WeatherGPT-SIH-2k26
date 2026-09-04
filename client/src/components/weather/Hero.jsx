import { useMemo } from 'react'
import { useData } from '../../lib/DataContext'
import { Skeleton } from '../ui/Bits'
import { formatters } from '../../lib/usePreferences'
import Reveal from '../ui/Reveal'

const POPULAR_NEARBY_CITIES = [
  { name: 'Mumbai', lat: 19.076, lon: 72.8777, state: 'Maharashtra' },
  { name: 'Bengaluru', lat: 12.9716, lon: 77.5946, state: 'Karnataka' },
  { name: 'Hyderabad', lat: 17.385, lon: 78.4867, state: 'Telangana' },
  { name: 'Delhi', lat: 28.6139, lon: 77.209, state: 'Delhi' },
]

export default function Hero({ prefs, onSelectCity }) {
  const { current: c, location: LOCATION, hourly, forecast, loading } = useData()
  const fmt = formatters(prefs?.units)

  // 1. High / Low
  const todayForecast = forecast?.[0]
  const highTemp = todayForecast?.tempMax !== undefined ? Math.round(todayForecast.tempMax) : Math.round((c?.tempC || 28) + 2)
  const lowTemp = todayForecast?.tempMin !== undefined ? Math.round(todayForecast.tempMin) : Math.round((c?.tempC || 28) - 2)

  // 2. Weather Icon
  const condition = (c?.condition || 'Overcast').toLowerCase()
  const weatherIcon = useMemo(() => {
    if (condition.includes('rain') || condition.includes('shower')) return '🌧️'
    if (condition.includes('thunder') || condition.includes('storm')) return '⛈️'
    if (condition.includes('cloud') || condition.includes('overcast')) return '☁️'
    if (condition.includes('snow')) return '❄️'
    if (condition.includes('dust') || condition.includes('haze')) return '🌫️'
    return '☀️'
  }, [condition])

  // 3. Bezier Spline Curve Math
  const bezierData = useMemo(() => {
    const rawHourly = (hourly || []).slice(0, 7)
    let temps = rawHourly.map((h) => Math.round(h.temp ?? c?.tempC ?? 27))
    if (temps.length < 2) {
      temps = [28, 27, 27, 27, 27, 27, 26]
    }

    const min = Math.min(...temps) - 1
    const max = Math.max(...temps) + 1
    const range = max - min || 1
    const width = 500
    const height = 75
    const paddingX = 25
    const paddingY = 18

    const points = temps.map((val, i) => ({
      x: paddingX + (i / (temps.length - 1)) * (width - 2 * paddingX),
      y: height - paddingY - ((val - min) / range) * (height - 2 * paddingY),
      val,
    }))

    let d = `M ${points[0].x},${points[0].y}`
    for (let i = 0; i < points.length - 1; i++) {
      const cp1x = points[i].x + (points[i + 1].x - points[i].x) / 2
      const cp1y = points[i].y
      const cp2x = cp1x
      const cp2y = points[i + 1].y
      d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${points[i + 1].x},${points[i + 1].y}`
    }

    return { points, path: d, temps }
  }, [hourly, c?.tempC])

  const nearbyList = POPULAR_NEARBY_CITIES.filter(
    (city) => city.name.toLowerCase() !== (LOCATION?.name || '').toLowerCase()
  ).slice(0, 3)

  if (loading) {
    return (
      <section className="shell pb-4 pt-6" aria-busy="true">
        <Skeleton className="h-64 w-full rounded-3xl" />
      </section>
    )
  }

  return (
    <section className="relative overflow-hidden">
      <div className="shell relative pb-3 pt-4">
        <Reveal>
          <div className="glass-panel rounded-3xl p-6 sm:p-7 shadow-2xl relative overflow-hidden border border-line bg-surface/95">
            {/* Ambient Lighting Gradient */}
            <div className="absolute -right-20 -top-20 w-72 h-72 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
            <div className="absolute -left-20 -bottom-20 w-72 h-72 rounded-full bg-iris/10 blur-3xl pointer-events-none" />

            {/* Top Location Bar & Nearby Pills */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-line/60">
              <div className="flex items-center gap-2.5">
                <span className="text-amber-400 text-lg">📍</span>
                <h2 className="text-lg sm:text-xl font-bold font-display text-ink flex items-center gap-2">
                  <span>{LOCATION?.name || 'New Delhi'}, {LOCATION?.country || 'India'}</span>
                </h2>
                <span className="text-xs text-ink-3 font-mono pl-2.5 border-l border-line">
                  Today
                </span>
              </div>

              {/* Nearby Quick Pills */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-ink-3 font-medium hidden sm:inline font-mono">Nearby:</span>
                <div className="flex items-center gap-1.5">
                  {nearbyList.map((city) => (
                    <button
                      key={city.name}
                      onClick={() => onSelectCity?.(city)}
                      className="px-2.5 py-1 rounded-lg bg-surface-2/80 hover:bg-surface-3 text-ink-2 hover:text-ink border border-line text-[11px] font-mono transition-colors shadow-sm"
                    >
                      {city.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Temperature & Condition Main Banner */}
            <div className="flex flex-wrap items-center justify-between gap-6 pt-5 pb-3">
              <div className="flex items-center gap-5 sm:gap-6">
                <div className="text-5xl sm:text-6xl drop-shadow-md select-none">
                  {weatherIcon}
                </div>
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl sm:text-6xl font-bold font-display text-ink tracking-tight tnum">
                      {fmt.temp(c?.tempC ?? 28)}{fmt.tempUnit}
                    </span>
                  </div>
                  <p className="text-lg sm:text-xl font-bold text-ink/90 capitalize leading-snug">
                    {c?.condition || 'Overcast'}
                  </p>
                  <p className="text-xs font-mono text-ink-3 mt-0.5">
                    Feels like <span className="text-ink font-semibold">{fmt.temp(c?.feelsLikeC ?? 34)}{fmt.tempUnit}</span>
                  </p>
                </div>
              </div>

              {/* 3 Metrics Pills (High/Low, Humidity, Wind) */}
              <div className="flex items-center gap-2 sm:gap-3 text-xs">
                <div className="bg-surface-2/80 border border-line rounded-2xl px-4 py-2.5 text-center min-w-[85px] shadow-sm">
                  <span className="text-[10px] text-ink-3 uppercase block font-mono font-semibold">High / Low</span>
                  <span className="font-bold text-ink text-sm sm:text-base font-mono tnum">
                    {highTemp}° / {lowTemp}°
                  </span>
                </div>

                <div className="bg-surface-2/80 border border-line rounded-2xl px-4 py-2.5 text-center min-w-[85px] shadow-sm">
                  <span className="text-[10px] text-ink-3 uppercase block font-mono font-semibold">Humidity</span>
                  <span className="font-bold text-sky-400 text-sm sm:text-base font-mono tnum">
                    {Math.round(c?.humidity ?? 89)}%
                  </span>
                </div>

                <div className="bg-surface-2/80 border border-line rounded-2xl px-4 py-2.5 text-center min-w-[85px] shadow-sm">
                  <span className="text-[10px] text-ink-3 uppercase block font-mono font-semibold">Wind</span>
                  <span className="font-bold text-emerald-400 text-sm sm:text-base font-mono tnum">
                    {Math.round(c?.windKmh ?? 5)} km/h
                  </span>
                </div>
              </div>
            </div>

            {/* Bezier Spline Temperature Graph SVG */}
            <div className="pt-4 border-t border-line/40">
              <svg viewBox="0 0 500 75" className="w-full h-16 sm:h-20 overflow-visible">
                <path
                  d={bezierData.path}
                  fill="none"
                  stroke="rgba(245, 158, 11, 0.9)"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
                {/* Active Current Temperature Glowing Node */}
                {bezierData.points[0] && (
                  <>
                    <circle
                      cx={bezierData.points[0].x}
                      cy={bezierData.points[0].y}
                      r="6"
                      fill="#f59e0b"
                      className="animate-pulse"
                    />
                    <circle
                      cx={bezierData.points[0].x}
                      cy={bezierData.points[0].y}
                      r="3"
                      fill="#ffffff"
                    />
                  </>
                )}
              </svg>

              {/* Dynamic Hourly Temperature Labels */}
              <div className="flex justify-between px-2 text-xs font-mono font-semibold text-ink-3 mt-1">
                {bezierData.temps.map((tempVal, idx) => (
                  <span
                    key={idx}
                    className={idx === 0 ? 'text-amber-400 font-extrabold text-sm' : 'text-ink-2'}
                  >
                    {tempVal}°c
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
