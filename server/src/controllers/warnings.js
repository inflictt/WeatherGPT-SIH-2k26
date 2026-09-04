import { z } from 'zod'
import { Warning } from '../models/Warning.js'
import { warningsForPoint, highest, ingestWarnings } from '../services/capIngest.js'
import { locationFromQuery } from './weather.js'

export const activeSchema = z
  .object({
    lat: z.coerce.number().min(-90).max(90).optional(),
    lon: z.coerce.number().min(-180).max(180).optional(),
    q: z.string().trim().min(2).max(80).optional(),
    district: z.string().trim().max(60).optional(),
    state: z.string().trim().max(60).optional(),
  })
  .refine((v) => v.q || v.district || v.state || (v.lat != null && v.lon != null), {
    message: 'Provide a location: q, district, state, or lat and lon',
  })

/** Never trust the stored flag alone — check the clock on read too (§7). */
function live(w, now = new Date()) {
  return w.status === 'active' && (!w.expires || new Date(w.expires) > now)
}

export async function active(req, res) {
  const q = req.validQuery
  let loc = null
  if (q.q || (q.lat != null && q.lon != null)) loc = await locationFromQuery(q)

  const warnings = await warningsForPoint({
    lat: loc?.lat ?? q.lat,
    lon: loc?.lon ?? q.lon,
    district: q.district || loc?.district,
    state: q.state || loc?.state,
  })

  const now = new Date()
  const filtered = warnings.filter((w) => live(w, now))
  res.json({
    location: loc,
    count: filtered.length,
    highest: highest(filtered),
    warnings: filtered,
    checkedAt: now.toISOString(),
  })
}

export async function recent(req, res) {
  const rows = await Warning.find({}).sort({ sent: -1 }).limit(50).lean()
  const now = new Date()
  res.json({
    warnings: rows.map((w) => ({ ...w, live: live(w, now) })),
  })
}

export async function byId(req, res) {
  const w = await Warning.findOne({ identifier: req.params.identifier }).lean()
  if (!w) return res.status(404).json({ error: 'Warning not found' })
  res.json({ warning: { ...w, live: live(w) } })
}

/** Manual trigger, handy in a demo when you do not want to wait for the cron. */
export async function refresh(_req, res) {
  const result = await ingestWarnings()
  res.json(result)
}
