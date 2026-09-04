import { cn } from '../../lib/utils'

/** Loading placeholder with a slow sheen. Used by Phase 2 when data is in flight. */
export function Skeleton({ className }) {
  return (
    <div className={cn('relative overflow-hidden rounded bg-raised', className)}>
      <div className="absolute inset-0 animate-sweep bg-gradient-to-r from-transparent via-ink/[0.06] to-transparent" />
    </div>
  )
}

/** Label above a value, the pattern used across every data readout. */
export function Stat({ label, value, unit, className }) {
  return (
    <div className={cn('min-w-0', className)}>
      <div className="lbl text-[9.5px]">{label}</div>
      <div className="mt-1 font-mono text-[15px] tnum text-ink">
        {value}
        {unit ? <span className="ml-0.5 text-[11px] text-ink-3">{unit}</span> : null}
      </div>
    </div>
  )
}

/** Section title used at page level: serif, quiet, with an optional aside. */
export function SectionTitle({ children, aside, className }) {
  return (
    <div className={cn('mb-4 flex items-end justify-between gap-6', className)}>
      <h2 className="font-display text-heading-sm font-light text-ink">
        {children}
      </h2>
      {aside ? <div className="flex-none pb-1">{aside}</div> : null}
    </div>
  )
}

/** Three-bar confidence indicator. Neutral by design — not a hazard. */
export function ConfidenceBars({ level = 'MEDIUM' }) {
  const filled = { HIGH: 3, MEDIUM: 2, LOW: 1 }[level] ?? 1
  return (
    <span className="inline-flex items-end gap-[3px]" aria-label={`Confidence ${level.toLowerCase()}`}>
      {[0, 1, 2].map((i) => (
        <i
          key={i}
          className={cn(
            'w-[3px] rounded-[1px] transition-colors duration-300',
            i === 0 ? 'h-2' : i === 1 ? 'h-3' : 'h-4',
            i < filled ? 'bg-accent' : 'bg-line',
          )}
        />
      ))}
    </span>
  )
}

/**
 * A switch. One implementation, used by Settings and Alerts.
 *
 * The knob is positioned with `left`, not with a bare `absolute` + transform.
 * Without an explicit `left`, an absolutely positioned child falls back to its
 * *static* position — and a `<button>` centres its content, so the knob started
 * at the middle of the track and the translate pushed it clean outside. It
 * looked fine at rest and broke only in the "on" state, which is exactly the
 * kind of bug that survives to a demo.
 */
export function Switch({ on, onChange, label, disabled = false }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={cn(
        'relative h-5 w-9 flex-none rounded-full border',
        'transition-colors duration-300 ease-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
        on ? 'border-accent/50 bg-accent-dim' : 'border-line bg-raised',
        disabled && 'cursor-not-allowed opacity-40',
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full',
          'transition-[left,background-color] duration-300 ease-out motion-reduce:transition-none',
          on ? 'left-[19px] bg-accent' : 'left-[3px] bg-ink-3',
        )}
      />
    </button>
  )
}
