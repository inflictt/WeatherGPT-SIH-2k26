import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { SEVERITY } from '../../lib/constants'

/**
 * Leaflet, wired to real warnings.
 *
 * Two things shape this component more than anything else.
 *
 * **Most Indian CAP alerts have no polygon.** NDMA Sachet publishes geometry at
 * a separate URL which currently answers 403, so `area.geometry` is usually
 * absent. Rather than showing an empty map, a warning without geometry is drawn
 * as a circle at its district centroid, visibly distinguished by a dashed
 * outline — the difference between "this is the alert area" and "the alert
 * names this district" is real and the map should not blur it.
 *
 * **The basemap must not compete.** Colour means hazard in this product, so the
 * tiles are desaturated and dimmed per theme. A full-colour street map would
 * put more saturation on screen than the warnings themselves.
 */

// CSS custom properties are the single source of colour; read them at draw
// time so the map follows a theme change like everything else.
function cssColour(name, alpha = 1) {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return raw ? `rgba(${raw.split(/\s+/).join(', ')}, ${alpha})` : `rgba(120,120,120,${alpha})`
}

const SEV_VAR = {
  green: '--c-sev-green',
  yellow: '--c-sev-yellow',
  orange: '--c-sev-orange',
  red: '--c-sev-red',
}

/** Rough radius for a district circle, in metres. Not a claim of extent. */
const DISTRICT_RADIUS_M = 22000

export default function WarningMap({
  warnings = [],
  centre,
  selected,
  onSelect,
  className = '',
  tiles = true,
}) {
  const hostRef = useRef(null)
  const mapRef = useRef(null)
  const layerRef = useRef(null)
  const [tilesBlocked, setTilesBlocked] = useState(false)

  // --- create once ------------------------------------------------------
  useEffect(() => {
    if (mapRef.current || !hostRef.current) return

    const map = L.map(hostRef.current, {
      center: [centre?.lat ?? 23.5, centre?.lon ?? 78.5],
      zoom: centre ? 8 : 5,
      zoomControl: false,
      // A map inside a scrolling page must not eat the scroll. Ctrl/⌘ + wheel
      // zooms; a plain wheel scrolls the page, which is what people expect.
      scrollWheelZoom: false,
      attributionControl: true,
    })

    if (!tiles) {
      // Data saver: warning geometry still draws, and the caption says why the
      // basemap is absent rather than leaving a blank plate.
      setTilesBlocked(true)
    }
    const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 18,
    })

    // Tiles can be unreachable for reasons that are not failures: no network,
    // a sandbox that blocks third-party images. The warning geometry is drawn
    // by us and still renders, so the map stays useful — it just stops
    // pretending to be a basemap. Saying which is better than a grey square.
    let missing = 0
    tileLayer.on('tileerror', () => {
      missing += 1
      if (missing === 3) setTilesBlocked(true)
    })
    if (tiles) tileLayer.addTo(map)

    L.control.zoom({ position: 'bottomright' }).addTo(map)
    L.control.scale({ imperial: false, position: 'bottomleft' }).addTo(map)

    layerRef.current = L.layerGroup().addTo(map)
    mapRef.current = map

    // Leaflet measures on create; inside a card that is still laying out it
    // can size to zero and render a grey box.
    const t = setTimeout(() => map.invalidateSize(), 120)
    return () => {
      clearTimeout(t)
      map.remove()
      mapRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // --- follow the selected location ------------------------------------
  useEffect(() => {
    const map = mapRef.current
    if (!map || !centre?.lat) return
    map.flyTo([centre.lat, centre.lon], Math.max(map.getZoom(), 8), { duration: 0.6 })
  }, [centre?.lat, centre?.lon])

  // --- redraw warnings --------------------------------------------------
  useEffect(() => {
    const map = mapRef.current
    const layer = layerRef.current
    if (!map || !layer) return
    layer.clearLayers()

    if (centre?.lat) {
      L.circleMarker([centre.lat, centre.lon], {
        radius: 6,
        color: cssColour('--c-accent', 0.9),
        fillColor: cssColour('--c-accent', 0.9),
        fillOpacity: 1,
        weight: 2,
      })
        .bindTooltip(centre.name || 'Selected location', { direction: 'top' })
        .addTo(layer)
    }

    for (const w of warnings) {
      const colour = cssColour(SEV_VAR[w.colour] || SEV_VAR.yellow, 1)
      const isSelected = selected === w.identifier
      const style = {
        color: colour,
        fillColor: colour,
        fillOpacity: isSelected ? 0.3 : 0.16,
        weight: isSelected ? 2.5 : 1.5,
      }

      const label =
        `<strong>${escapeHtml(w.event || 'Weather warning')}</strong><br>` +
        `${escapeHtml(SEVERITY[w.colour]?.label || '')} · ${escapeHtml(w.sender || '')}` +
        (w.area?.description ? `<br>${escapeHtml(w.area.description)}` : '')

      let shape
      if (w.area?.geometry?.coordinates) {
        // GeoJSON is [lon, lat]; Leaflet wants [lat, lon].
        shape = L.geoJSON(
          { type: 'Feature', geometry: w.area.geometry, properties: {} },
          { style },
        )
      } else if (Number.isFinite(w.lat) && Number.isFinite(w.lon)) {
        // No polygon: a dashed circle at the district centroid, so the map
        // never implies precision the source did not provide.
        shape = L.circle([w.lat, w.lon], {
          ...style,
          radius: DISTRICT_RADIUS_M,
          dashArray: '5 6',
        })
      }

      if (!shape) continue
      shape.bindTooltip(label, { direction: 'top', sticky: true })
      shape.on('click', () => onSelect?.(w.identifier))
      shape.addTo(layer)
    }
  }, [warnings, selected, centre?.lat, centre?.lon, onSelect])

  return (
    <div className="relative">
      <div
        ref={hostRef}
        className={className}
        role="application"
        aria-label="Map of active weather warnings"
      />
      {tilesBlocked && (
        <p className="pointer-events-none absolute inset-x-0 bottom-0 bg-ground/85 px-4 py-2 text-center font-mono text-[9.5px] uppercase tracking-[0.12em] text-ink-3 backdrop-blur-sm">
          {tiles ? 'Basemap unavailable offline' : 'Basemap off to save data'} — warning areas shown to scale
        </p>
      )}
    </div>
  )
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ))
}
