import { cn } from '../../lib/utils'

/**
 * Segmented pill tabs, as in the reference's Temperature / Precipitation / UV
 * row.
 *
 * The reference fills the active pill amber. Here it is `accent` — the inverse
 * of the page — because amber is one keystroke from `sev-yellow`, and yellow in
 * this product means "be aware". A chart tab that looks like a hazard chip
 * would be the single most confusing thing on the screen.
 *
 * Real tablist semantics: arrow keys move between tabs, which is what a screen
 * reader user expects the moment they hear "tab".
 */
export default function Segmented({ options, value, onChange, label, className }) {
  const index = Math.max(0, options.findIndex((o) => o.key === value))

  function onKeyDown(e) {
    const delta = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!delta) return
    e.preventDefault()
    const next = (index + delta + options.length) % options.length
    onChange(options[next].key)
  }

  return (
    <div
      role="tablist"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cn(
        'inline-flex min-w-0 max-w-full gap-1 overflow-x-auto rounded-md border border-line bg-raised p-1',
        className,
      )}
      style={{ scrollbarWidth: 'none' }}
    >
      {options.map((o) => {
        const on = o.key === value
        return (
          <button
            key={o.key}
            role="tab"
            type="button"
            aria-selected={on}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(o.key)}
            className={cn(
              'flex flex-none items-center gap-1.5 rounded px-3 py-1.5',
              'font-mono text-[10px] uppercase tracking-[0.12em]',
              'transition-colors duration-250 ease-out',
              on ? 'bg-accent text-on-accent' : 'text-ink-3 hover:text-ink',
            )}
          >
            {o.icon && (
              <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor"
                strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d={o.icon} />
              </svg>
            )}
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
