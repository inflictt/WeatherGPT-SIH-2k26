import { useEffect, useRef, useState } from 'react'
import { cn } from '../../lib/utils'

const POPULAR_INDIAN_CITIES = [
  { name: 'New Delhi', lat: 28.6139, lon: 77.209, state: 'Delhi', country: 'India' },
  { name: 'Mumbai', lat: 19.076, lon: 72.8777, state: 'Maharashtra', country: 'India' },
  { name: 'Bengaluru', lat: 12.9716, lon: 77.5946, state: 'Karnataka', country: 'India' },
  { name: 'Hyderabad', lat: 17.385, lon: 78.4867, state: 'Telangana', country: 'India' },
  { name: 'Ahmedabad', lat: 23.0225, lon: 72.5714, state: 'Gujarat', country: 'India' },
  { name: 'Chennai', lat: 13.0827, lon: 80.2707, state: 'Tamil Nadu', country: 'India' },
  { name: 'Kolkata', lat: 22.5726, lon: 88.3639, state: 'West Bengal', country: 'India' },
  { name: 'Pune', lat: 18.5204, lon: 73.8567, state: 'Maharashtra', country: 'India' },
  { name: 'Jaipur', lat: 26.9124, lon: 75.7873, state: 'Rajasthan', country: 'India' },
  { name: 'Surat', lat: 21.1702, lon: 72.8311, state: 'Gujarat', country: 'India' },
]

export default function LocationPicker({ picker, className }) {
  const [open, setOpen] = useState(false)
  const inputRef = useRef(null)

  const { location, query, setQuery, results, searching, gps } = picker

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', onKey)
    setTimeout(() => inputRef.current?.focus(), 50)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  function choose(row) {
    picker.select(row)
    setOpen(false)
  }

  return (
    <div className={cn('relative', className)}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-[44px] w-full items-center gap-2 rounded-xl border border-line bg-surface-2/60 px-3 py-2 text-left transition-all hover:bg-surface-2 hover:border-line-hover shadow-sm"
      >
        <span className="text-amber-400 text-sm">📍</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-bold text-ink font-mono">
            {location?.name || 'Choose Location'}
          </span>
          {(location?.district || location?.state) && (
            <span className="block truncate font-mono text-[9.5px] uppercase tracking-wider text-ink-3">
              {[location.district && `${location.district} district`, location.state]
                .filter(Boolean)
                .join(', ')}
            </span>
          )}
        </span>
        <span className="text-ink-3 text-xs">▼</span>
      </button>

      {/* Select Location Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-lg overflow-hidden rounded-3xl glass-panel border border-line bg-surface/95 shadow-2xl space-y-4 p-5 sm:p-6">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-line pb-4">
              <h3 className="font-display text-lg font-bold text-ink tracking-tight">
                Select Location
              </h3>
              <button
                onClick={() => setOpen(false)}
                className="text-ink-3 hover:text-ink font-mono text-base p-1"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* GPS Auto-Detect Golden Button */}
            <button
              onClick={() => {
                picker.useMyLocation()
                setOpen(false)
              }}
              disabled={gps === 'locating'}
              className="w-full rounded-2xl bg-amber-500 hover:bg-amber-400 text-black py-3.5 px-4 font-mono text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-lg active:scale-[0.99]"
            >
              <span>📍</span>
              <span>{gps === 'locating' ? 'Acquiring GPS Signal…' : 'Use Current Location (GPS)'}</span>
            </button>

            {/* Search Input Box */}
            <div className="relative">
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search any city or state..."
                className="w-full rounded-2xl border border-line bg-surface-2/80 py-3 px-4 text-xs font-mono text-ink placeholder:text-ink-3 focus:border-amber-400 focus:outline-none transition-all"
              />
              {searching && (
                <span className="absolute right-3.5 top-3 text-xs font-mono text-amber-400 animate-pulse">
                  Searching…
                </span>
              )}
            </div>

            {/* Search Results if any */}
            {query.trim().length > 0 && results && results.length > 0 && (
              <div className="max-h-44 overflow-y-auto space-y-1 rounded-2xl border border-line bg-surface-2/40 p-2">
                {results.map((r, i) => (
                  <button
                    key={i}
                    onClick={() => choose(r)}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-mono text-ink hover:bg-surface-3 transition-colors flex items-center justify-between"
                  >
                    <span>{r.name}, {r.district || r.state}</span>
                    <span className="text-ink-3 text-[10px] uppercase">{r.state}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Popular Cities in India Section */}
            <div className="space-y-2.5 pt-2">
              <span className="font-mono text-[10.5px] uppercase tracking-wider text-ink-3 font-semibold block">
                Popular Cities in India
              </span>

              <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                {POPULAR_INDIAN_CITIES.map((c) => (
                  <button
                    key={c.name}
                    onClick={() => choose(c)}
                    className="rounded-2xl border border-line bg-surface-2/60 hover:bg-surface-2 hover:border-line-hover p-3 text-left font-mono text-xs font-semibold text-ink transition-all shadow-sm flex items-center justify-between"
                  >
                    <span>{c.name}</span>
                    <span className="text-[10px] text-ink-3 font-normal">{c.state}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
