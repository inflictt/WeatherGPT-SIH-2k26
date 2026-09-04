import { useData } from '../../lib/DataContext'

export default function DailyList() {
  const { forecast, current } = useData()

  const list = (forecast && forecast.length > 0 ? forecast : []).slice(0, 7).map((d, i) => {
    let dateLabel = d.date || 'Today'
    if (i === 0) dateLabel = 'Today'
    else {
      const dateObj = new Date(Date.now() + i * 86400000)
      dateLabel = dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    }

    const cond = (d.condition || current?.condition || 'Overcast').toLowerCase()
    let icon = '☁️'
    let conditionText = 'Overcast'
    if (cond.includes('thunder') || cond.includes('storm')) {
      icon = '⛈️'
      conditionText = 'Thunderstorm'
    } else if (cond.includes('drizzle')) {
      icon = '🌧️'
      conditionText = 'Light Drizzle'
    } else if (cond.includes('rain') || cond.includes('shower')) {
      icon = '🌧️'
      conditionText = 'Rain Showers'
    } else if (cond.includes('clear') || cond.includes('sun')) {
      icon = '☀️'
      conditionText = 'Clear sky'
    }

    const high = Math.round(d.tempMax ?? (current?.tempC ? current.tempC + 2 : 30))
    const low = Math.round(d.tempMin ?? (current?.tempC ? current.tempC - 3 : 25))

    return { dateLabel, icon, conditionText, high, low }
  })

  return (
    <div className="glass-panel rounded-3xl p-5 sm:p-6 border border-line bg-surface/95 shadow-xl space-y-3">
      <h3 className="font-mono text-xs uppercase tracking-wider font-bold text-ink-3 pb-1">
        7-Day Meteorological Outlook
      </h3>

      <div className="space-y-2">
        {list.map((day, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between px-4 py-3 rounded-2xl bg-surface-2/60 hover:bg-surface-2 border border-line/70 transition-all text-xs"
          >
            <span className="w-28 sm:w-36 font-semibold text-ink font-mono">{day.dateLabel}</span>
            <div className="flex items-center gap-2 flex-1 justify-center sm:justify-start">
              <span className="text-base">{day.icon}</span>
              <span className="text-ink-2 font-medium capitalize">{day.conditionText}</span>
            </div>
            <span className="font-bold text-ink font-mono text-sm tnum">
              {day.high}° <span className="text-ink-3 font-normal">/</span> {day.low}°
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
