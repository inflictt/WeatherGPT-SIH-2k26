import { useData } from '../../lib/DataContext'
import { SEVERITY, RAINFALL_BANDS } from '../../lib/constants'
import { cn } from '../../lib/utils'
import { Card, CardHead } from '../ui/Card'
import { Skeleton } from '../ui/Bits'
import { formatters } from '../../lib/usePreferences'

/**
 * Seven days. The temperature range renders as a positioned bar on a shared
 * scale so the week's shape is visible without reading a single number.
 */
export default function DailyList({ prefs }) {
  const { daily: DAILY, loading } = useData()
  const fmt = formatters(prefs?.units)

  if (loading) {
    return (
      <Card className="px-5 py-6" aria-busy="true">
        <Skeleton className="h-3 w-24" />
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="mt-4 h-4 w-full" />
        ))}
      </Card>
    )
  }

  if (!DAILY?.length) {
    return (
      <Card className="px-5 py-8 text-center">
        <p className="text-[13px] text-ink-3">No daily forecast for this location.</p>
      </Card>
    )
  }

  // The scale stays in Celsius so the bar geometry is identical in both unit
  // systems; only the printed numbers convert.
  const lo = Math.min(...DAILY.map((d) => d.min))
  const hi = Math.max(...DAILY.map((d) => d.max))
  const span = hi - lo || 1

  return (
    <Card>
      <CardHead label="Seven days" meta={`${fmt.temp(lo)}° – ${fmt.temp(hi)}°`} />
      <div className="px-5 pb-4 pt-2">
        <ul>
          {DAILY.map((d, i) => {
            const s = SEVERITY[d.tone]
            return (
              <li
                key={d.day}
                className="group grid grid-cols-[68px_1fr] items-center gap-x-4 gap-y-1 border-b border-line-soft py-3 last:border-b-0 sm:grid-cols-[74px_54px_1fr_84px]"
              >
                <div className="min-w-0">
                  <div className="truncate text-[13.5px] text-ink">{d.day}</div>
                  <div className="font-mono text-[9.5px] tnum text-ink-3">{d.date}</div>
                </div>

                <div className="hidden font-mono text-[11px] tnum text-ink-3 sm:block">
                  {d.mm > 0 ? `${d.mm} mm` : '—'}
                </div>

                {/* shared-scale temperature range */}
                <div className="col-start-2 sm:col-start-3">
                  <div className="relative h-[3px] w-full rounded-full bg-line-soft">
                    <div
                      className={cn(
                        'absolute h-full rounded-full transition-[width,left] duration-700 ease-out',
                        d.tone === 'green' ? 'bg-ink-3' : s.bg,
                      )}
                      style={{
                        left: `${((d.min - lo) / span) * 100}%`,
                        width: `${((d.max - d.min) / span) * 100}%`,
                        transitionDelay: `${i * 55}ms`,
                      }}
                    />
                  </div>
                  <div className="mt-1.5 truncate text-[12px] text-ink-3">{d.summary}</div>
                </div>

                <div className="col-start-2 flex items-baseline justify-start gap-2 font-mono text-[12.5px] tnum sm:col-start-4 sm:justify-end">
                  <span className="text-ink-3">{fmt.temp(d.min)}°</span>
                  <span className="text-ink">{fmt.temp(d.max)}°</span>
                </div>
              </li>
            )
          })}
        </ul>
      </div>

      {/* the legend is the IMD scale itself — it teaches while it labels */}
      <div className="border-t border-line-soft px-5 py-3">
        <div className="lbl mb-2 text-[9.5px]">IMD rainfall categories · mm per 24 h</div>
        <ul className="flex flex-wrap gap-x-5 gap-y-1.5">
          {RAINFALL_BANDS.map((b) => (
            <li key={b.name} className="flex items-center gap-2">
              <i className={cn('h-[7px] w-[7px] rounded-[1px]', SEVERITY[b.tone].bg)} aria-hidden="true" />
              <span className="text-[11.5px] text-ink-3">
                {b.name} <span className="font-mono tnum text-ink-3/70">{b.range}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  )
}
