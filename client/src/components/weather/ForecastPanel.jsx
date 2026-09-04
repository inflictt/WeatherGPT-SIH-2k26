import { useMemo, useState } from 'react'
import { useData } from '../../lib/DataContext'
import { formatters } from '../../lib/usePreferences'
import { rainTone } from '../../lib/adapters'
import { Card, CardHead } from '../ui/Card'
import { Skeleton } from '../ui/Bits'
import Segmented from '../ui/Segmented'
import AreaChart from './AreaChart'
import DayChips from './DayChips'

/**
 * The forecast, in the reference's shape: a metric selector, a day selector,
 * and one large chart underneath both.
 *
 * It replaces a bar strip that could only ever show one variable. The reason
 * the reference's layout is better here is not aesthetic — rainfall, wind and
 * temperature answer three different questions ("will I get wet", "will things
 * blow over", "what do I wear"), and forcing them into one view meant two of
 * them were always missing.
 *
 * Precipitation takes the IMD severity of the day's peak, so a heavy day looks
 * heavy. Temperature and wind stay neutral: neither is a hazard on its own, and
 * colouring them would spend meaning this interface reserves for warnings.
 */

const METRICS = [
  { key: 'rain', label: 'Rain', icon: 'M12 3c3 4.5 5 7.2 5 9.5a5 5 0 0 1-10 0C7 10.2 9 7.5 12 3Z' },
  { key: 'temp', label: 'Temp', icon: 'M12 14V4a2 2 0 1 1 4 0v10a4 4 0 1 1-4 0Z' },
  { key: 'wind', label: 'Wind', icon: 'M3 8h11a3 3 0 1 0-3-3M3 16h14a3 3 0 1 1-3 3' },
]

const hourLabel = (iso) =>
  new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', hour12: true }).replace(' ', '')

export default function ForecastPanel({ prefs }) {
  const { hourly, daily, loading } = useData()
  const [metric, setMetric] = useState('rain')
  const [day, setDay] = useState(0)
  const fmt = formatters(prefs?.units)

  // Hourly data only covers the near term, so a distant day falls back to that
  // day's summary rather than showing an empty chart or, worse, today's curve
  // labelled with tomorrow's date.
  const points = useMemo(() => {
    if (day !== 0 || !hourly?.length) return []
    return hourly.map((h) => ({
      label: hourLabel(h.t),
      value: metric === 'rain' ? h.mm : metric === 'temp' ? h.tempC : (h.windKmh ?? null),
    })).filter((p) => p.value != null)
  }, [hourly, metric, day])

  const peak = points.length ? Math.max(...points.map((p) => p.value)) : 0
  const tone = metric === 'rain' && peak > 0 ? rainTone(peak) : null

  const value = (v) =>
    metric === 'rain' ? fmt.rain(v) : metric === 'temp' ? fmt.temp(v) : fmt.speed(v)
  const unit =
    metric === 'rain' ? ` ${fmt.rainUnit}` : metric === 'temp' ? fmt.tempUnit : ` ${fmt.speedUnit}`

  const selected = daily?.[day]

  return (
    <Card>
      <CardHead
        label="Forecast"
        meta={day === 0 ? 'Next 12 hours' : selected ? `${selected.day} · summary` : ''}
      />

      <div className="flex flex-col gap-4 px-5 pb-5 pt-3">
        {loading ? (
          <>
            <Skeleton className="h-8 w-56 rounded-full" />
            <Skeleton className="h-[136px] w-full" />
            <Skeleton className="h-[74px] w-full" />
          </>
        ) : (
          <>
            <Segmented
              options={METRICS}
              value={metric}
              onChange={setMetric}
              label="Which measurement to chart"
            />

            {day === 0 && points.length > 0 ? (
              <AreaChart
                points={points}
                unit={unit}
                tone={tone}
                formatValue={value}
                formatLabel={(p) => p.label}
              />
            ) : (
              <DaySummary day={selected} metric={metric} fmt={fmt} />
            )}

            <DayChips days={daily || []} value={day} onChange={setDay} fmt={fmt} />
          </>
        )}
      </div>
    </Card>
  )
}

/**
 * Beyond the hourly window there is no curve to draw, and drawing one anyway
 * would be inventing detail the source did not provide. The day's own figures,
 * stated plainly, are the honest alternative.
 */
function DaySummary({ day, metric, fmt }) {
  if (!day) {
    return <p className="py-10 text-center text-[13px] text-ink-3">No forecast for that day.</p>
  }

  const rows =
    metric === 'rain'
      ? [
          ['Rainfall', `${fmt.rain(day.mm)} ${fmt.rainUnit}`],
          ['Chance', day.prob != null ? `${Math.round(day.prob * 100)}%` : '—'],
        ]
      : metric === 'temp'
        ? [
            ['High', `${fmt.temp(day.max)}${fmt.tempUnit}`],
            ['Low', `${fmt.temp(day.min)}${fmt.tempUnit}`],
          ]
        : [['Conditions', day.summary || '—']]

  return (
    <div className="flex flex-col gap-3 py-4">
      <p className="font-sans text-subheading font-medium text-ink">
        {day.summary || day.day}
      </p>
      <dl className="flex flex-wrap gap-x-8 gap-y-2">
        {rows.map(([k, v]) => (
          <div key={k} className="flex flex-col gap-0.5">
            <dt className="lbl text-[9px]">{k}</dt>
            <dd className="tnum font-sans text-subheading font-medium text-ink">
              {v}
            </dd>
          </div>
        ))}
      </dl>
      <p className="text-[12.5px] leading-relaxed text-ink-3">
        Hour-by-hour detail is only published for the near term. This is the
        day's own summary, not an interpolation of it.
      </p>
    </div>
  )
}
