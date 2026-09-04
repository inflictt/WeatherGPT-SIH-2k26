/**
 * Pure CAP helpers — no dependencies, so they can be unit tested anywhere.
 * Imported by capParser.js.
 */

/** CAP severity → IMD colour code. This mapping is the UI's contract. */
export function severityToColour(severity, event = '') {
  const s = String(severity || '').toLowerCase()
  if (s === 'extreme') return 'red'
  if (s === 'severe') return 'orange'
  if (s === 'moderate') return 'yellow'
  if (s === 'minor') return 'yellow'
  // Some bulletins carry the colour in the event text instead.
  const e = String(event).toLowerCase()
  if (e.includes('red')) return 'red'
  if (e.includes('orange')) return 'orange'
  if (e.includes('yellow')) return 'yellow'
  return 'green'
}

/** CAP `polygon` is "lat,lon lat,lon …"; GeoJSON wants [lon,lat] and closure. */
export function polygonToGeoJson(polygonStr) {
  if (!polygonStr) return null
  const ring = String(polygonStr)
    .trim()
    .split(/\s+/)
    .map((pair) => {
      const [lat, lon] = pair.split(',').map(Number)
      return Number.isFinite(lat) && Number.isFinite(lon) ? [lon, lat] : null
    })
    .filter(Boolean)

  if (ring.length < 3) return null
  const first = ring[0]
  const last = ring[ring.length - 1]
  if (first[0] !== last[0] || first[1] !== last[1]) ring.push(first)
  return { type: 'Polygon', coordinates: [ring] }
}

/** CAP `circle` is "lat,lon radiusKm". Approximated as a 24-sided polygon. */
export function circleToGeoJson(circleStr) {
  if (!circleStr) return null
  const [centre, radiusKm] = String(circleStr).trim().split(/\s+/)
  const [lat, lon] = String(centre).split(',').map(Number)
  const r = Number(radiusKm)
  if (![lat, lon, r].every(Number.isFinite)) return null

  const ring = []
  const dLat = r / 110.574
  const dLon = r / (111.32 * Math.cos((lat * Math.PI) / 180) || 1)
  for (let i = 0; i <= 24; i += 1) {
    const a = (i / 24) * 2 * Math.PI
    ring.push([lon + dLon * Math.cos(a), lat + dLat * Math.sin(a)])
  }
  return { type: 'Polygon', coordinates: [ring] }
}

/** Split a CAP areaDesc string into candidate district names. */
export function districtsFromAreaDesc(desc) {
  if (!desc) return []
  return String(desc)
    .split(/[,;/]| and /i)
    .map((p) => p.replace(/\b(district|districts|dist\.?)\b/gi, '').trim())
    .filter((p) => p.length > 2 && p.length < 60)
}

/** Standard ray-casting algorithm to test if [lon, lat] is inside a polygon ring. */
export function pointInPolygon(lon, lat, ring) {
  if (!ring || ring.length < 3) return false
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0]
    const yi = ring[i][1]
    const xj = ring[j][0]
    const yj = ring[j][1]
    const intersect = ((yi > lat) !== (yj > lat)) && (lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi)
    if (intersect) inside = !inside
  }
  return inside
}
