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

  const hasLocation = Boolean(LOCATION?.name)

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
      <div className="h-full rounded-[24px] border border-[#1e293b]/80 bg-[#090d16] p-6 shadow-xl" aria-busy="true">
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="h-full rounded-[24px] border border-[#1e293b]/80 bg-[#090d16] p-6 shadow-xl flex flex-col justify-between space-y-4">
      {/* Top Header matching Image 2 */}
      <div className="flex items-start justify-between pb-3 border-b border-[#1e293b]/60">
        <div>
          <h3 className="font-mono text-xs uppercase tracking-wider font-bold text-[#94a3b8]">
            TODAY'S TIMELINE & TEMP CURVE
          </h3>
          <p className="text-[11px] text-[#64748b] font-mono mt-0.5">
            24-hour meteorological projection
          </p>
        </div>

        <span className="rounded-xl border border-[#1e293b] bg-[#111726] px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-[#94a3b8]">
          {hasLocation ? `${LOCATION.name}` : 'AWAITING LOCATION'}
        </span>
      </div>

      {/* Temperature & Metrics Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 py-2">
        <div className="flex items-center gap-4">
          <span className="text-4xl sm:text-5xl select-none">{weatherIcon}</span>
          <div>
            <div className="text-3xl sm:text-4xl font-bold font-display text-white tracking-tight tnum">
              {fmt.temp(c?.tempC ?? 28)}{fmt.tempUnit}
            </div>
            <p className="text-xs font-mono text-[#94a3b8] capitalize">
              {c?.condition || 'Overcast'} · Feels like {fmt.temp(c?.feelsLikeC ?? 34)}{fmt.tempUnit}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <div className="bg-[#111726] border border-[#1e293b] rounded-xl px-3 py-1.5 text-center">
            <span className="text-[9.5px] text-[#64748b] uppercase block font-mono font-medium">H / L</span>
            <span className="font-bold text-white font-mono text-xs tnum">
              {highTemp}° / {lowTemp}°
            </span>
          </div>
          <div className="bg-[#111726] border border-[#1e293b] rounded-xl px-3 py-1.5 text-center">
            <span className="text-[9.5px] text-[#64748b] uppercase block font-mono font-medium">Humidity</span>
            <span className="font-bold text-[#38bdf8] font-mono text-xs tnum">
              {Math.round(c?.humidity ?? 89)}%
            </span>
          </div>
        </div>
      </div>

      {/* Bezier Spline Temperature Graph SVG */}
      <div className="pt-2 border-t border-[#1e293b]/40">
        <svg viewBox="0 0 500 75" className="w-full h-14 sm:h-16 overflow-visible">
          <path
            d={bezierData.path}
            fill="none"
            stroke="#f59e0b"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
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
        <div className="flex justify-between px-2 text-xs font-mono font-semibold text-[#64748b] mt-1">
          {bezierData.temps.map((tempVal, idx) => (
            <span
              key={idx}
              className={idx === 0 ? 'text-[#f59e0b] font-extrabold text-xs' : 'text-[#94a3b8] text-[11px]'}
            >
              {tempVal}°c
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
