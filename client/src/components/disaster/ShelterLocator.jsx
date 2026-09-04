import { useState, useEffect } from 'react'
import { Card, CardHead } from '../ui/Card'
import { cn } from '../../lib/utils'

export default function ShelterLocator({ lat, lon, activeWarning = null }) {
  const [shelters, setShelters] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedShelter, setSelectedShelter] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function fetchShelters() {
      setLoading(true)
      try {
        const queryLat = lat || 28.1928
        const queryLon = lon || 76.6191
        const res = await fetch(`/api/shelters?lat=${queryLat}&lon=${queryLon}&limit=4`)
        if (res.ok) {
          const data = await res.json()
          if (!cancelled && data.shelters) {
            setShelters(data.shelters)
            setSelectedShelter(data.shelters[0] || null)
          }
        }
      } catch (err) {
        console.warn('Could not fetch shelters:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchShelters()
    return () => {
      cancelled = true
    }
  }, [lat, lon])

  return (
    <Card className="border-sev-amber/30 bg-surface/90 shadow-xl overflow-hidden">
      <CardHead
        label="Disaster Relief & Cyclone Shelters"
        meta={activeWarning ? "⚡ Critical Evacuation Ready" : "NDMA / SDMA Verified"}
      />

      <div className="p-5 space-y-4">
        {/* Urgent Alert Evacuation Banner if warning is active */}
        {activeWarning && (
          <div className="rounded-xl border border-sev-red/30 bg-sev-red/10 p-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="text-sev-red text-base animate-pulse">🚨</span>
              <div>
                <span className="font-mono text-xs font-bold text-sev-red block">
                  Active Hazard in Your District
                </span>
                <span className="text-[11px] text-ink-2">
                  Emergency relief shelters are on standby with generator backup & medical aid.
                </span>
              </div>
            </div>
            <a
              href="tel:1077"
              className="rounded-lg bg-sev-red px-3 py-1.5 font-mono text-[11px] font-bold text-white shadow hover:bg-sev-red/90 transition-colors"
            >
              📞 DEOC 1077
            </a>
          </div>
        )}

        {loading ? (
          <div className="py-6 text-center font-mono text-xs text-ink-3">
            Locating nearest NDMA relief centers…
          </div>
        ) : shelters.length === 0 ? (
          <div className="py-6 text-center font-mono text-xs text-ink-3">
            No designated shelters registered within immediate query radius.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10.5px] uppercase tracking-wider text-ink-3 font-semibold">
                Nearest Evacuation Hubs (Ranked by GPS Distance)
              </span>
              <span className="font-mono text-[10px] text-sev-green font-bold">
                ● {shelters.length} Verified
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {shelters.map((shelter) => {
                const isSelected = selectedShelter?.id === shelter.id
                return (
                  <div
                    key={shelter.id}
                    onClick={() => setSelectedShelter(shelter)}
                    className={cn(
                      'cursor-pointer rounded-xl border p-3.5 transition-all space-y-2.5 relative',
                      isSelected
                        ? 'border-iris bg-iris/5 shadow-md ring-1 ring-iris/40'
                        : 'border-line bg-surface-2/40 hover:border-line-hover'
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs">🏠</span>
                          <h4 className="font-mono text-xs font-bold text-ink leading-tight line-clamp-1">
                            {shelter.name}
                          </h4>
                        </div>
                        <span className="text-[11px] text-ink-3 block mt-0.5">
                          {shelter.district}, {shelter.state}
                        </span>
                      </div>
                      <span className="rounded-md bg-iris/15 text-iris font-mono text-[11px] font-bold px-2 py-0.5 whitespace-nowrap">
                        {shelter.distanceKm} km
                      </span>
                    </div>

                    {/* Facility Badges */}
                    <div className="flex flex-wrap gap-1">
                      <span className="rounded-full bg-surface-3/80 border border-line px-2 py-0.5 font-mono text-[9px] text-ink-2">
                        Cap: {shelter.capacity}
                      </span>
                      {shelter.facilities?.slice(0, 2).map((f, i) => (
                        <span
                          key={i}
                          className="rounded-full bg-surface-3/80 border border-line px-2 py-0.5 font-mono text-[9px] text-ink-3"
                        >
                          ✓ {f}
                        </span>
                      ))}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-1 border-t border-line/60">
                      <a
                        href={`tel:${shelter.helpline || '1077'}`}
                        onClick={(e) => e.stopPropagation()}
                        className="font-mono text-[10px] text-ink-2 hover:text-ink flex items-center gap-1"
                      >
                        📞 Hotline: <span className="font-bold text-iris">{shelter.helpline}</span>
                      </a>

                      <a
                        href={shelter.navigationUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 rounded-lg bg-surface-3 hover:bg-iris hover:text-white px-2.5 py-1 font-mono text-[10px] font-bold text-ink transition-colors border border-line"
                      >
                        <span>🧭 Navigate</span>
                        <span>↗</span>
                      </a>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
