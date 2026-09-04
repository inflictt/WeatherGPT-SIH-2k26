import { SEVERITY, RISK_TONE } from '../../lib/constants'
import { cn } from '../../lib/utils'

/**
 * A hazard chip. `tone` is an IMD colour key; `band` is a risk band that
 * maps onto one. Colour is never decorative here — if it is coloured, it is
 * a hazard level.
 */
export function SeverityChip({ tone, band, children, size = 'md', className }) {
  const key = tone || RISK_TONE[band] || 'green'
  const s = SEVERITY[key]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-xs border font-mono uppercase tracking-[0.12em]',
        size === 'sm' ? 'px-1.5 py-[2px] text-[9.5px]' : 'px-2 py-[3px] text-[10.5px]',
        s.text,
        s.ring,
        s.wash,
        className,
      )}
    >
      <i className={cn('h-[7px] w-[7px] rounded-[1px]', s.bg)} aria-hidden="true" />
      {children ?? band ?? s.label}
    </span>
  )
}

/** A live, breathing dot — used only where something is genuinely active. */
export function PulseDot({ tone = 'orange', className }) {
  const s = SEVERITY[tone]
  return (
    <span className={cn('relative inline-flex h-2 w-2 flex-none', className)} aria-hidden="true">
      <span className={cn('absolute inset-0 rounded-full opacity-60 animate-pulse-ring', s.bg)} />
      <span className={cn('relative h-2 w-2 rounded-full', s.bg)} />
    </span>
  )
}

/** Horizontal weight bar for the risk breakdown. */
export function Meter({ value, max = 40, band, delay = 0 }) {
  const key = RISK_TONE[band] || 'green'
  const s = SEVERITY[key]
  return (
    <div className="h-[3px] w-full overflow-hidden rounded-full bg-line-soft">
      <div
        className={cn('h-full rounded-full transition-[width] duration-[900ms] ease-out', s.bg)}
        style={{ width: `${Math.min(100, (value / max) * 100)}%`, transitionDelay: `${delay}ms` }}
      />
    </div>
  )
}
