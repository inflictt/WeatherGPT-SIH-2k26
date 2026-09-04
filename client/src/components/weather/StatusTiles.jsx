import { SEVERITY } from '../../lib/constants'
import { cn } from '../../lib/utils'

/**
 * The reference's "Umbrella · Need / Outdoors · Great" tiles, derived from real
 * numbers rather than written by hand.
 *
 * Every verdict below is a function of the fetched forecast and the engine's
 * risk band, so the tiles move when the weather does. The IMD boundaries are
 * the same ones the risk engine uses — 64.5 mm heavy, 40 km/h strong winds —
 * rather than a second set of thresholds that could drift from the first.
 *
 * The dot colour is severity, not decoration: green means nothing to plan
 * around, and the tile that needs attention is the only coloured one.
 */

const ICONS = {
  umbrella: 'M12 3a9 9 0 0 1 9 9H3a9 9 0 0 1 9-9Zm0 9v7a2 2 0 0 0 4 0',
  outdoors: 'M12 3v18M5 8l7-5 7 5M4 21h16',
  clothing: 'M8 3 5 6l2.5 2.5V21h9V8.5L19 6l-3-3-4 2-4-2Z',
  travel: 'M4 17h16M6 17V9l3-4h6l3 4v8M8 21v-2m8 2v-2',
}

/** IMD boundaries, same as ai/app/engines/thresholds.py. */
const HEAVY_MM = 64.5
const SOME_RAIN_MM = 2
const STRONG_WIND_KMH = 40

function verdicts(forecast, risk, fmt) {
  const mm = forecast?.rain_mm ?? forecast?.mm ?? null
  const wind = forecast?.wind_kmh ?? null
  const gust = forecast?.gust_kmh ?? null
  const tmax = forecast?.tmax ?? null
  const band = risk?.overall || null

  const rain = mm == null ? null : mm >= HEAVY_MM ? 'heavy' : mm >= SOME_RAIN_MM ? 'some' : 'none'
  const windy = Math.max(wind || 0, (gust || 0) * 0.75) >= STRONG_WIND_KMH

  return [
    {
      key: 'umbrella',
      label: 'Umbrella',
      value: rain === 'heavy' ? 'Essential' : rain === 'some' ? 'Take one' : 'Not needed',
      tone: rain === 'heavy' ? 'orange' : rain === 'some' ? 'yellow' : 'green',
      detail: mm == null ? 'No rainfall data' : `${fmt.rain(mm)} ${fmt.rainUnit} expected`,
    },
    {
      key: 'outdoors',
      label: 'Outdoors',
      value:
        band === 'EXTREME' || band === 'HIGH'
          ? 'Avoid'
          : rain === 'some' || windy
            ? 'Take care'
            : 'Good',
      tone: band === 'EXTREME' ? 'red' : band === 'HIGH' ? 'orange' : rain === 'some' || windy ? 'yellow' : 'green',
      detail: band ? `Risk assessed ${band}` : 'No risk score',
    },
    {
      key: 'clothing',
      label: 'Clothing',
      value:
        tmax == null ? 'Unknown' : tmax >= 35 ? 'Light, stay shaded' : tmax >= 24 ? 'Light layers' : 'Something warm',
      tone: tmax != null && tmax >= 40 ? 'orange' : 'green',
      detail: tmax == null ? 'No temperature data' : `High of ${fmt.temp(tmax)}${fmt.tempUnit}`,
    },
    {
      key: 'travel',
      label: 'Travel',
      value: rain === 'heavy' ? 'Delay if you can' : windy ? 'Expect crosswinds' : 'Normal',
      tone: rain === 'heavy' ? 'orange' : windy ? 'yellow' : 'green',
      detail:
        wind == null ? 'No wind data' : `Wind ${fmt.speed(wind)} ${fmt.speedUnit}${gust ? `, gusts ${fmt.speed(gust)}` : ''}`,
    },
  ]
}

export default function StatusTiles({ forecast, risk, fmt }) {
  const tiles = verdicts(forecast, risk, fmt)

  return (
    <div className="grid grid-cols-2 gap-2">
      {tiles.map((t) => (
        <div
          key={t.key}
          className="flex min-w-0 flex-col gap-1.5 rounded-lg border border-line bg-surface px-3.5 py-3"
        >
          <span className="flex items-center gap-2">
            <svg viewBox="0 0 24 24" className="h-4 w-4 flex-none text-ink-3" fill="none"
              stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
              aria-hidden="true">
              <path d={ICONS[t.key]} />
            </svg>
            <span className="lbl truncate text-[9.5px]">{t.label}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className={cn(
                'h-1.5 w-1.5 flex-none rounded-full',
                // SEVERITY carries the literal class. A template string here
                // would be purged by Tailwind's JIT and the dot would vanish.
                t.tone === 'green' ? 'bg-ink-3/40' : SEVERITY[t.tone].bg,
              )}
              aria-hidden="true"
            />
            <span className="truncate text-[13.5px] text-ink">{t.value}</span>
          </span>
          <span className="truncate font-mono text-[9.5px] text-ink-3">{t.detail}</span>
        </div>
      ))}
    </div>
  )
}
