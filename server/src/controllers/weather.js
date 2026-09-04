import { z } from 'zod'
import {
  fetchForecast, fetchEnsemble, totalsFor24h, antecedentRainfall, describeCode, deriveCurrentCondition,
} from '../services/openMeteo.js'
import { fetchCurrentOpenWeather } from '../services/openWeather.js'
import { resolveLocation } from '../services/gazetteer.js'
import { notFound } from '../utils/AppError.js'

export const pointSchema = z
  .object({
    lat: z.coerce.number().min(-90).max(90).optional(),
    lon: z.coerce.number().min(-180).max(180).optional(),
    q: z.string().trim().min(2).max(80).optional(),
    days: z.coerce.number().int().min(1).max(16).optional(),
    // Consumed by /assess when composing the advice block. They change the
    // closing sentence and nothing else — same forecast, same risk.
    persona: z.enum(['general', 'farmer', 'traveller', 'official']).optional(),
    lang: z.enum(['en', 'hi', 'hinglish']).optional(),
  })
  .refine((v) => v.q || (v.lat != null && v.lon != null), {
    message: 'Provide either q, or both lat and lon',
  })

/** Shared: turn the query into a resolved place or fail loudly. */
export async function locationFromQuery(query) {
  const loc = await resolveLocation(query)
  if (!loc) throw notFound('Could not resolve that location')
  return loc
}

export async function current(req, res) {
  const loc = await locationFromQuery(req.validQuery)
  const [fc, liveObs] = await Promise.all([
    fetchForecast(loc.lat, loc.lon, { days: 1 }),
    fetchCurrentOpenWeather(loc.lat, loc.lon).catch(() => null),
  ])

  const currentObj = liveObs ? {
    time: liveObs.time,
    tempC: liveObs.tempC ?? fc.current.tempC,
    feelsLikeC: liveObs.feelsLikeC ?? fc.current.feelsLikeC,
    humidity: liveObs.humidity ?? fc.current.humidity,
    pressureHpa: liveObs.pressureHpa ?? fc.current.pressureHpa,
    precipMm: liveObs.precipMm ?? fc.current.precipMm,
    cloudCover: liveObs.cloudCover ?? fc.current.cloudCover,
    visibilityM: liveObs.visibilityM ?? fc.current.visibilityM,
    windKmh: liveObs.windKmh ?? fc.current.windKmh,
    windDirDeg: liveObs.windDirDeg ?? fc.current.windDirDeg,
    gustKmh: liveObs.gustKmh ?? fc.current.gustKmh,
    weatherCode: liveObs.weatherCode ?? fc.current.weatherCode,
    condition: liveObs.condition || deriveCurrentCondition(fc.current, fc.hourly),
  } : {
    ...fc.current,
    condition: deriveCurrentCondition(fc.current, fc.hourly),
  }

  res.json({
    location: loc,
    current: currentObj,
    meta: { ...fc.meta, cached: fc.cached, fetchedAt: fc.fetchedAt, liveSource: liveObs ? 'OpenWeatherMap' : 'Open-Meteo' },
  })
}

export async function forecast(req, res) {
  const { days = 7 } = req.validQuery
  const loc = await locationFromQuery(req.validQuery)
  const [fc, liveObs] = await Promise.all([
    fetchForecast(loc.lat, loc.lon, { days }),
    fetchCurrentOpenWeather(loc.lat, loc.lon).catch(() => null),
  ])

  const now = Date.now()
  const currentObj = liveObs ? {
    time: liveObs.time,
    tempC: liveObs.tempC ?? fc.current.tempC,
    feelsLikeC: liveObs.feelsLikeC ?? fc.current.feelsLikeC,
    humidity: liveObs.humidity ?? fc.current.humidity,
    pressureHpa: liveObs.pressureHpa ?? fc.current.pressureHpa,
    precipMm: liveObs.precipMm ?? fc.current.precipMm,
    cloudCover: liveObs.cloudCover ?? fc.current.cloudCover,
    visibilityM: liveObs.visibilityM ?? fc.current.visibilityM,
    windKmh: liveObs.windKmh ?? fc.current.windKmh,
    windDirDeg: liveObs.windDirDeg ?? fc.current.windDirDeg,
    gustKmh: liveObs.gustKmh ?? fc.current.gustKmh,
    weatherCode: liveObs.weatherCode ?? fc.current.weatherCode,
    condition: liveObs.condition || deriveCurrentCondition(fc.current, fc.hourly),
  } : {
    ...fc.current,
    condition: deriveCurrentCondition(fc.current, fc.hourly),
  }

  res.json({
    location: loc,
    current: currentObj,
    // only forward-looking hours reach the client; past_days feeds the flood rule
    hourly: fc.hourly.filter((h) => new Date(h.time).getTime() >= now - 3600e3).slice(0, days * 24),
    daily: fc.daily.map((d) => ({ ...d, condition: describeCode(d.weatherCode) })),
    antecedent72hMm: antecedentRainfall(fc, 72),
    meta: { ...fc.meta, cached: fc.cached, fetchedAt: fc.fetchedAt, liveSource: liveObs ? 'OpenWeatherMap' : 'Open-Meteo' },
  })
}



/** The model spread, exposed on its own so the UI can show the evidence. */
export async function ensemble(req, res) {
  const loc = await locationFromQuery(req.validQuery)
  const ens = await fetchEnsemble(loc.lat, loc.lon, { days: 3 })
  res.json({
    location: loc,
    totals24h: totalsFor24h(ens),
    meta: { ...ens.meta, cached: ens.cached, fetchedAt: ens.fetchedAt },
  })
}
