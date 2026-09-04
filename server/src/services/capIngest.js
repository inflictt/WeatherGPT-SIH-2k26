import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { env } from '../config/env.js'
import { getText } from '../utils/http.js'
import { parseFeed } from './capParser.js'
import { Warning } from '../models/Warning.js'
import { log } from '../utils/logger.js'

const here = path.dirname(fileURLToPath(import.meta.url))
const SAMPLE = path.resolve(here, '../../data/sample-alerts.xml')

/**
 * Follow at most this many CAP document links from an index feed per run.
 *
 * The live all-India index carries roughly 99 items, so this is a real ceiling
 * rather than a theoretical one. It is a deliberate trade: one run costs up to
 * this many small HTTP requests against a government host, and the cron repeats
 * every five minutes. Raising it materially means adding concurrency limits.
 */
const MAX_LINKS = 100

/**
 * Fetch the feed, follow any CAP links it lists, and upsert everything found.
 * Idempotent: `identifier` is unique, so re-running never duplicates a warning.
 */
export async function ingestWarnings({ source } = {}) {
  const started = Date.now()
  const url = source || env.capFeedUrl
  let xml
  let usedFallback = false

  if (env.capFeedEnabled) {
    try {
      xml = await getText(url, { timeoutMs: 20000, retries: 1 })
    } catch (err) {
      log.warn('CAP feed unreachable', { url, error: String(err.message || err) })
    }
  }

  if (!xml) {
    if (!env.capFallbackToSamples) {
      return { ok: false, reason: 'feed_unreachable', fetched: 0, upserted: 0 }
    }
    xml = await fs.readFile(SAMPLE, 'utf8')
    usedFallback = true
    log.warn('using bundled sample alerts — live feed unavailable')
  }

  const { alerts, links } = parseFeed(xml, { sourceUrl: url })
  const collected = [...alerts]

  // An index feed lists CAP documents rather than embedding them. Sachet's
  // always does, so this is the normal path and not a fallback — the earlier
  // `collected.length === 0` guard meant a feed carrying even one inline alert
  // would cause the other ninety-eight links to be skipped.
  if (!usedFallback && links.length > 0) {
    for (const link of links.slice(0, MAX_LINKS)) {
      try {
        const doc = await getText(link, { timeoutMs: 15000, retries: 0 })
        collected.push(...parseFeed(doc, { sourceUrl: link }).alerts)
      } catch {
        // one bad document must not stop the run
      }
    }
  }

  let upserted = 0
  for (const a of collected) {
    try {
      await Warning.findOneAndUpdate({ identifier: a.identifier }, a, { upsert: true, new: true })
      upserted += 1
    } catch (err) {
      log.error('warning upsert failed', { identifier: a.identifier, error: String(err.message || err) })
    }
  }

  const result = {
    ok: true,
    source: usedFallback ? 'sample' : url,
    usedFallback,
    followedLinks: usedFallback ? 0 : Math.min(links.length, MAX_LINKS),
    fetched: collected.length,
    upserted,
    ms: Date.now() - started,
  }
  log.info('warning ingest complete', result)
  return result
}

/**
 * Flip anything past its validity window. §7: an expired warning must never
 * be presented as active, so this runs on a schedule AND every read filters
 * on `expires` as well.
 */
export async function expireWarnings(now = new Date()) {
  const res = await Warning.updateMany(
    { status: 'active', expires: { $lt: now } },
    { $set: { status: 'expired' } },
  )
  if (res.modifiedCount) log.info('warnings expired', { count: res.modifiedCount })
  return { expired: res.modifiedCount }
}

/**
 * Active warnings covering a point. Matches on geometry where the alert had
 * one, and falls back to the district name where it did not — the majority of
 * Indian bulletins are district-named rather than polygonal.
 */
export async function warningsForPoint({ lat, lon, district, state }, now = new Date()) {
  const live = { status: 'active', $or: [{ expires: { $gt: now } }, { expires: null }] }

  const clauses = []
  if (Number.isFinite(lat) && Number.isFinite(lon)) {
    clauses.push({
      'area.geometry': { $geoIntersects: { $geometry: { type: 'Point', coordinates: [lon, lat] } } },
    })
  }
  if (district) {
    clauses.push({ 'area.districts': { $regex: `^${escapeRe(district)}$`, $options: 'i' } })
  }
  if (state && !district) {
    clauses.push({ 'area.state': { $regex: `^${escapeRe(state)}$`, $options: 'i' } })
  }
  if (clauses.length === 0) return []

  const found = await Warning.find({ ...live, $or: clauses })
    .sort({ severity: -1, sent: -1 })
    .limit(20)
    .lean()

  return found.sort((a, b) => rank(b.severity) - rank(a.severity) || new Date(b.sent) - new Date(a.sent))
}

const ORDER = { Extreme: 4, Severe: 3, Moderate: 2, Minor: 1, Unknown: 0 }
const rank = (s) => ORDER[s] ?? 0
const escapeRe = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** The most severe active warning, or null. Drives the banner. */
export function highest(warnings) {
  if (!warnings?.length) return null
  return warnings.reduce((best, w) => (rank(w.severity) > rank(best.severity) ? w : best), warnings[0])
}
