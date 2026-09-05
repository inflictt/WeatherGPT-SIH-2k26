import { Location } from '../models/Location.js'
import { env } from '../config/env.js'
import { getJson, sleep } from '../utils/http.js'
import { log } from '../utils/logger.js'

/**
 * Location resolution, gazetteer first.
 *
 * A live geocoder will not find "Bhinder" reliably, and it rate limits us at
 * one request per second. Our own seeded table will, and it costs nothing.
 * Nominatim is only the fallback for places we have not seeded.
 */

/** Lowercase, strip accents and punctuation — the matching key. */
export function slugify(s) {
  return String(s)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9ऀ-ॿ]+/g, ' ')
    .trim()
}

/** Cheap edit distance, capped — good enough for one-word place names. */
function distance(a, b) {
  if (a === b) return 0
  if (Math.abs(a.length - b.length) > 3) return 99
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i += 1) {
    let last = prev[0]
    prev[0] = i
    for (let j = 1; j <= b.length; j += 1) {
      const tmp = prev[j]
      prev[j] = Math.min(
        prev[j] + 1,
        prev[j - 1] + 1,
        last + (a[i - 1] === b[j - 1] ? 0 : 1),
      )
      last = tmp
    }
  }
  return prev[b.length]
}

const KIND_WEIGHT = { city: 3, district: 3, town: 2, village: 1, state: 2 }

/**
 * Search the gazetteer. Exact slug beats prefix beats fuzzy; larger places
 * win ties, because "Jaipur" almost always means the city.
 */
export async function searchGazetteer(query, { limit = 8, state } = {}) {
  const slug = slugify(query)
  if (!slug || slug.length < 2) return []

  const filter = { $or: [{ slug }, { slug: { $regex: `^${escapeRe(slug)}` } }, { aliases: slug }] }
  if (state) filter.state = { $regex: `^${escapeRe(state)}$`, $options: 'i' }

  let rows = await Location.find(filter).limit(60).lean()

  // Nothing matched a prefix — widen to a contains search before giving up.
  if (rows.length === 0) {
    rows = await Location.find({ slug: { $regex: escapeRe(slug.slice(0, 4)) } })
      .limit(120)
      .lean()
  }

  return rows
    .map((r) => {
      const d = Math.min(distance(slug, r.slug), ...(r.aliases || []).map((a) => distance(slug, a)))
      const exact = r.slug === slug || (r.aliases || []).includes(slug)
      const prefix = r.slug.startsWith(slug)
      const score =
        (exact ? 1000 : 0) + (prefix ? 200 : 0) - d * 25 + (KIND_WEIGHT[r.kind] || 0) * 10 +
        Math.min(20, Math.log10((r.population || 1) + 1) * 4)
      return { ...r, score, distance: d }
    })
    .filter((r) => r.distance <= 3 || r.slug.startsWith(slug))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

let lastNominatim = 0

/** Nominatim: free, no key, but strictly one request per second and a real UA. */
export async function geocodeOpenMeteo(query) {
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=6&language=en&format=json`
    const res = await fetch(url)
    if (!res.ok) return []
    const data = await res.json()
    return (data.results || [])
      .filter((r) => !r.country_code || r.country_code === 'IN' || r.country === 'India')
      .map((r) => ({
        name: r.name,
        slug: slugify(r.name || ''),
        kind: r.admin3 ? 'village' : r.admin2 ? 'town' : 'city',
        district: r.admin2 || r.admin1 || r.name,
        state: r.admin1 || 'India',
        lat: Number(r.latitude),
        lon: Number(r.longitude),
        source: 'open-meteo-geocoding',
      }))
  } catch (err) {
    log.warn('open-meteo geocode failed', { error: String(err.message || err) })
    return []
  }
}

export async function geocodeNominatim(query) {
  const wait = 1100 - (Date.now() - lastNominatim)
  if (wait > 0) await sleep(wait)
  lastNominatim = Date.now()

  const url = `${env.nominatimBase}/search?${new URLSearchParams({
    q: query,
    format: 'jsonv2',
    countrycodes: 'in',
    addressdetails: '1',
    limit: '5',
  })}`

  try {
    const rows = await getJson(url, { retries: 0, headers: { 'Accept-Language': 'en' } })
    return (rows || []).map((r) => ({
      name: r.name || r.display_name?.split(',')[0],
      slug: slugify(r.name || ''),
      kind: mapKind(r.type, r.addresstype),
      district: r.address?.state_district || r.address?.county,
      state: r.address?.state,
      lat: Number(r.lat),
      lon: Number(r.lon),
      source: 'nominatim',
    }))
  } catch (err) {
    log.warn('nominatim lookup failed', { error: String(err.message || err) })
    return []
  }
}

export async function reverseGeocodeNominatim(lat, lon) {
  const wait = 1100 - (Date.now() - lastNominatim)
  if (wait > 0) await sleep(wait)
  lastNominatim = Date.now()

  const url = `${env.nominatimBase}/reverse?${new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
    format: 'jsonv2',
    addressdetails: '1',
  })}`

  try {
    const r = await getJson(url, { retries: 0, headers: { 'Accept-Language': 'en' } })
    if (!r || !r.address) return null
    const name =
      r.address.village ||
      r.address.suburb ||
      r.address.town ||
      r.address.city ||
      r.address.city_district ||
      r.address.county ||
      r.name ||
      r.display_name?.split(',')[0] ||
      'Current Location'
    const district = r.address.state_district || r.address.county || r.address.district || r.address.city
    const state = r.address.state
    return {
      name,
      district,
      state,
      lat: Number(lat),
      lon: Number(lon),
      kind: mapKind(r.type, r.addresstype),
      source: 'nominatim-reverse',
    }
  } catch (err) {
    log.warn('nominatim reverse lookup failed', { error: String(err.message || err) })
    return null
  }
}

function mapKind(type, addresstype) {
  const t = String(addresstype || type || '').toLowerCase()
  if (t.includes('state')) return 'state'
  if (t.includes('district') || t.includes('county')) return 'district'
  if (t === 'city' || t === 'municipality') return 'city'
  if (t === 'town') return 'town'
  return 'village'
}

/** Nearest seeded place to a coordinate — used for GPS and reverse lookup. */
export async function nearestLocation(lat, lon, maxMeters = 60000) {
  const [row] = await Location.find({
    point: {
      $near: {
        $geometry: { type: 'Point', coordinates: [lon, lat] },
        $maxDistance: maxMeters,
      },
    },
  })
    .limit(1)
    .lean()
  return row || null
}

/**
 * One entry point for the rest of the app: a name, or a coordinate, becomes a
 * resolved place with a district (which the warning matcher needs).
 */
export async function resolveLocation({ q, lat, lon, state, district, name }) {
  if (Number.isFinite(lat) && Number.isFinite(lon)) {
    const near = await nearestLocation(lat, lon)
    return {
      name: name || near?.name || 'Selected location',
      district: district || near?.district,
      state: state || near?.state,
      lat,
      lon,
      kind: near?.kind || 'village',
      zone: near?.zone || 'plains',
      urbanFloodProne: near?.urbanFloodProne || false,
      source: name ? 'client-provided' : (near ? 'gazetteer-nearest' : 'coordinates'),
    }
  }

  if (!q) return null

  const [best] = await searchGazetteer(q, { limit: 1, state })
  if (best) {
    return {
      id: best._id,
      name: best.name,
      district: best.district,
      state: best.state,
      lat: best.lat,
      lon: best.lon,
      kind: best.kind,
      zone: best.zone || 'plains',
      urbanFloodProne: best.urbanFloodProne || false,
      source: 'gazetteer',
    }
  }

  const [geo] = await geocodeNominatim(q)
  return geo ? { ...geo, zone: 'plains', urbanFloodProne: false } : null
}

const escapeRe = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
