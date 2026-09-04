import { useEffect, useRef, useState } from 'react'
import { useActiveWarnings, useData } from '../lib/DataContext'
import { SEVERITY } from '../lib/constants'
import { hhmm, cn, placeLine } from '../lib/utils'
import Icon from '../ui/Icon'
import { Card, CardHead, CardBody, Shell, PageHead } from '../ui/Bits'
import { SeverityChip } from '../ui/Severity'

/**
 * Warnings on a real map.
 *
 * Warnings without geometry are still drawn — as dashed district circles.
 * That is the common case for Indian CAP bulletins, because Sachet publishes
 * polygons at a URL that currently 403s, and a polygon-only map would show
 * almost nothing while looking like it was working correctly.
 */
export default function MapView({ prefs }) {
  const { warnings, location, mode } = useData()
  const active = useActiveWarnings()
  const [selected, setSelected] = useState(null)
  const [ready, setReady] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const el = useRef(null)
  const map = useRef(null)

  const plotted = (active.length ? active : warnings || []).filter((w) => w.centroid || location)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const L = (await import('leaflet')).default
      await import('leaflet/dist/leaflet.css')
      if (cancelled || !el.current || map.current) return

      const centre = [location?.lat ?? 24.58, location?.lon ?? 73.71]
      map.current = L.map(el.current, {
        center: centre,
        zoom: 8,
        scrollWheelZoom: false,
        attributionControl: true,
      })

      if (!prefs?.dataSaver) {
        const tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 17,
        })
        // If tiles never load — offline, or blocked by a host's CSP — say so
        // rather than showing an empty grey plate that looks broken.
        let loaded = false
        tiles.on('tileload', () => {
          loaded = true
        })
        tiles.addTo(map.current)
        setTimeout(() => !loaded && setBlocked(true), 4000)
      } else {
        setBlocked(true)
      }

      plotted.forEach((w) => {
        const tone = SEVERITY[w.colour] || SEVERITY.green
        const colour = getComputedStyle(document.documentElement)
          .getPropertyValue(`--c-sev-${w.colour || 'green'}`)
          .trim()
        const rgb = colour ? `rgb(${colour})` : '#cc5f1e'
        const c = w.centroid || [location.lat, location.lon]
        L.circle(c, {
          radius: (w.radiusKm || 35) * 1000,
          color: rgb,
          weight: 2,
          dashArray: w.geometry ? null : '6 6',
          fillColor: rgb,
          fillOpacity: 0.12,
        })
          .addTo(map.current)
          .on('click', () => setSelected(w.identifier))
          .bindTooltip(`${tone.label} · ${w.event}`)
      })

      setReady(true)
    })()
    return () => {
      cancelled = true
      map.current?.remove()
      map.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const sel = (warnings || []).find((w) => w.identifier === selected) || plotted[0] || null

  return (
    <Shell className="space-y-4 pb-8">
      <PageHead
        eyebrow={placeLine(location)}
        title="Warning map"
      >
        Active warnings shaded by IMD severity. A solid outline is the alert's own polygon; a
        dashed circle means the bulletin named a district rather than drawing one.
      </PageHead>

      <div className="grid gap-3 lg:grid-cols-[1fr_320px]">
        <Card className="overflow-hidden">
          <div ref={el} className="aspect-[4/3] w-full sm:aspect-[16/10]" />
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line-soft px-4 py-2.5">
            {['green', 'yellow', 'orange', 'red'].map((k) => (
              <span key={k} className="flex items-center gap-1.5">
                <span className={cn('h-2 w-2 rounded-full', SEVERITY[k].bg)} aria-hidden="true" />
                <span className="lbl">{SEVERITY[k].label}</span>
              </span>
            ))}
            {blocked && <span className="lbl ml-auto">Basemap unavailable — areas shown to scale</span>}
          </div>
        </Card>

        <div className="space-y-3">
          <Card>
            <CardHead title="Active here" meta={`${plotted.length}`} />
            <CardBody className="p-0">
              {plotted.length === 0 && (
                <p className="p-5 text-data leading-relaxed text-ink-3">
                  No active warnings for {location?.name || 'this location'}. That is the normal
                  state, and it is checked every five minutes.
                </p>
              )}
              <ul>
                {plotted.map((w) => {
                  const on = (selected ?? plotted[0]?.identifier) === w.identifier
                  return (
                    <li key={w.identifier}>
                      <button
                        type="button"
                        onClick={() => setSelected(w.identifier)}
                        aria-pressed={on}
                        className={cn(
                          'w-full border-b border-line-soft px-5 py-3.5 text-left transition-colors last:border-b-0',
                          on ? 'bg-sunk' : 'hover:bg-sunk',
                        )}
                      >
                        <SeverityChip tone={w.colour} size="sm">
                          {SEVERITY[w.colour]?.label}
                        </SeverityChip>
                        <span className="mt-1.5 block text-caption font-medium leading-snug text-ink">
                          {w.event}
                        </span>
                        <span className="lbl mt-0.5 block">
                          {w.area?.description || w.sender}
                          {w.expires ? ` · until ${hhmm(w.expires)}` : ''}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </CardBody>
          </Card>

          {sel && (
            <Card>
              <CardHead title="Official text" meta={sel.sender} />
              <CardBody>
                <p className="text-data leading-relaxed text-ink-2">{sel.headline}</p>
                {sel.instruction && (
                  <p className="mt-2.5 border-t border-line-soft pt-2.5 text-data leading-relaxed text-ink-2">
                    {sel.instruction}
                  </p>
                )}
              </CardBody>
            </Card>
          )}
        </div>
      </div>

      {mode !== 'live' && (
        <p className="text-data leading-relaxed text-ink-3">
          Running on bundled sample data — the map shows the sample warning area. Set{' '}
          <code className="code">VITE_API_URL</code> for live CAP warnings.
        </p>
      )}
    </Shell>
  )
}
