import { useEffect, useRef, useState } from 'react'
import { useActiveWarnings, useData } from '../lib/DataContext'
import { getNearestShelters } from '../lib/shelters'
import { SEVERITY } from '../lib/constants'
import { t } from '../lib/i18n'
import { hhmm, cn, placeLine } from '../lib/utils'
import Icon from '../ui/Icon'
import { Card, CardHead, CardBody, Shell, PageHead } from '../ui/Bits'
import { SeverityChip } from '../ui/Severity'

export default function MapView({ prefs, lang = 'en' }) {
  const { warnings, location, mode } = useData()
  const active = useActiveWarnings()
  const [selected, setSelected] = useState(null)
  const [selectedShelter, setSelectedShelter] = useState(null)
  const [showShelters, setShowShelters] = useState(true)
  const [ready, setReady] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const el = useRef(null)
  const map = useRef(null)
  const shelterLayerGroup = useRef(null)

  const plotted = (active.length ? active : warnings || []).filter((w) => w.centroid || location)
  const shelters = getNearestShelters(location, { count: 8 })

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const L = (await import('leaflet')).default
      await import('leaflet/dist/leaflet.css')
      if (cancelled || !el.current || map.current) return

      const centre = [location?.lat ?? 28.27, location?.lon ?? 76.81]
      map.current = L.map(el.current, {
        center: centre,
        zoom: 9,
        scrollWheelZoom: false,
        attributionControl: true,
      })

      if (!prefs?.dataSaver) {
        const tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 17,
        })
        let loaded = false
        tiles.on('tileload', () => {
          loaded = true
        })
        tiles.addTo(map.current)
        setTimeout(() => !loaded && setBlocked(true), 4000)
      } else {
        setBlocked(true)
      }

      // Plot warnings
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
          .on('click', () => {
            setSelected(w.identifier)
            setSelectedShelter(null)
          })
          .bindTooltip(`${tone.label} · ${w.event}`)
      })

      // Shelter layer group
      shelterLayerGroup.current = L.layerGroup().addTo(map.current)
      shelters.forEach((sh) => {
        const iconHtml = `<div style="background:${sh.status === 'open' ? '#1b784b' : '#cc7000'};color:#fff;border:2px solid #fff;border-radius:50%;width:26px;height:26px;display:grid;place-items:center;box-shadow:0 2px 6px rgba(0,0,0,0.3);font-size:12px;font-weight:bold;">🏠</div>`
        const customIcon = L.divIcon({
          className: 'custom-shelter-icon',
          html: iconHtml,
          iconSize: [26, 26],
          iconAnchor: [13, 13],
        })

        const marker = L.marker([sh.lat, sh.lon], { icon: customIcon })
          .on('click', () => {
            setSelectedShelter(sh)
            setSelected(null)
          })
          .bindTooltip(`<b>${sh.name}</b><br/>${sh.status === 'open' ? '🟢 Open' : '🟡 Standby'} · ${sh.distanceKm} km`)

        shelterLayerGroup.current.addLayer(marker)
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

  // Toggle shelters layer visibility
  useEffect(() => {
    if (!map.current || !shelterLayerGroup.current) return
    if (showShelters) {
      if (!map.current.hasLayer(shelterLayerGroup.current)) {
        shelterLayerGroup.current.addTo(map.current)
      }
    } else {
      if (map.current.hasLayer(shelterLayerGroup.current)) {
        shelterLayerGroup.current.remove()
      }
    }
  }, [showShelters])

  const sel = (warnings || []).find((w) => w.identifier === selected) || plotted[0] || null

  return (
    <Shell className="space-y-4 pb-8">
      <PageHead
        eyebrow={placeLine(location)}
        title={t('warningMap', lang)}
      >
        Active alerts and verified emergency shelters.
      </PageHead>

      <div className="grid gap-3 lg:grid-cols-[1fr_320px]">
        <Card className="overflow-hidden">
          <div ref={el} className="aspect-[4/3] w-full sm:aspect-[16/10]" />
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-line-soft px-4 py-2.5">
            <div className="flex flex-wrap items-center gap-3">
              {['green', 'yellow', 'orange', 'red'].map((k) => (
                <span key={k} className="flex items-center gap-1.5">
                  <span className={cn('h-2 w-2 rounded-full', SEVERITY[k].bg)} aria-hidden="true" />
                  <span className="lbl">{lang === 'hi' ? t(`sev${SEVERITY[k].label}Label`, lang) : SEVERITY[k].label}</span>
                </span>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 cursor-pointer text-meta font-medium text-ink">
                <input
                  type="checkbox"
                  checked={showShelters}
                  onChange={(e) => setShowShelters(e.target.checked)}
                  className="rounded accent-accent"
                />
                <span>🏠 {lang === 'hi' ? 'राहत शिविर दिखाएं' : 'Show Shelters'}</span>
              </label>
              {blocked && <span className="lbl">Basemap offline</span>}
            </div>
          </div>
        </Card>

        <div className="space-y-3">
          {/* Shelters Sidebar List or Warning Detail */}
          {selectedShelter ? (
            <Card className="border-accent/40 bg-accent-soft/20">
              <CardHead
                title={selectedShelter.name}
                meta={`${selectedShelter.distanceKm} km`}
              />
              <CardBody className="space-y-2.5">
                <div className="flex items-center justify-between text-meta">
                  <span className={cn(
                    'rounded-full px-2 py-0.5 font-bold uppercase',
                    selectedShelter.status === 'open' ? 'bg-sev-green text-on-sev' : 'bg-sev-yellow text-on-sev'
                  )}>
                    {selectedShelter.status === 'open' ? 'Open & Active' : 'On Standby'}
                  </span>
                  <span className="text-ink-3">Cap: {selectedShelter.occupied}/{selectedShelter.totalCap}</span>
                </div>
                <p className="text-data text-ink-2">{selectedShelter.address}</p>
                <div className="flex flex-wrap gap-1 pt-1">
                  {selectedShelter.facilities.map((f) => (
                    <span key={f} className="rounded bg-surface px-1.5 py-0.5 text-[10.5px] text-ink-2">
                      ✓ {f}
                    </span>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  <a
                    href={`tel:${selectedShelter.helpline}`}
                    className="btn flex-1 items-center justify-center gap-1 py-1.5 text-data"
                  >
                    <Icon name="phone" size={13} />
                    <span>Call ({selectedShelter.helpline})</span>
                  </a>
                  <a
                    href={selectedShelter.directionsUrl || `https://www.google.com/maps/dir/?api=1&origin=${location?.lat || 28.2435},${location?.lon || 76.8453}&destination=${selectedShelter.lat},${selectedShelter.lon}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-ghost flex items-center justify-center gap-1 py-1.5 text-data hover:text-accent"
                    title="Open turn-by-turn navigation in Google Maps"
                  >
                    <Icon name="mapPin" size={13} />
                    <span>Directions ↗</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => setSelectedShelter(null)}
                    className="btn-ghost py-1.5 text-data"
                  >
                    Close
                  </button>
                </div>
              </CardBody>
            </Card>
          ) : (
            <Card>
              <CardHead title={t('tabActiveAlerts', lang)} meta={`${plotted.length}`} />
              <CardBody className="p-0">
                {plotted.length === 0 && (
                  <p className="p-5 text-data leading-relaxed text-ink-3">
                    {t('noAlertsMsg', lang)}
                  </p>
                )}
                <ul>
                  {plotted.map((w) => {
                    const on = (selected ?? plotted[0]?.identifier) === w.identifier
                    return (
                      <li key={w.identifier}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelected(w.identifier)
                            setSelectedShelter(null)
                          }}
                          aria-pressed={on}
                          className={cn(
                            'w-full border-b border-line-soft px-5 py-3.5 text-left transition-colors last:border-b-0',
                            on ? 'bg-sunk' : 'hover:bg-sunk',
                          )}
                        >
                          <SeverityChip tone={w.colour} size="sm">
                            {lang === 'hi' ? t(`sev${SEVERITY[w.colour]?.label}Label`, lang) : SEVERITY[w.colour]?.label}
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
          )}

          {sel && !selectedShelter && (
            <Card>
              <CardHead title={t('officialTextUnedited', lang)} meta={sel.sender} />
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
    </Shell>
  )
}
