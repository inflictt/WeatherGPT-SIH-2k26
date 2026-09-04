import {
  fetchForecast, fetchEnsemble, totalsFor24h, antecedentRainfall, describeCode, window24h,
} from '../services/openMeteo.js'
import { warningsForPoint, highest } from '../services/capIngest.js'
import { scoreRisk, scoreUncertainty, composeAnswer } from '../services/aiClient.js'
import { locationFromQuery } from './weather.js'

/**
 * The Phase 2 ↔ Phase 3 bridge, and the endpoint the Today screen calls.
 *
 * Fetches forecast, ensemble and warnings in parallel, hands them to the
 * Python engines, and returns one object. If the engine is unreachable the
 * response still carries forecast and warnings, flagged `degraded: true` —
 * the client renders exactly the same cards minus the score.
 */
export async function assess(req, res) {
  const loc = await locationFromQuery(req.validQuery)

  const [forecast, ensemble, warnings] = await Promise.all([
    fetchForecast(loc.lat, loc.lon, { days: 7 }),
    fetchEnsemble(loc.lat, loc.lon, { days: 3 }).catch(() => null),
    warningsForPoint({ lat: loc.lat, lon: loc.lon, district: loc.district, state: loc.state }),
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
    { name: 'Open-Meteo', role: 'forecast', fetchedAt: forecast.fetchedAt, cached: forecast.cached },
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

  res.json({
    location: loc,
    current: { ...forecast.current, condition: describeCode(forecast.current.weatherCode) },
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
