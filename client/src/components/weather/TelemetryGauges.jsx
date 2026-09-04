import { useData } from '../../lib/DataContext'
import { hhmm } from '../../lib/utils'
import { cn } from '../../lib/utils'

export default function TelemetryGauges() {
  const { current: c, forecast } = useData()

  // 1. AQI calculation
  const humidity = c?.humidity || 65
  const estimatedPm25 = Math.round((c?.tempC || 28) * 1.2 + (humidity > 70 ? 25 : 12))
  const aqiVal = c?.aqi || Math.round(estimatedPm25 * 2.1)
  const aqiStatus =
    aqiVal <= 50
      ? { label: 'GOOD', tone: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' }
      : aqiVal <= 100
      ? { label: 'MODERATE', tone: 'bg-amber-500/20 text-amber-300 border-amber-500/30' }
      : aqiVal <= 200
      ? { label: 'POOR', tone: 'bg-orange-500/20 text-orange-300 border-orange-500/30' }
      : { label: 'SEVERE', tone: 'bg-rose-500/20 text-rose-300 border-rose-500/30' }

  // 2. UV Index
  const uvVal = c?.uvIndex !== undefined ? Number(c.uvIndex).toFixed(1) : '2.4'
  const uvStatus =
    Number(uvVal) <= 2
      ? { label: 'LOW', tone: 'text-emerald-400', advice: 'SPF 15 recommended' }
      : Number(uvVal) <= 5
      ? { label: 'MODERATE', tone: 'text-amber-400', advice: 'Wear hat & sunglasses' }
      : Number(uvVal) <= 8
      ? { label: 'VERY HIGH', tone: 'text-orange-400', advice: 'Seek shade midday' }
      : { label: 'EXTREME', tone: 'text-rose-400', advice: 'Avoid sun exposure' }

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
    <div className="grid grid-cols-2 gap-2.5">
      {/* 1. Humidity Card matching Image 2 */}
      <div className="rounded-2xl border border-[#1e293b] bg-[#111726]/80 p-3.5 flex flex-col justify-between min-h-[92px]">
        <div className="flex items-center justify-between text-xs text-[#94a3b8]">
          <span className="font-mono text-[10.5px] uppercase tracking-wider font-semibold">HUMIDITY</span>
          <span className="text-[#38bdf8] text-xs">💧</span>
        </div>
        <div className="text-2xl font-bold text-white font-display tnum">
          {Math.round(c?.humidity ?? 89)}%
        </div>
        <span className="text-[10px] font-mono text-[#64748b]">
          Dew Point: {Math.round((c?.tempC ?? 28) - (100 - (c?.humidity ?? 89)) / 5)}°C
        </span>
      </div>

      {/* 2. UV Index Card matching Image 2 */}
      <div className="rounded-2xl border border-[#1e293b] bg-[#111726]/80 p-3.5 flex flex-col justify-between min-h-[92px]">
        <div className="flex items-center justify-between text-xs text-[#94a3b8]">
          <span className="font-mono text-[10.5px] uppercase tracking-wider font-semibold">UV INDEX</span>
          <span className="text-amber-400 text-xs">☀️</span>
        </div>
        <div className="text-2xl font-bold text-white font-display tnum">
          {uvVal} <span className="text-xs text-[#64748b] font-normal">/ 12</span>
        </div>
        <span className="text-[10px] font-mono text-[#64748b] truncate">
          {uvStatus.advice}
        </span>
      </div>

      {/* 3. Wind Direction & Speed */}
      <div className="rounded-2xl border border-[#1e293b] bg-[#111726]/80 p-3.5 flex flex-col justify-between min-h-[92px]">
        <div className="flex items-center justify-between text-xs text-[#94a3b8]">
          <span className="font-mono text-[10.5px] uppercase tracking-wider font-semibold">WIND</span>
          <span className="text-[#00e5ff] font-mono text-xs font-bold">{windDir}</span>
        </div>
        <div className="text-2xl font-bold text-white font-display tnum">
          {windSpeed} <span className="text-xs text-[#64748b] font-normal">km/h</span>
        </div>
        <span className="text-[10px] font-mono text-[#64748b]">
          Bearing {windDeg}° · Calm
        </span>
      </div>

      {/* 4. Barometric Pressure */}
      <div className="rounded-2xl border border-[#1e293b] bg-[#111726]/80 p-3.5 flex flex-col justify-between min-h-[92px]">
        <div className="flex items-center justify-between text-xs text-[#94a3b8]">
          <span className="font-mono text-[10.5px] uppercase tracking-wider font-semibold">AIR PRESSURE</span>
          <span className="text-emerald-400 font-mono text-xs font-semibold">hPa</span>
        </div>
        <div className="text-2xl font-bold text-white font-display tnum">
          {pressure}
        </div>
        <span className="text-[10px] font-mono text-[#10b981] truncate">
          Standard atmospheric
        </span>
      </div>

      {/* 5. Daylight Cycle & Sunrise/Sunset (Spans 2 cols) */}
      <div className="col-span-2 rounded-2xl border border-[#1e293b] bg-[#111726]/80 p-3 flex flex-col justify-between gap-1.5">
        <div className="flex items-center justify-between text-xs text-[#94a3b8]">
          <span className="font-mono text-[10.5px] uppercase tracking-wider font-semibold">DAYLIGHT & SOLAR</span>
          <span className="text-amber-400 text-xs font-mono">{sunriseStr} - {sunsetStr}</span>
        </div>
        <div className="w-full h-1.5 bg-[#070a10] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-400 via-rose-400 to-[#38bdf8] rounded-full transition-all duration-500"
            style={{ width: `${daylightProgressPct}%` }}
          />
        </div>
      </div>
    </div>
  )
}
