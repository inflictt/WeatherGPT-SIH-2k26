import { XMLParser } from 'fast-xml-parser'
import {
  severityToColour,
  polygonToGeoJson,
  circleToGeoJson,
  districtsFromAreaDesc,
} from './capGeo.js'

/**
 * CAP 1.2 → our Warning shape.
 *
 * The parser accepts three things, because feeds in the wild are inconsistent:
 *   • a bare <alert> document
 *   • an RSS/Atom feed whose items link to CAP documents
 *   • a feed with <alert> elements embedded directly
 *
 * Nothing here rewrites official text. `headline`, `description` and
 * `instruction` are copied through untouched — §7 of the PRD depends on it.
 */

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  removeNSPrefix: true, // cap:alert, atom:link … all collapse to local names
  trimValues: true,
  parseTagValue: false, // keep everything as strings; we cast deliberately
})

const arr = (v) => (v == null ? [] : Array.isArray(v) ? v : [v])
const text = (v) => (v == null ? undefined : typeof v === 'object' ? v['#text'] : String(v))

/**
 * NDMA Sachet does not inline `<cap:polygon>`. It publishes a `<cap:parameter>`
 * whose valueName is "Polygon URL", pointing at a separate document.
 *
 * That document currently answers 403 to anything outside the portal, so
 * geometry is usually unavailable and district-name matching carries the
 * geo-match. Storing the URL anyway means the day it opens up, the map gains
 * real polygons without a re-ingest.
 */
function extractPolygonUrl(info) {
  for (const p of arr(info.parameter)) {
    const name = String(text(p.valueName) || '').toLowerCase()
    if (name.includes('polygon')) {
      const value = text(p.value)
      if (value && /^https?:\/\//i.test(value)) return value
    }
  }
  return undefined
}

/** Pull district names out of CAP `areaDesc` and any geocode parameters. */
function extractAreas(areas) {
  const descriptions = []
  const districts = new Set()
  let state
  let geometry = null

  for (const a of areas) {
    const desc = text(a.areaDesc)
    if (desc) {
      descriptions.push(desc)
      districtsFromAreaDesc(desc).forEach((p) => districts.add(p))
    }

    for (const g of arr(a.geocode)) {
      const name = String(text(g.valueName) || '').toLowerCase()
      const value = text(g.value)
      if (!value) continue
      if (name.includes('district')) districts.add(value)
      if (name.includes('state')) state = value
    }

    if (!geometry) geometry = polygonToGeoJson(text(a.polygon)) || circleToGeoJson(text(a.circle))
  }

  return {
    description: descriptions.join('; ') || undefined,
    state,
    districts: [...districts],
    geometry,
  }
}

const asDate = (v) => {
  const d = v ? new Date(v) : null
  return d && !Number.isNaN(d.getTime()) ? d : undefined
}

/** Normalise one CAP <alert> object (already XML-parsed) into a Warning doc. */
export function normaliseAlert(alert, { sourceUrl, raw } = {}) {
  if (!alert) return null

  // An alert can carry several <info> blocks (one per language). Prefer
  // English, then Hindi, then whatever came first.
  const infos = arr(alert.info)
  const info =
    infos.find((i) => /^en/i.test(String(text(i.language) || 'en'))) ||
    infos.find((i) => /^hi/i.test(String(text(i.language) || ''))) ||
    infos[0]

  if (!info) return null

  const identifier = text(alert.identifier)
  if (!identifier) return null

  const event = text(info.event)
  const severity = text(info.severity) || 'Unknown'
  const area = extractAreas(arr(info.area))

  const msgType = String(text(alert.msgType) || '').toLowerCase()
  const capStatus = String(text(info.responseType) || '').toLowerCase()

  return {
    identifier,
    sender: text(alert.sender),
    senderName: text(info.senderName) || text(alert.sender),
    event,
    severity: ['Minor', 'Moderate', 'Severe', 'Extreme', 'Unknown'].includes(severity)
      ? severity
      : 'Unknown',
    urgency: text(info.urgency),
    certainty: text(info.certainty),
    colour: severityToColour(severity, event),
    area: {
      description: area.description,
      state: area.state,
      districts: area.districts,
      ...(area.geometry ? { geometry: area.geometry } : {}),
    },
    sent: asDate(text(alert.sent)),
    effective: asDate(text(info.effective)) || asDate(text(alert.sent)),
    expires: asDate(text(info.expires)),
    // --- verbatim ---
    headline: text(info.headline),
    description: text(info.description),
    instruction: text(info.instruction),
    polygonUrl: extractPolygonUrl(info),
    sourceUrl: sourceUrl || text(info.web),
    raw,
    status: msgType === 'cancel' || capStatus === 'allclear' ? 'cancelled' : 'active',
    ingestedAt: new Date(),
  }
}

/**
 * Parse any XML payload and return every alert it contains, plus any links
 * to CAP documents that still need fetching.
 * @returns {{ alerts: object[], links: string[] }}
 */
export function parseFeed(xml, { sourceUrl } = {}) {
  let doc
  try {
    doc = parser.parse(xml)
  } catch {
    return { alerts: [], links: [] }
  }

  const alerts = []
  const links = new Set()

  // 1 — a bare CAP document
  if (doc.alert) {
    for (const a of arr(doc.alert)) {
      const n = normaliseAlert(a, { sourceUrl, raw: xml })
      if (n) alerts.push(n)
    }
  }

  // 2 — RSS
  const items = arr(doc.rss?.channel?.item)
  for (const item of items) {
    if (item.alert) {
      for (const a of arr(item.alert)) {
        const n = normaliseAlert(a, { sourceUrl: text(item.link) || sourceUrl })
        if (n) alerts.push(n)
      }
      continue
    }
    const link = text(item.link) || text(item.guid)
    if (link && /\.xml|cap/i.test(link)) links.add(link)
  }

  // 3 — Atom
  for (const entry of arr(doc.feed?.entry)) {
    if (entry.alert) {
      for (const a of arr(entry.alert)) {
        const n = normaliseAlert(a, { sourceUrl })
        if (n) alerts.push(n)
      }
      continue
    }
    for (const l of arr(entry.link)) {
      const href = l?.['@_href']
      if (href && /\.xml|cap/i.test(href)) links.add(href)
    }
  }

  return { alerts, links: [...links] }
}

export { severityToColour, polygonToGeoJson, circleToGeoJson }
