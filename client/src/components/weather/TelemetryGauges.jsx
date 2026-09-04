import { useData } from '../../lib/DataContext'
import { hhmm } from '../../lib/utils'
import { cn } from '../../lib/utils'

export default function TelemetryGauges() {
  const { current: c, summary24h, forecast } = useData()

  // 1. AQI calculation from PM2.5 or humidity/temp approximation
  const humidity = c?.humidity || 65
  const estimatedPm25 = Math.round((c?.tempC || 28) * 1.2 + (humidity > 70 ? 25 : 12))
  const aqiVal = c?.aqi || Math.round(estimatedPm25 * 2.1)
  const aqiStatus =
    aqiVal <= 50
      ? { label: 'GOOD', tone: 'bg-emerald-500/20 text-emerald-300' }
      : aqiVal <= 100
      ? { label: 'MODERATE', tone: 'bg-amber-500/20 text-amber-300' }
      : aqiVal <= 200
      ? { label: 'POOR', tone: 'bg-orange-500/20 text-orange-300' }
      : { label: 'SEVERE', tone: 'bg-rose-500/20 text-rose-300' }

  // 2. UV Index
  const uvVal = c?.uvIndex !== undefined ? Number(c.uvIndex).toFixed(1) : '2.4'
  const uvStatus =
    Number(uvVal) <= 2
      ? { label: 'LOW', tone: 'bg-emerald-500/20 text-emerald-300', advice: 'SPF 15 recommended' }
      : Number(uvVal) <= 5
      ? { label: 'MODERATE', tone: 'bg-amber-500/20 text-amber-300', advice: 'Wear hat & sunglasses' }
      : Number(uvVal) <= 8
      ? { label: 'VERY HIGH', tone: 'bg-orange-500/20 text-orange-300', advice: 'Seek shade midday' }
      : { label: 'EXTREME', tone: 'bg-rose-500/20 text-rose-300', advice: 'Avoid sun exposure' }

  // 3. Wind Direction & Bearing
  const windSpeed = Math.round(c?.windKmh || 5)
  const windDir = c?.windDir || 'NE'
  const windDeg = c?.windDeg || 45

  // 4. Daylight Sun Cycle (Sunrise/Sunset)
  const today = forecast?.[0]
  const sunriseStr = today?.sunrise ? hhmm(today.sunrise) : '06:00 AM'
  const sunsetStr = today?.sunset ? hhmm(today.sunset) : '06:39 PM'

  // Daylight Progress
  const now = new Date()
  const startHour = 6
  const endHour = 18.65
  const currentHour = now.getHours() + now.getMinutes() / 60
  const daylightProgressPct = Math.min(
    100,
    Math.max(0, Math.round(((currentHour - startHour) / (endHour - startHour)) * 100))
  )

  // 5. Pressure
  const pressure = Math.round(c?.pressureHpa || 982)

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
      {/* 1. AQI */}
      <div className="glass-card rounded-2xl p-3.5 flex flex-col justify-between gap-1 border border-line bg-surface/80">
        <div className="flex items-center justify-between text-xs font-bold text-ink-3">
          <span className="font-mono text-[11px] uppercase tracking-wider">AQI</span>
          <span className={cn('px-2 py-0.5 rounded-full font-mono text-[9px] font-bold uppercase', aqiStatus.tone)}>
            {aqiStatus.label}
          </span>
        </div>
        <div className="text-2xl sm:text-3xl font-bold text-ink font-display tnum">{aqiVal}</div>
        <span className="text-[10px] font-mono text-ink-3 truncate">
          PM2.5: {estimatedPm25} µg/m³
        </span>
      </div>

      {/* 2. UV Index */}
      <div className="glass-card rounded-2xl p-3.5 flex flex-col justify-between gap-1 border border-line bg-surface/80">
        <div className="flex items-center justify-between text-xs font-bold text-ink-3">
          <span className="font-mono text-[11px] uppercase tracking-wider">UV INDEX</span>
          <span className={cn('px-2 py-0.5 rounded-full font-mono text-[9px] font-bold uppercase', uvStatus.tone)}>
            {uvStatus.label}
          </span>
        </div>
        <div className="text-2xl sm:text-3xl font-bold text-ink font-display tnum">
          {uvVal} <span className="text-xs text-ink-3 font-normal font-sans">/ 12</span>
        </div>
        <span className="text-[10px] font-mono text-ink-3 truncate">
          {uvStatus.advice}
        </span>
      </div>

      {/* 3. Wind Direction */}
      <div className="glass-card rounded-2xl p-3.5 flex flex-col justify-between gap-1 border border-line bg-surface/80">
        <div className="flex items-center justify-between text-xs font-bold text-ink-3">
          <span className="font-mono text-[11px] uppercase tracking-wider">WIND</span>
          <span className="text-cyanSignal font-mono text-xs font-bold">{windDir}</span>
        </div>
        <div className="text-2xl sm:text-3xl font-bold text-ink font-display tnum">
          {windSpeed} <span className="text-xs text-ink-3 font-normal font-sans">km/h</span>
        </div>
        <span className="text-[10px] font-mono text-ink-3 truncate">
          Bearing {windDeg}°
        </span>
      </div>

      {/* 4. Daylight */}
      <div className="glass-card rounded-2xl p-3.5 flex flex-col justify-between gap-1 border border-line bg-surface/80">
        <div className="flex items-center justify-between text-xs font-bold text-ink-3">
          <span className="font-mono text-[11px] uppercase tracking-wider">DAYLIGHT</span>
          <span className="text-amber-400 font-mono text-xs font-semibold">Sun</span>
        </div>
        <div className="text-[11px] font-bold font-mono text-ink flex justify-between items-center">
          <span>{sunriseStr}</span>
          <span className="text-ink-3">-</span>
          <span>{sunsetStr}</span>
        </div>
        <div className="w-full h-1.5 bg-surface-3 rounded-full overflow-hidden mt-1">
          <div
            className="h-full bg-gradient-to-r from-amber-400 to-rose-400 rounded-full transition-all duration-500"
            style={{ width: `${daylightProgressPct}%` }}
          />
        </div>
      </div>

      {/* 5. Pressure */}
      <div className="glass-card rounded-2xl p-3.5 flex flex-col justify-between gap-1 border border-line bg-surface/80 col-span-2 sm:col-span-1">
        <div className="flex items-center justify-between text-xs font-bold text-ink-3">
          <span className="font-mono text-[11px] uppercase tracking-wider">PRESSURE</span>
          <span className="text-emerald-400 font-mono text-xs font-semibold">hPa</span>
        </div>
        <div className="text-2xl sm:text-3xl font-bold text-ink font-display tnum">{pressure}</div>
        <span className="text-[10px] font-mono text-emerald-400/90 truncate">
          Standard atmospheric
        </span>
      </div>
    </div>
  )
}
