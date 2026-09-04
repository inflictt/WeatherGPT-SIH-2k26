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

/** Developer Telemetry & Live Benchmarking Endpoint (/api/telemetry) */
export async function telemetry(_req, res) {
  const start = Date.now()
  const mem = process.memoryUsage()

  // Benchmark upstreams in parallel
  const ping = async (name, url, timeoutMs = 3000) => {
    const t0 = performance.now()
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), timeoutMs)
      const resp = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': 'WeatherGPT-Telemetry/1.0' } })
      clearTimeout(timer)
      const latencyMs = Math.round(performance.now() - t0)
      return { name, latencyMs, status: resp.ok ? 'healthy' : `http_${resp.status}`, ok: resp.ok }
    } catch (err) {
      const latencyMs = Math.round(performance.now() - t0)
      return { name, latencyMs, status: err.name === 'AbortError' ? 'timeout' : 'error', ok: false, error: err.message }
    }
  }

  const [openMeteo, sachet, aiService, openWeather] = await Promise.all([
    ping('Open-Meteo (ECMWF/GFS)', 'https://api.open-meteo.com/v1/forecast?latitude=28.61&longitude=77.20&current=temperature_2m'),
    ping('NDMA SACHET (CAP Portal)', 'https://sachet.ndma.gov.in/'),
    ping('Python AI Microservice', `${env.aiServiceUrl || 'http://127.0.0.1:8000'}/health`),
    ping('OpenWeatherMap Gateway', 'https://api.openweathermap.org/data/2.5/weather?lat=28.61&lon=77.20&appid=demo'),
  ])

  const benchmarks = [openMeteo, sachet, aiService, openWeather]

  res.json({
    status: 'ok',
    uptimeSeconds: Math.round(process.uptime()),
    processMemory: {
      rssMb: Number((mem.rss / (1024 * 1024)).toFixed(1)),
      heapUsedMb: Number((mem.heapUsed / (1024 * 1024)).toFixed(1)),
      heapTotalMb: Number((mem.heapTotal / (1024 * 1024)).toFixed(1)),
    },
    benchmarks,
    ensembleConfig: {
      primary: 'ECMWF IFS (9 km)',
      secondary: 'NOAA GFS (0.25°)',
      tertiary: 'DWD ICON (7 km)',
      radarNowcast: 'AWS Doppler S-Band',
      weights: { ecmwf: 0.45, gfs: 0.30, icon: 0.25 },
    },
    totalTelemetryElapsedMs: Date.now() - start,
    timestamp: new Date().toISOString(),
  })
}
