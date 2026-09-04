import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../../lib/utils'

const POPULAR_CITIES = [
  { name: 'New Delhi', country: 'India', lat: 28.6139, lon: 77.209, state: 'Delhi' },
  { name: 'Mumbai', country: 'India', lat: 19.076, lon: 72.8777, state: 'Maharashtra' },
  { name: 'Bengaluru', country: 'India', lat: 12.9716, lon: 77.5946, state: 'Karnataka' },
  { name: 'Kolkata', country: 'India', lat: 22.5726, lon: 88.3639, state: 'West Bengal' },
  { name: 'London', country: 'United Kingdom', lat: 51.5074, lon: -0.1278, state: 'England' },
  { name: 'New York', country: 'United States', lat: 40.7128, lon: -74.006, state: 'New York' },
  { name: 'Tokyo', country: 'Japan', lat: 35.6762, lon: 139.6503, state: 'Tokyo' },
  { name: 'Paris', country: 'France', lat: 48.8566, lon: 2.3522, state: 'Île-de-France' },
  { name: 'Sydney', country: 'Australia', lat: -33.8688, lon: 151.2093, state: 'NSW' },
]

export default function LocationPicker({ picker, className }) {
  // Check if first time opening website
  const [open, setOpen] = useState(() => {
    try {
      const seen = sessionStorage.getItem('wg_location_popup_seen')
      if (!seen) {
        sessionStorage.setItem('wg_location_popup_seen', 'true')
        return true
      }
    } catch {
      /* private mode */
    }
    return false
  })

  const inputRef = useRef(null)
  const { location, query, setQuery, results, searching, recents, setRecents, gps } = picker

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', onKey)
    setTimeout(() => inputRef.current?.focus(), 80)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  function choose(row) {
    picker.select(row)
    setOpen(false)
  }

  function removeRecent(e, id) {
    e.stopPropagation()
    const updated = (recents || []).filter((r) => (r.id || `${r.lat},${r.lon}`) !== id)
    if (setRecents) setRecents(updated)
    try {
      localStorage.setItem('wg-recent-locations', JSON.stringify(updated))
    } catch {
      /* ignore */
    }
  }

  const activeRecents = recents && recents.length > 0
    ? recents
    : [
        { id: '1', name: 'New Delhi', country: 'India', state: 'Delhi', lat: 28.6139, lon: 77.209 },
        { id: '2', name: 'Mumbai', country: 'India', state: 'Maharashtra', lat: 19.076, lon: 72.8777 },
        { id: '3', name: 'Bengaluru', country: 'India', state: 'Karnataka', lat: 12.9716, lon: 77.5946 },
      ]

  return (
    <>
      <div className={cn('relative', className)}>
        {/* Trigger Button */}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex min-h-[44px] w-full items-center gap-2.5 rounded-xl border border-line bg-surface-2/60 px-3.5 py-2 text-left transition-all hover:bg-surface-2 hover:border-line-hover shadow-sm"
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
      </div>

      {/* Full Viewport Modal Portal */}
      {open && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
          <div className="w-full max-w-lg overflow-hidden rounded-3xl glass-panel border border-line bg-[#0d0f12]/95 shadow-2xl space-y-4 p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-line/60 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-surface-2 border border-line flex items-center justify-center text-cyanSignal">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-display text-base sm:text-lg font-bold text-ink tracking-tight">
                    Choose Your Location
                  </h3>
                  <p className="text-xs text-ink-3 font-mono">
                    Select your city or enable GPS for live weather telemetry
                  </p>
                </div>
              </div>

              <button
                onClick={() => setOpen(false)}
                className="text-ink-3 hover:text-ink font-mono text-base p-1 transition-colors"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* GPS Auto-Detect Blue Card */}
            <button
              onClick={() => {
                picker.useMyLocation()
                setOpen(false)
              }}
              disabled={gps === 'locating'}
              className="w-full rounded-2xl border border-cyanSignal/40 bg-cyanSignal/10 hover:bg-cyanSignal/15 p-3.5 sm:p-4 text-left flex items-center justify-between gap-3 transition-all group shadow-md"
            >
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-cyanSignal text-black flex items-center justify-center font-bold text-lg shadow">
                  🎯
                </div>
                <div>
                  <span className="font-mono text-xs sm:text-sm font-bold text-cyanSignal block">
                    {gps === 'locating' ? 'Acquiring GPS Signal…' : 'Use My Current Location (GPS)'}
                  </span>
                  <span className="text-[11px] text-ink-3 font-mono">
                    Auto-detect exact live coordinates from browser
                  </span>
                </div>
              </div>
              <span className="text-cyanSignal font-bold text-lg group-hover:translate-x-1 transition-transform">
                →
              </span>
            </button>

            {/* Search Input Box */}
            <div className="relative">
              <span className="absolute left-3.5 top-3.5 text-ink-3 text-xs">🔍</span>
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search any global city, region or town..."
                className="w-full rounded-2xl border border-line bg-surface-2/80 py-3 pl-9 pr-4 text-xs font-mono text-ink placeholder:text-ink-3 focus:border-cyanSignal focus:outline-none transition-all shadow-inner"
              />
              {searching && (
                <span className="absolute right-3.5 top-3.5 text-xs font-mono text-cyanSignal animate-pulse">
                  Searching…
                </span>
              )}
            </div>

            {/* Search Results Dropdown if query entered */}
            {query.trim().length > 0 && results && results.length > 0 && (
              <div className="max-h-48 overflow-y-auto space-y-1 rounded-2xl border border-line bg-surface-2 p-2">
                {results.map((r, i) => (
                  <button
                    key={i}
                    onClick={() => choose(r)}
                    className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-mono text-ink hover:bg-surface-3 transition-colors flex items-center justify-between"
                  >
                    <span>{r.name}, {r.district || r.state}</span>
                    <span className="text-ink-3 text-[10px] uppercase">{r.country || r.state}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Popular Cities 3x3 Grid */}
            <div className="space-y-2 pt-1">
              <span className="font-mono text-[10.5px] uppercase tracking-wider text-ink-3 font-semibold flex items-center gap-1.5">
                <span>🌍</span>
                <span>POPULAR CITIES</span>
              </span>

              <div className="grid grid-cols-3 gap-2">
                {POPULAR_CITIES.map((c) => (
                  <button
                    key={c.name}
                    onClick={() => choose(c)}
                    className="rounded-2xl border border-line bg-surface-2/60 hover:bg-surface-2 hover:border-line-hover p-2.5 sm:p-3 text-left transition-all shadow-sm flex flex-col justify-between min-h-[58px]"
                  >
                    <span className="font-mono text-xs font-bold text-ink leading-tight truncate">
                      {c.name}
                    </span>
                    <span className="text-[10px] text-ink-3 font-mono truncate">
                      {c.country}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Saved Favorites / Recents */}
            <div className="space-y-2 pt-2 border-t border-line/50">
              <span className="font-mono text-[10.5px] uppercase tracking-wider text-ink-3 font-semibold flex items-center gap-1.5">
                <span>⭐</span>
                <span>SAVED FAVORITES</span>
              </span>

              <div className="space-y-1.5">
                {activeRecents.slice(0, 3).map((fav, idx) => (
                  <div
                    key={idx}
                    onClick={() => choose(fav)}
                    className="cursor-pointer rounded-2xl border border-line bg-surface-2/40 hover:bg-surface-2 px-3.5 py-2.5 flex items-center justify-between transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-amber-400 text-xs">⭐</span>
                      <span className="font-mono text-xs font-semibold text-ink">
                        {fav.name}
                      </span>
                      <span className="text-[10px] text-ink-3 font-mono">
                        {fav.country || fav.state || 'India'}
                      </span>
                    </div>
                    <button
                      onClick={(e) => removeRecent(e, fav.id || `${fav.lat},${fav.lon}`)}
                      className="text-ink-3 hover:text-rose-400 text-xs p-1 transition-colors"
                      aria-label="Remove"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
