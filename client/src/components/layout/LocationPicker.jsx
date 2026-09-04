import { useEffect, useRef, useState } from 'react'
import { cn } from '../../lib/utils'

/**
 * The place switcher.
 *
 * Opens as a popover from the current location, because the current location
 * *is* the button — there is no separate label taking up space to say what a
 * chevron next to a place name already says.
 *
 * Escape closes, an outside click closes, and focus lands in the field on open,
 * so someone who reaches for it by keyboard can type immediately.
 */
export default function LocationPicker({ picker, className }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const inputRef = useRef(null)

  const { location, query, setQuery, results, searching, recents, gps, error } = picker

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    const onClick = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onClick)
    inputRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onClick)
    }
  }, [open])

  function choose(row) {
    picker.select(row)
    setOpen(false)
  }

  const gpsMessage =
    gps === 'denied'
      ? 'Location access is blocked. Allow it in your browser settings, or search above.'
      : gps === 'unsupported'
        ? 'This browser cannot report a location. Search instead.'
        : gps === 'failed'
          ? "Couldn't get a fix. Try again, or search above."
          : null

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={cn(
          'flex min-h-[44px] w-full items-center gap-2 rounded-lg border px-3 py-2 text-left',
          'transition-colors duration-250 ease-out',
          open ? 'border-accent/45 bg-raised' : 'border-line hover:border-ink-3 hover:bg-raised',
        )}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4 flex-none text-ink-3" fill="none"
          stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z" />
          <circle cx="12" cy="10" r="2.5" />
        </svg>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13.5px] text-ink">
            {location?.name || 'Choose a location'}
          </span>
          {(location?.district || location?.state) && (
            <span className="block truncate font-mono text-[9.5px] uppercase tracking-[0.11em] text-ink-3">
              {[location.district && `${location.district} district`, location.state]
                .filter(Boolean)
                .join(', ')}
            </span>
          )}
        </span>
        <svg viewBox="0 0 24 24" aria-hidden="true"
          className={cn('h-3.5 w-3.5 flex-none text-ink-3 transition-transform duration-250', open && 'rotate-180')}
          fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Choose a location"
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-lg border border-line bg-surface"
        >
          <div className="border-b border-line-soft p-2">
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Village, town or district…"
              aria-label="Search for a place"
              className="h-10 w-full rounded bg-raised px-3 text-[13.5px] text-ink placeholder:text-ink-3 focus:outline-none focus:ring-2 focus:ring-accent/35"
            />
          </div>

          <div className="max-h-[46vh] overflow-y-auto">
            <button
              type="button"
              onClick={picker.useMyLocation}
              disabled={gps === 'locating'}
              className="flex w-full items-center gap-2.5 border-b border-line-soft px-3 py-3 text-left transition-colors duration-200 hover:bg-raised disabled:opacity-60"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 flex-none text-ink-3" fill="none"
                stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <circle cx="12" cy="12" r="3.2" />
                <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
              </svg>
              <span className="text-[13px] text-ink">
                {gps === 'locating' ? 'Finding you…' : 'Use my location'}
              </span>
            </button>

            {gpsMessage && (
              <p role="alert" className="border-b border-line-soft px-3 py-2.5 text-[12px] leading-relaxed text-sev-orange">
                {gpsMessage}
              </p>
            )}

            {searching && (
              <p className="px-3 py-3 text-[12.5px] text-ink-3" aria-busy="true">Searching…</p>
            )}

            {!searching && query.trim().length >= 2 && results.length === 0 && (
              <p className="px-3 py-3 text-[12.5px] leading-relaxed text-ink-3">
                {error === 'no-api'
                  ? 'Search needs the API. Set VITE_API_URL, or pick a recent place below.'
                  : `No place matching “${query.trim()}”. Try the district name.`}
              </p>
            )}

            {results.map((r) => (
              <Row key={r.id} row={r} onPick={choose} />
            ))}

            {!query.trim() && recents.length > 0 && (
              <>
                <p className="px-3 pb-1 pt-3 font-mono text-[9px] uppercase tracking-[0.13em] text-ink-3">
                  Recent
                </p>
                {recents.map((r) => (
                  <Row key={r.id} row={r} onPick={choose} active={r.id === location?.id} />
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Row({ row, onPick, active = false }) {
  return (
    <button
      type="button"
      onClick={() => onPick(row)}
      className={cn(
        'flex w-full items-baseline gap-2 px-3 py-2.5 text-left transition-colors duration-200 hover:bg-raised',
        active && 'bg-accent-dim',
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13.5px] text-ink">{row.name}</span>
        <span className="block truncate font-mono text-[9.5px] uppercase tracking-[0.11em] text-ink-3">
          {[row.district, row.state].filter(Boolean).join(', ') || row.kind || ''}
        </span>
      </span>
      {row.kind && (
        <span className="flex-none font-mono text-[9px] uppercase tracking-[0.11em] text-ink-3">
          {row.kind}
        </span>
      )}
    </button>
  )
}
