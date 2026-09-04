import { cn } from '../lib/utils'
import Icon from './Icon'

/* ------------------------------------------------------------------ surfaces */

/**
 * The one container. Rounded 18, hairline border, one soft shadow — the design
 * lifts cards off the ground rather than separating them by surface contrast,
 * so the shadow is a real token here (`--shadow`, defined per theme, because a
 * dark theme needs a far deeper one to read at all).
 */
export function Card({ as: Tag = 'section', className, tone, children, ...rest }) {
  return (
    <Tag
      className={cn(
        'rounded-xl border border-line bg-surface shadow-card',
        tone && 'border-l-2',
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  )
}

/** Card header: title left, quiet meta right. */
export function CardHead({ title, meta, action, className }) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-line-soft px-5 py-4',
        className,
      )}
    >
      <h2 className="text-body-sm font-semibold tracking-[-0.01em] text-ink">{title}</h2>
      {action || (meta ? <span className="lbl">{meta}</span> : null)}
    </div>
  )
}

export function CardBody({ className, children }) {
  return <div className={cn('px-5 py-4', className)}>{children}</div>
}

/* ---------------------------------------------------------------- type bits */

/** Uppercase mono label — the design's signature. */
export function Label({ children, className }) {
  return <span className={cn('lbl', className)}>{children}</span>
}

/**
 * The eyebrow above a page title: a pin, then place · district · state in mono
 * caps. Used as the masthead line on every screen that is about one place.
 */
export function Eyebrow({ icon = 'pin', children, className }) {
  return (
    <span className={cn('flex min-w-0 items-center gap-2 text-accent', className)}>
      {icon ? <Icon name={icon} size={13} className="flex-none" /> : null}
      <span className="lbl truncate text-accent">{children}</span>
    </span>
  )
}

/** Label over value over note — the design's fact cell, used in every grid. */
export function Fact({ icon, label, value, note, className, valueClass }) {
  return (
    <div className={cn('min-w-0 p-4', className)}>
      <div className="flex items-center gap-2 text-ink-3">
        {icon ? <Icon name={icon} size={14} className="flex-none" /> : null}
        <span className="lbl truncate">{label}</span>
      </div>
      <div className={cn('mt-2 text-subheading font-semibold tracking-[-0.02em] text-ink', valueClass)}>
        {value}
      </div>
      {note ? <div className="mt-1 text-data text-ink-3">{note}</div> : null}
    </div>
  )
}

/* ------------------------------------------------------------------ controls */

/** Segmented control — the °C/°F and EN/हिं/HIN pattern from the header. */
export function Segmented({ options, value, onChange, label, size = 'md', className }) {
  const pad = size === 'sm' ? 'min-h-[34px] px-2.5' : 'min-h-[38px] px-3'
  return (
    <div
      role="group"
      aria-label={label}
      className={cn('flex flex-none items-center gap-0.5 rounded-lg border border-line bg-sunk p-[3px]', className)}
    >
      {options.map((o) => {
        const on = o.key === value
        return (
          <button
            key={o.key}
            type="button"
            onClick={() => onChange(o.key)}
            aria-pressed={on}
            title={o.title || o.label}
            className={cn(
              'flex items-center justify-center rounded-md text-data font-medium leading-none transition-colors duration-150',
              pad,
              on ? 'bg-accent text-on-accent' : 'text-ink-3 hover:text-ink',
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

/** Square icon button — the header's utility row. */
export function IconButton({ icon, label, onClick, active, size = 34, className, ...rest }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        'tap grid flex-none place-items-center rounded-md border transition-colors duration-150',
        active
          ? 'border-accent bg-accent-soft text-accent'
          : 'border-line bg-sunk text-ink-2 hover:border-accent hover:text-accent',
        className,
      )}
      style={{ width: size, height: size }}
      {...rest}
    >
      <Icon name={icon} size={16} />
    </button>
  )
}

/**
 * A switch. The knob is anchored with `left` and moved by `transform`: an
 * absolutely positioned child with no `left` falls back to its static position,
 * and a <button> centres its content, so the knob would start mid-track and the
 * offset would push it clean outside. The transform is what keeps it smooth —
 * `left` forces layout every frame, `translate` is composited.
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
        'tap relative h-6 w-11 flex-none rounded-full border transition-colors duration-300',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
        on ? 'border-accent bg-accent' : 'border-line bg-sunk',
        disabled && 'cursor-not-allowed opacity-40',
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'absolute left-[3px] top-1/2 h-4 w-4 -translate-y-1/2 rounded-full transition-transform duration-300 ease-out motion-reduce:transition-none',
          on ? 'translate-x-5 bg-on-accent' : 'translate-x-0 bg-ink-3',
        )}
      />
    </button>
  )
}

/* -------------------------------------------------------------------- meters */

/**
 * A bar. Grows by `scaleX`, never by `width`: a width transition forces layout
 * on every frame of the animation, a transform is composited. On the mid-range
 * Android this product targets, that is the difference between a bar that
 * glides and one that steps.
 */
export function Meter({ value, max = 100, tone, delay = 0, className }) {
  const pct = Math.max(0, Math.min(1, (value || 0) / (max || 1)))
  return (
    <div className={cn('h-1.5 w-full overflow-hidden rounded-full bg-sunk', className)}>
      <div
        className={cn('h-full w-full origin-left rounded-full transition-transform duration-700 ease-out', tone || 'bg-accent')}
        style={{ transform: `scaleX(${pct})`, transitionDelay: `${delay}ms` }}
      />
    </div>
  )
}

/** Three ascending bars. Neutral by design — confidence is not a hazard. */
export function ConfidenceBars({ level = 'MEDIUM', className }) {
  const filled = { HIGH: 3, MEDIUM: 2, LOW: 1 }[level] ?? 1
  return (
    <span
      className={cn('inline-flex items-end gap-[3px]', className)}
      aria-label={`Confidence ${String(level).toLowerCase()}`}
    >
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

/** Loading placeholder. The sheen moves by transform, so it costs nothing. */
export function Skeleton({ className }) {
  return (
    <div className={cn('relative overflow-hidden rounded-md bg-sunk', className)} aria-hidden="true">
      <div className="absolute inset-0 animate-sweep bg-gradient-to-r from-transparent via-ink/[0.06] to-transparent" />
    </div>
  )
}

/* -------------------------------------------------------------------- layout */

/** The page column. One max-width, one gutter, everywhere. */
export function Shell({ className, children, as: Tag = 'div' }) {
  return <Tag className={cn('mx-auto w-full max-w-shell px-4 sm:px-6 lg:px-7', className)}>{children}</Tag>
}

/**
 * The page masthead: eyebrow, big title, optional aside.
 * Left-aligned rather than centred — a centred masthead over a left-aligned
 * data grid reads as two pages stapled together.
 */
export function PageHead({ eyebrow, title, children, aside, className }) {
  return (
    <header className={cn('pb-6 pt-7 sm:pb-8 sm:pt-9', className)}>
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div className="min-w-0">
          {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
          <h1 className="headline mt-2 text-heading text-ink">{title}</h1>
        </div>
        {aside ? <div className="flex-none">{aside}</div> : null}
      </div>
      {children ? (
        <p className="mt-4 max-w-measure text-body-sm leading-relaxed text-ink-2">{children}</p>
      ) : null}
    </header>
  )
}

/** Sub-tabs within a screen (My farm / Crop doctor / Planner). */
export function SubTabs({ tabs, value, onChange, className }) {
  return (
    <div className={cn('rail-x -mx-1 flex items-center gap-1 border-b border-line px-1', className)} role="tablist">
      {tabs.map((t) => {
        const on = t.key === value
        return (
          <button
            key={t.key}
            role="tab"
            type="button"
            aria-selected={on}
            onClick={() => onChange(t.key)}
            className={cn(
              'relative flex-none px-3 py-3 text-body-sm font-medium transition-colors duration-150',
              on ? 'text-ink' : 'text-ink-3 hover:text-ink-2',
            )}
          >
            {t.label}
            <span
              aria-hidden="true"
              className={cn(
                'absolute inset-x-2 -bottom-px h-0.5 origin-left rounded-full bg-accent transition-transform duration-300 ease-out',
                on ? 'scale-x-100' : 'scale-x-0',
              )}
            />
          </button>
        )
      })}
    </div>
  )
}
