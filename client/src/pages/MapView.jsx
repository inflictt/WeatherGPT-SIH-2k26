import { useMemo, useState } from 'react'
import { useActiveWarnings, useData } from '../lib/DataContext'
import { SEVERITY, RAINFALL_BANDS } from '../lib/constants'
import { cn, hhmm } from '../lib/utils'
import { Card, CardHead } from '../components/ui/Card'
import { SeverityChip } from '../components/ui/Severity'
import Reveal from '../components/ui/Reveal'
import WarningMap from '../components/map/WarningMap'
import ShelterLocator from '../components/disaster/ShelterLocator'

/**
 * Warnings on a real map.
 *
 * The sidebar, legend and selection state are the ones the Phase 1 placeholder
 * established — that was the promise made when the schematic shipped, and the
 * plate underneath is the only thing that changed.
 *
 * Warnings without geometry are still listed and still drawn, as dashed
 * district circles. That is the common case for Indian CAP bulletins, and a map
 * that only showed polygons would show almost nothing while looking like it was
 * working correctly.
 */
export default function MapView({ prefs }) {
  const { location, loading, mode } = useData()
  const warnings = useActiveWarnings()
  const [selected, setSelected] = useState(null)

  // A warning with no polygon is placed at the selected location, which is the
  // district it matched. Approximate by construction, and drawn as such.
  const plotted = useMemo(
    () =>
      warnings.map((w) => ({
        ...w,
        lat: w.area?.lat ?? location?.lat,
        lon: w.area?.lon ?? location?.lon,
      })),
    [warnings, location],
  )

  const [mapMode, setMapMode] = useState('warnings') // 'warnings' | 'wind' | 'radar' | 'lightning'

  const active = warnings.find((w) => w.identifier === selected) || warnings[0] || null
  const lat = location?.lat || 28.2435
  const lon = location?.lon || 76.8453

  return (
    <div className="shell space-y-8 py-10">
      <Reveal>
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="headline text-heading text-ink">
              Interactive Hazard & Radar Map
            </h1>
            <p className="mt-2 text-body-lg font-normal leading-relaxed text-ink-2">
              Switch between official IMD CAP disaster polygons and real-time animated wind &amp; precipitation particle flows.
            </p>
          </div>

          {/* Map Layer Mode Switcher */}
          <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-line bg-surface-2/60 p-1 backdrop-blur-sm">
            <button
              onClick={() => setMapMode('warnings')}
              className={cn(
                'rounded-lg px-3 py-1.5 font-mono text-xs font-semibold transition-all',
                mapMode === 'warnings' ? 'bg-iris text-white shadow-sm' : 'text-ink-3 hover:text-ink'
              )}
            >
              🛰️ IMD CAP Polygons
            </button>

            <button
              onClick={() => setMapMode('wind')}
              className={cn(
                'rounded-lg px-3 py-1.5 font-mono text-xs font-semibold transition-all',
                mapMode === 'wind' ? 'bg-cyanSignal text-black shadow-sm font-bold' : 'text-ink-3 hover:text-ink'
              )}
            >
              💨 Animated Wind Stream
            </button>

            <button
              onClick={() => setMapMode('radar')}
              className={cn(
                'rounded-lg px-3 py-1.5 font-mono text-xs font-semibold transition-all',
                mapMode === 'radar' ? 'bg-sev-orange text-white shadow-sm' : 'text-ink-3 hover:text-ink'
              )}
            >
              🌧️ Live Radar &amp; Rain
            </button>

            <button
              onClick={() => setMapMode('lightning')}
              className={cn(
                'rounded-lg px-3 py-1.5 font-mono text-xs font-semibold transition-all',
                mapMode === 'lightning' ? 'bg-sev-yellow text-black shadow-sm font-bold' : 'text-ink-3 hover:text-ink'
              )}
            >
              ⚡ Storms &amp; Lightning
            </button>
          </div>
        </header>
      </Reveal>

      <div className="grid gap-4 lg:grid-cols-[1fr_312px]">
        <Reveal delay={60}>
          <Card className="overflow-hidden border border-line">
            {mapMode === 'warnings' ? (
              <>
                <WarningMap
                  warnings={plotted}
                  centre={location}
                  selected={selected}
                  onSelect={setSelected}
                  className="aspect-[4/3] w-full sm:aspect-[16/10]"
                  tiles={!prefs?.dataSaver}
                />
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line-soft px-4 py-2.5">
                  {['green', 'yellow', 'orange', 'red'].map((k) => (
                    <span key={k} className="flex items-center gap-1.5">
                      <span
                        className={cn('h-1.5 w-1.5 rounded-full', SEVERITY[k].bg)}
                        aria-hidden="true"
                      />
                      <span className="font-mono text-[9.5px] uppercase tracking-[0.11em] text-ink-3">
                        {SEVERITY[k].label}
                      </span>
                    </span>
                  ))}
                  <span className="ml-auto font-mono text-[9.5px] uppercase tracking-[0.11em] text-ink-3">
                    ⌘ / Ctrl + scroll to zoom
                  </span>
                </div>
              </>
            ) : (
              <div className="relative aspect-[4/3] w-full sm:aspect-[16/10] bg-black">
                <iframe
                  title="Live Windy Particle Map"
                  src={`https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=mm&metricTemp=%C2%B0C&metricWind=km%2Fh&zoom=7&overlay=${mapMode}&lat=${lat}&lon=${lon}&message=true`}
                  className="h-full w-full border-0"
                  loading="lazy"
                />
              </div>
            )}
          </Card>
        </Reveal>

        <div className="space-y-4">
          <Reveal delay={120}>
            <Card>
              <CardHead
                label="Active here"
                meta={`${warnings.length} ${warnings.length === 1 ? 'warning' : 'warnings'}`}
              />
              {loading && (
                <p className="px-5 py-4 text-[13px] text-ink-3" aria-busy="true">
                  Checking…
                </p>
              )}

              {!loading && warnings.length === 0 && (
                <p className="px-5 py-5 text-[13px] leading-relaxed text-ink-3">
                  No active warnings for {location?.name || 'this location'}. That
                  is the normal state, and it is checked every five minutes.
                </p>
              )}

              {!loading && warnings.length > 0 && (
                <ul className="px-5 pb-4 pt-1">
                  {warnings.map((w) => {
                    const on = (selected ?? warnings[0]?.identifier) === w.identifier
                    return (
                      <li key={w.identifier}>
                        <button
                          type="button"
                          onClick={() => setSelected(w.identifier)}
                          aria-pressed={on}
                          className={cn(
                            'w-full border-b border-line-soft py-3 text-left last:border-b-0',
                            'transition-opacity duration-200',
                            on ? 'opacity-100' : 'opacity-65 hover:opacity-100',
                          )}
                        >
                          <SeverityChip tone={w.colour} size="sm">
                            {SEVERITY[w.colour].label}
                          </SeverityChip>
                          <span className="mt-1.5 block text-[13.5px] leading-snug text-ink">
                            {w.event}
                          </span>
                          <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-[0.11em] text-ink-3">
                            {w.area?.description || w.sender}
                            {w.expires ? ` · until ${hhmm(w.expires)}` : ''}
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </Card>
          </Reveal>

          {active && (
            <Reveal delay={180}>
              <Card>
                <CardHead label="Official text" meta={active.sender} />
                <div className="px-5 pb-5 pt-2">
                  <p className="text-[13px] leading-relaxed text-ink-2">{active.headline}</p>
                  {active.instruction && (
                    <p className="mt-2.5 border-t border-line-soft pt-2.5 text-[12.5px] leading-relaxed text-ink-2">
                      {active.instruction}
                    </p>
                  )}
                </div>
              </Card>
            </Reveal>
          )}

          <Reveal delay={240}>
            <Card>
              <CardHead label="Rainfall bands" meta="IMD, 24 h" />
              <ul className="px-5 pb-4 pt-2">
                {RAINFALL_BANDS.map((b) => (
                  <li
                    key={b.name}
                    className="flex items-center gap-3 border-b border-line-soft py-2 last:border-b-0"
                  >
                    <span
                      className={cn('h-1.5 w-1.5 flex-none rounded-full', SEVERITY[b.tone].bg)}
                      aria-hidden="true"
                    />
                    <span className="flex-1 text-[13px] text-ink-2">{b.name}</span>
                    <span className="tnum font-mono text-[11px] text-ink-3">{b.range}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </Reveal>

          {mode !== 'live' && (
            <p className="text-[12.5px] leading-relaxed text-ink-3">
              Running on bundled sample data — the map shows the sample warning
              area. Set <code className="font-mono">VITE_API_URL</code> for live
              CAP warnings.
            </p>
          )}
        </div>
      </div>

      <Reveal delay={280}>
        <ShelterLocator
          lat={location?.lat}
          lon={location?.lon}
          activeWarning={active}
        />
      </Reveal>
    </div>
  )
}
