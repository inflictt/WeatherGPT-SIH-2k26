import { SEVERITY } from '../lib/constants'
import { cn } from '../lib/utils'
import Icon from './Icon'

/**
 * Hazard colour, and only hazard colour.
 *
 * The accent is teal and cool; this ramp is warm, green through red. That
 * separation is the whole reason a teal button can sit beside an orange
 * warning without either one losing its meaning — and it is why nothing else
 * in the product is allowed a third colour family.
 */

/** A severity chip: dot, band name, and what the band asks you to do. */
export function SeverityChip({ tone = 'green', size = 'md', children, className }) {
  const s = SEVERITY[tone] || SEVERITY.green
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md font-medium uppercase',
        size === 'sm' ? 'px-2 py-1 text-label' : 'px-2.5 py-1.5 text-label',
        s.wash,
        s.text,
        className,
      )}
    >
      <span className={cn('h-1.5 w-1.5 flex-none rounded-full', s.bg)} aria-hidden="true" />
      {children ?? `${s.label} · ${s.action}`}
    </span>
  )
}

/**
 * A pulsing dot for a live warning. The ring animates `transform` and
 * `opacity` only, so it is composited rather than repainted — this is the one
 * looping animation in the product and it earns the exception by reporting
 * live state.
 */
export function PulseDot({ tone = 'green', className }) {
  const s = SEVERITY[tone] || SEVERITY.green
  return (
    <span className={cn('relative inline-flex h-2 w-2 flex-none', className)} aria-hidden="true">
      <span className={cn('absolute inset-0 animate-pulse-ring rounded-full opacity-60', s.bg)} />
      <span className={cn('relative h-2 w-2 rounded-full', s.bg)} />
    </span>
  )
}

/** The square severity tile that opens a warning card in the design. */
export function SeverityTile({ tone = 'orange', size = 38, className }) {
  const s = SEVERITY[tone] || SEVERITY.green
  return (
    <span
      className={cn('grid flex-none place-items-center rounded-lg', s.bg, className)}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <Icon name="alert" size={Math.round(size * 0.5)} className="text-on-sev" />
    </span>
  )
}
