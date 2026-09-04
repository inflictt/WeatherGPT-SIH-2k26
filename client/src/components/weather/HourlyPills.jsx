import { useData } from '../../lib/DataContext'
import { hhmm } from '../../lib/utils'

export default function HourlyPills() {
  const { hourly, current: c } = useData()

  // Build 12-hour sequence
  const list = (hourly && hourly.length > 0 ? hourly : []).slice(0, 12).map((h, i) => {
    const isNow = i === 0
    const timeStr = isNow ? 'Now' : h.time ? hhmm(h.time) : `${(new Date().getHours() + i) % 24}:00`
    const temp = Math.round(h.temp ?? c?.tempC ?? 27)
    const rainProb = Math.round((h.rainProb ?? (h.pop ? h.pop / 100 : (c?.rainProb || 0.15))) * 100)
    
    // Icon
    const cond = (h.condition || c?.condition || '').toLowerCase()
    let icon = '☁️'
    if (cond.includes('thunder') || cond.includes('storm')) icon = '⛈️'
    else if (cond.includes('rain') || cond.includes('drizzle') || cond.includes('shower')) icon = '🌧️'
    else if (cond.includes('clear') || cond.includes('sun')) icon = '☀️'

    return { timeStr, temp, rainProb, icon }
  })

  return (
    <div className="glass-panel rounded-3xl p-5 sm:p-6 border border-line bg-surface/95 shadow-xl space-y-4">
      <h3 className="font-mono text-xs uppercase tracking-wider font-bold text-ink-3">
        24-Hour Telemetry Forecast
      </h3>

      <div className="flex items-center gap-2.5 overflow-x-auto pb-2 pt-1 no-scrollbar">
        {list.map((item, idx) => (
          <div
            key={idx}
            className="flex-shrink-0 bg-surface-2/80 hover:bg-surface-3 border border-line rounded-2xl p-3.5 text-center min-w-[76px] flex flex-col items-center justify-between gap-2 transition-all shadow-sm"
          >
            <span className="font-mono text-[11px] text-ink-3 font-semibold">{item.timeStr}</span>
            <span className="text-2xl drop-shadow-sm select-none">{item.icon}</span>
            <span className="text-base font-bold text-ink font-mono tnum">{item.temp}°</span>
            <span className="text-[10px] font-mono text-sky-400 font-semibold">{item.rainProb}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}
