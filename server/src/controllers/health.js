import mongoose from 'mongoose'
import { Warning } from '../models/Warning.js'
import { Location } from '../models/Location.js'
import { aiHealth } from '../services/aiClient.js'
import { env } from '../config/env.js'
import { pushEnabled } from '../services/push.js'

/** What the Settings screen renders. No auth: it is diagnostics, not data. */
export async function health(_req, res) {
  const now = new Date()
  const [locations, activeWarnings, latest, ai] = await Promise.all([
    Location.estimatedDocumentCount().catch(() => null),
    Warning.countDocuments({ status: 'active', $or: [{ expires: { $gt: now } }, { expires: null }] }).catch(() => null),
    Warning.findOne({}).sort({ ingestedAt: -1 }).select('ingestedAt identifier').lean().catch(() => null),
    aiHealth(),
  ])

  const mongoUp = mongoose.connection.readyState === 1
  const warningsFresh = latest ? now - new Date(latest.ingestedAt) < 30 * 60_000 : false

  const sources = [
    { name: 'MongoDB', role: 'database', status: mongoUp ? 'ok' : 'down' },
    {
      name: 'NDMA Sachet (CAP)',
      role: 'official warnings',
      status: !latest ? 'unknown' : warningsFresh ? 'ok' : 'degraded',
      lastIngestAt: latest?.ingestedAt ?? null,
      activeCount: activeWarnings,
    },
    { name: 'Open-Meteo', role: 'forecast', status: 'ok', models: env.ensembleModels },
    { name: 'Gazetteer', role: 'location resolution', status: locations ? 'ok' : 'unseeded', count: locations },
    { name: 'Risk engine (Python)', role: 'risk + uncertainty', status: ai.status, url: env.aiServiceUrl },
    {
      name: 'Push notifications',
      role: 'severe weather alerts',
      // 'unknown' rather than 'down': absent VAPID keys are a configuration
      // choice, not a fault, and flagging them red would cry wolf.
      status: pushEnabled() ? 'ok' : 'unknown',
      detail: pushEnabled() ? null : 'VAPID keys not configured',
    },
  ]

  const worst = sources.some((s) => s.status === 'down')
    ? 'degraded'
    : sources.some((s) => s.status === 'degraded' || s.status === 'unseeded')
      ? 'partial'
      : 'ok'

  res.status(mongoUp ? 200 : 503).json({
    status: worst,
    uptimeSeconds: Math.round(process.uptime()),
    env: env.nodeEnv,
    sources,
    checkedAt: now.toISOString(),
  })
}
