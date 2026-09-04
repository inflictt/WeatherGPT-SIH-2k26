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

  // Listen to custom global open-location-modal event
  useEffect(() => {
    const handleOpen = () => setOpen(true)
    window.addEventListener('open-location-picker', handleOpen)
    return () => window.removeEventListener('open-location-picker', handleOpen)
  }, [])

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', onKey)
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
        { id: '4', name: 'Kolkata', country: 'India', state: 'West Bengal', lat: 22.5726, lon: 88.3639 },
        { id: '5', name: 'London', country: 'United Kingdom', state: 'England', lat: 51.5074, lon: -0.1278 },
      ]

  return (
    <>
      <div className={cn('relative', className)}>
        {/* Trigger Button in Navigation */}
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

      {/* Big Centered Modal Portal matching Image 1 */}
      {open && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false)
          }}
        >
          <div className="w-full max-w-[580px] overflow-hidden rounded-[24px] border border-[#1e293b]/80 bg-[#0b101b] shadow-2xl space-y-6 p-6 sm:p-7 max-h-[92vh] overflow-y-auto text-white">
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3.5">
                <div className="h-11 w-11 rounded-2xl bg-[#111927] border border-[#1e293b] flex items-center justify-center text-[#38bdf8] shadow-inner">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                    <circle cx="12" cy="12" r="8" strokeOpacity="0.4" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v3m0 14v3M2 12h3m14 0h3" />
                    <circle cx="12" cy="12" r="3" fill="currentColor" fillOpacity="0.2" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-display text-xl font-bold text-white tracking-tight">
                    Choose Your Location
                  </h3>
                  <p className="text-xs text-[#94a3b8] font-mono mt-0.5">
                    Select your city or enable GPS for live weather telemetry
                  </p>
                </div>
              </div>

              <button
                onClick={() => setOpen(false)}
                className="text-[#64748b] hover:text-white font-mono text-base p-1 transition-colors"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* Popular Cities Section */}
            <div className="space-y-3">
              <div className="font-mono text-[11px] uppercase tracking-wider text-[#94a3b8] font-semibold flex items-center gap-2">
                <span>🌐</span>
                <span>POPULAR CITIES</span>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                {POPULAR_CITIES.map((c) => (
                  <button
                    key={c.name}
                    onClick={() => choose(c)}
                    className="rounded-2xl border border-[#1e293b] bg-[#111726]/80 hover:bg-[#162035] hover:border-[#38bdf8]/40 p-3.5 text-left transition-all shadow-sm flex flex-col justify-center min-h-[64px] group"
                  >
                    <span className="font-mono text-[13px] font-bold text-white leading-tight group-hover:text-[#38bdf8] transition-colors truncate">
                      {c.name}
                    </span>
                    <span className="text-[11px] text-[#64748b] font-mono mt-0.5 truncate">
                      {c.country}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Saved Favorites Section */}
            <div className="space-y-3 pt-2">
              <div className="font-mono text-[11px] uppercase tracking-wider text-[#94a3b8] font-semibold flex items-center gap-2">
                <span>⭐</span>
                <span>SAVED FAVORITES</span>
              </div>

              <div className="space-y-2">
                {activeRecents.map((fav, idx) => (
                  <div
                    key={idx}
                    onClick={() => choose(fav)}
                    className="cursor-pointer rounded-2xl border border-[#1e293b] bg-[#111726]/60 hover:bg-[#162035] hover:border-[#38bdf8]/40 px-4 py-3 flex items-center justify-between transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-[#f59e0b] text-xs">⭐</span>
                      <span className="font-mono text-[13px] font-semibold text-white group-hover:text-[#38bdf8] transition-colors">
                        {fav.name}
                      </span>
                      <span className="text-[11px] text-[#64748b] font-mono">
                        {fav.country || fav.state || 'India'}
                      </span>
                    </div>
                    <button
                      onClick={(e) => removeRecent(e, fav.id || `${fav.lat},${fav.lon}`)}
                      className="text-[#64748b] hover:text-[#f43f5e] text-xs p-1 transition-colors"
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
