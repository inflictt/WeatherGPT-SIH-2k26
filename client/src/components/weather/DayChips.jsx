import { SEVERITY } from '../../lib/constants'
import { cn } from '../../lib/utils'

/**
 * The horizontal day selector from the reference — Today, Sat 5, Sun 6…
 *
 * The reference chips carry a weather glyph. These carry the day's IMD
 * rainfall severity as a dot instead, which is both more honest and more
 * useful: a cartoon cloud cannot distinguish 60 mm from 160 mm, and those two
 * days need completely different decisions. A green day gets no dot at all —
 * absence of colour is the correct signal for "nothing to plan around".
 */
export default function DayChips({ days = [], value = 0, onChange, fmt }) {
  if (!days.length) return null

  return (
    <div className="rail-x" role="tablist" aria-label="Choose a day">
      {days.map((d, i) => {
        const on = i === value
        const sev = d.tone && d.tone !== 'green' ? SEVERITY[d.tone] : null
        return (
          <button
            key={`${d.day}-${d.date}`}
            role="tab"
            type="button"
            aria-selected={on}
            onClick={() => onChange(i)}
            className={cn(
              'flex flex-none flex-col gap-1 rounded-lg border px-3.5 py-2.5 text-left',
              'transition-colors duration-250 ease-out',
              on
                ? 'border-accent/45 bg-accent-dim'
                : 'border-line hover:border-ink-3 hover:bg-raised',
            )}
          >
            <span className="flex items-center gap-1.5">
              {sev && (
                <span className={cn('h-1.5 w-1.5 flex-none rounded-full', sev.bg)} aria-hidden="true" />
              )}
              <span className={cn('text-[13px]', on ? 'text-ink' : 'text-ink-2')}>{d.day}</span>
            </span>
            <span className="flex items-baseline gap-1.5">
              <span className={cn('tnum font-sans text-[15px] font-medium tracking-[-0.01em]', on ? 'text-ink' : 'text-ink-2')}>
                {fmt.temp(d.max)}°
              </span>
              <span className="tnum font-mono text-[10px] text-ink-3">{fmt.temp(d.min)}°</span>
            </span>
            <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-ink-3">
              {d.date}
            </span>
          </button>
        )
      })}
    </div>
  )
}
