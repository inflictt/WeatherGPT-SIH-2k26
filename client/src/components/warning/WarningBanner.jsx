import { Link } from 'react-router-dom'
import { SEVERITY } from '../../lib/constants'
import { hhmm, cn } from '../../lib/utils'
import { PulseDot } from '../ui/Severity'

/**
 * §7 hard rule: an active warning renders ABOVE the answer, always. This sits
 * at the very top of the page, before the hero, on every screen that has one.
 *
 * **Prominence is proportionate to severity**, which is the part worth getting
 * right. A single fixed treatment forces a bad choice: sized for red it shouts
 * over every yellow advisory until people stop reading it, and sized for yellow
 * it whispers a red alert. So orange and red get a second line carrying the
 * official headline and a heavier rule; yellow and green stay a single quiet
 * strip.
 *
 * The `aria-live="assertive"` is deliberate and is the one place in this app
 * that earns it: a screen-reader user arriving at a page with an active red
 * warning should hear it before the temperature.
 */
export default function WarningBanner({ warning }) {
  if (!warning || warning.status !== 'active') return null

  const s = SEVERITY[warning.colour]
  const loud = warning.colour === 'orange' || warning.colour === 'red'

  return (
    <Link
      to="/alerts"
      aria-live="assertive"
      className={cn(
        'group block border-b bg-surface/90 backdrop-blur-md transition-colors duration-300 ease-out',
        s.ring,
        s.wash,
        'hover:bg-raised/80',
        // A red alert gets a real edge, not a hairline.
        warning.colour === 'red' && 'border-b-2',
      )}
    >
      <div className={cn('shell', loud ? 'py-3.5' : 'py-2.5')}>
        <div className="flex items-center gap-3 sm:gap-4">
          <PulseDot tone={warning.colour} />

          <span
            className={cn(
              'flex-none font-mono uppercase tracking-[0.16em]',
              loud ? 'text-[10.5px]' : 'text-[10px]',
              s.text,
            )}
          >
            {s.label} · {s.action}
          </span>

          <span className="hidden h-3 w-px flex-none bg-line sm:block" aria-hidden="true" />

          <span
            className={cn(
              'min-w-0 flex-1 truncate',
              loud ? 'text-[13.5px] text-ink' : 'text-[13px] text-ink-2',
            )}
          >
            {warning.event}
            {warning.area?.description ? ` — ${warning.area.description}` : ''}
            {warning.expires ? `, valid until ${hhmm(warning.expires)}` : ''}
          </span>

          <span className="flex-none font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 transition-colors duration-250 group-hover:text-accent">
            View
            <span className="ml-1.5 inline-block transition-transform duration-300 ease-out group-hover:translate-x-0.5">
              →
            </span>
          </span>
        </div>

        {/* The official headline itself, verbatim, for the severities where
            someone needs to act. Never a summary — this is the text as issued. */}
        {loud && warning.headline && (
          <p className="mt-1.5 max-w-measure pl-[22px] text-[12.5px] leading-relaxed text-ink-2">
            {warning.headline}
          </p>
        )}
      </div>
    </Link>
  )
}
