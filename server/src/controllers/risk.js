import {
  fetchForecast, fetchEnsemble, totalsFor24h, antecedentRainfall, describeCode, deriveCurrentCondition,
} from '../services/openMeteo.js'
import { fetchCurrentOpenWeather } from '../services/openWeather.js'
import { warningsForPoint, highest } from '../services/capIngest.js'
import { scoreRisk, scoreUncertainty, composeAnswer } from '../services/aiClient.js'
import { locationFromQuery } from './weather.js'

/**
 * The Phase 2 ↔ Phase 3 bridge, and the endpoint the Today screen calls.
 *
 * Fetches forecast, ensemble, live OpenWeather and warnings in parallel, hands them to the
 * Python engines, and returns one object. If the engine is unreachable the
 * response still carries forecast and warnings, flagged `degraded: true` —
 * the client renders exactly the same cards minus the score.
 */
export async function assess(req, res) {
  const loc = await locationFromQuery(req.validQuery)

  const [forecast, ensemble, warnings, liveObs] = await Promise.all([
    fetchForecast(loc.lat, loc.lon, { days: 7 }),
    fetchEnsemble(loc.lat, loc.lon, { days: 3 }).catch(() => null),
    warningsForPoint({ lat: loc.lat, lon: loc.lon, district: loc.district, state: loc.state }),
    fetchCurrentOpenWeather(loc.lat, loc.lon).catch(() => null),
  ])


  const now = new Date()
  const live = warnings.filter((w) => w.status === 'active' && (!w.expires || new Date(w.expires) > now))
  const top = highest(live)

  const next24 = window24h(forecast.hourly, now)
  const today = forecast.daily?.[0] || {}

  const riskPayload = {
    location: {
      name: loc.name, district: loc.district, state: loc.state,
      lat: loc.lat, lon: loc.lon,
      zone: loc.zone || 'plains',
      urban_flood_prone: Boolean(loc.urbanFloodProne),
    },
    forecast: {
      rain_24h_mm: round1(next24.rainMm),
      rain_probability: today.precipProbMax != null ? today.precipProbMax / 100 : null,
      wind_kmh: round1(next24.maxWindKmh),
      gust_kmh: round1(next24.maxGustKmh),
      temp_max_c: today.tempMaxC ?? null,
      temp_min_c: today.tempMinC ?? null,
      visibility_km: next24.minVisibilityKm,
      rain_duration_hours: next24.wetHours,
      peak_window: next24.peakWindow,
    },
    antecedent: { rain_72h_mm: antecedentRainfall(forecast, 72) },
    warnings: live.map((w) => ({
      identifier: w.identifier, event: w.event, severity: w.severity,
      colour: w.colour, expires: w.expires,
    })),
  }

  const models = ensemble ? totalsFor24h(ensemble, now.toISOString()) : []
  const uncertaintyPayload = {
    models: models.map((m) => ({ name: m.model, rain_24h_mm: m.mm })),
    lead_hours: next24.leadHours,
    probability: riskPayload.forecast.rain_probability,
  }

  const [risk, confidence] = await Promise.all([
    scoreRisk(riskPayload),
    models.length >= 2 ? scoreUncertainty(uncertaintyPayload) : Promise.resolve(null),
  ])

  const sources = [
    ...(liveObs ? [{ name: 'OpenWeatherMap', role: 'live observation', fetchedAt: liveObs.fetchedAt, cached: liveObs.cached }] : []),
    { name: 'Open-Meteo', role: 'multi-model forecast', fetchedAt: forecast.fetchedAt, cached: forecast.cached },
    { name: 'NDMA Sachet (CAP)', role: 'warnings', count: live.length },
    ...(risk ? [{ name: 'WeatherGPT risk engine', role: 'risk', version: risk.engine_version }] : []),
  ]

  // The Today screen's advice comes from the same composer the Ask screen uses,
  // so "what to do" is conditioned on the real numbers and the chosen persona
  // rather than being a fixed list. Without this the persona switch is a lie:
  // it changes the highlighted chip and nothing else.
  const answer = await composeAnswer({
    question: '',
    intent: 'general',
    language: req.validQuery.lang || req.user?.language || 'en',
    persona: req.validQuery.persona || req.user?.persona || 'general',
    location: { name: loc.name, district: loc.district, state: loc.state },
    window: { day_offset: 0, from_hour: null, to_hour: null, label: 'today' },
    forecast: {
      rain_mm: riskPayload.forecast.rain_24h_mm,
      prob: riskPayload.forecast.rain_probability,
      peak: next24.peakWindow ? `${hhmm(next24.peakWindow.from)}-${hhmm(next24.peakWindow.to)}` : null,
      wind_kmh: riskPayload.forecast.wind_kmh,
      gust_kmh: riskPayload.forecast.gust_kmh,
      tmax: riskPayload.forecast.temp_max_c,
      tmin: riskPayload.forecast.temp_min_c,
    },
    warnings: live.map((w) => ({
      identifier: w.identifier, event: w.event, severity: w.severity, colour: w.colour,
      headline: w.headline, description: w.description, instruction: w.instruction,
      senderName: w.senderName || w.sender, expires: w.expires,
    })),
    risk,
    confidence,
    sources,
  })

  // Blend live observation with forecast
  const currentObs = liveObs ? {
    time: liveObs.time,
    tempC: liveObs.tempC ?? forecast.current.tempC,
    feelsLikeC: liveObs.feelsLikeC ?? forecast.current.feelsLikeC,
    humidity: liveObs.humidity ?? forecast.current.humidity,
    pressureHpa: liveObs.pressureHpa ?? forecast.current.pressureHpa,
    precipMm: liveObs.precipMm ?? forecast.current.precipMm,
    cloudCover: liveObs.cloudCover ?? forecast.current.cloudCover,
    visibilityM: liveObs.visibilityM ?? forecast.current.visibilityM,
    windKmh: liveObs.windKmh ?? forecast.current.windKmh,
    windDirDeg: liveObs.windDirDeg ?? forecast.current.windDirDeg,
    gustKmh: liveObs.gustKmh ?? forecast.current.gustKmh,
    weatherCode: liveObs.weatherCode ?? forecast.current.weatherCode,
    condition: liveObs.condition || deriveCurrentCondition(forecast.current, forecast.hourly, riskPayload.forecast),
    sunrise: liveObs.sunrise ?? forecast.daily?.[0]?.sunrise,
    sunset: liveObs.sunset ?? forecast.daily?.[0]?.sunset,
  } : {
    ...forecast.current,
    condition: deriveCurrentCondition(forecast.current, forecast.hourly, riskPayload.forecast),
  }

  res.json({
    location: loc,
    current: currentObs,
    summary24h: riskPayload.forecast,
    antecedent72hMm: riskPayload.antecedent.rain_72h_mm,
    warnings: live,
    highestWarning: top,
    risk,
    confidence,
    models,
    answer,
    degraded: !risk,
    sources,
    checkedAt: now.toISOString(),
  })
}


/** 'HH:MM' in the forecast's own timezone — the label, not a computation. */
const hhmm = (iso) => (iso ? new Date(iso).toTimeString().slice(0, 5) : null)

const round1 = (n) => (n == null ? null : Number(Number(n).toFixed(1)))

/** Aggregate the next 24 hours into the handful of figures the engine needs. */
function window24h(hourly, now) {
  const start = now.getTime()
  const end = start + 24 * 3600e3
  const rows = (hourly || []).filter((h) => {
    const t = new Date(h.time).getTime()
    return t >= start && t < end
  })

  const rainMm = rows.reduce((s, h) => s + (h.precipMm || 0), 0)
  const wetHours = rows.filter((h) => (h.precipMm || 0) >= 0.5).length
  const maxWindKmh = Math.max(0, ...rows.map((h) => h.windKmh || 0))
  const maxGustKmh = Math.max(0, ...rows.map((h) => h.gustKmh || 0))
  const vis = rows.map((h) => h.visibilityM).filter((v) => v != null)
  const minVisibilityKm = vis.length ? Number((Math.min(...vis) / 1000).toFixed(1)) : null

  // The heaviest contiguous stretch — this is what "expected 17:00–20:00" means.
  let peakWindow = null
  if (rows.length) {
    let bestSum = -1
    let bestIdx = 0
    for (let i = 0; i + 3 <= rows.length; i += 1) {
      const sum = rows.slice(i, i + 3).reduce((s, h) => s + (h.precipMm || 0), 0)
      if (sum > bestSum) { bestSum = sum; bestIdx = i }
    }
    if (bestSum > 1) {
      peakWindow = { from: rows[bestIdx].time, to: rows[Math.min(bestIdx + 3, rows.length - 1)].time, mm: round1(bestSum) }
    }
  }

  // Hours until the event we are actually forecasting.
  const leadHours = peakWindow
    ? Math.max(0, Math.round((new Date(peakWindow.from).getTime() - start) / 3600e3))
    : 12

  return { rainMm, wetHours, maxWindKmh, maxGustKmh, minVisibilityKm, peakWindow, leadHours }
}
