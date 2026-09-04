import { env } from '../config/env.js'
import { getJson } from '../utils/http.js'
import { ForecastCache } from '../models/ForecastCache.js'
import { log } from '../utils/logger.js'

/**
 * Open-Meteo client. Free, no API key, no signup.
 *
 * Two calls, deliberately:
 *   1. `fetchForecast`  — the "best match" model with the full variable set.
 *                          This is what the UI renders.
 *   2. `fetchEnsemble`  — precipitation only, from three named models, so the
 *                          uncertainty engine (§9) has a real spread to measure.
 *
 * Probability of precipitation is only published by some models, which is why
 * it is requested from the best-match call and never from the ensemble one.
 */

const HOURLY = [
  'temperature_2m',
  'relative_humidity_2m',
  'apparent_temperature',
  'precipitation',
  'precipitation_probability',
  'weather_code',
  'pressure_msl',
  'cloud_cover',
  'visibility',
  'wind_speed_10m',
  'wind_direction_10m',
  'wind_gusts_10m',
]

const DAILY = [
  'weather_code',
  'temperature_2m_max',
  'temperature_2m_min',
  'apparent_temperature_max',
  'precipitation_sum',
  'precipitation_probability_max',
  'wind_speed_10m_max',
  'wind_gusts_10m_max',
  'sunrise',
  'sunset',
  'uv_index_max',
]

const CURRENT = [
  'temperature_2m',
  'apparent_temperature',
  'relative_humidity_2m',
  'precipitation',
  'weather_code',
  'pressure_msl',
  'cloud_cover',
  'wind_speed_10m',
  'wind_direction_10m',
  'wind_gusts_10m',
]

const round = (n, p = 4) => Number(Number(n).toFixed(p))

/** Cache key is coarse on purpose — 4 dp is ~11 m, far finer than any forecast. */
function cacheKey(kind, lat, lon, extra = '') {
  return `${kind}:${round(lat)}:${round(lon)}${extra ? ':' + extra : ''}`
}

async function cached(key, ttlMinutes, producer) {
  const hit = await ForecastCache.findOne({ key }).lean()
  if (hit && hit.expiresAt > new Date()) {
    return { ...hit.payload, cached: true, fetchedAt: hit.fetchedAt }
  }
  const payload = await producer()
  const expiresAt = new Date(Date.now() + ttlMinutes * 60_000)
  await ForecastCache.findOneAndUpdate(
    { key },
    { key, payload, fetchedAt: new Date(), expiresAt },
    { upsert: true },
  )
  return { ...payload, cached: false, fetchedAt: new Date() }
}

function url(path, params) {
  const q = new URLSearchParams(params)
  return `${env.openMeteoBase}${path}?${q.toString()}`
}

/**
 * Full forecast for a point.
 * @returns { current, hourly[], daily[], meta }
 */
export async function fetchForecast(lat, lon, { days = 7, timezone = 'auto' } = {}) {
  return cached(cacheKey('fc', lat, lon, String(days)), env.forecastTtlMinutes, async () => {
    const raw = await getJson(
      url('/forecast', {
        latitude: round(lat),
        longitude: round(lon),
        current: CURRENT.join(','),
        hourly: HOURLY.join(','),
        daily: DAILY.join(','),
        timezone,
        forecast_days: String(days),
        past_days: '3', // antecedent rainfall feeds the flood composite
        wind_speed_unit: 'kmh',
        precipitation_unit: 'mm',
        temperature_unit: 'celsius',
      }),
    )
    return normaliseForecast(raw)
  })
}

export function normaliseForecast(raw) {
  const h = raw.hourly || {}
  const d = raw.daily || {}
  const times = h.time || []

  const hourly = times.map((t, i) => ({
    time: t,
    tempC: h.temperature_2m?.[i] ?? null,
    feelsLikeC: h.apparent_temperature?.[i] ?? null,
    humidity: h.relative_humidity_2m?.[i] ?? null,
    precipMm: h.precipitation?.[i] ?? 0,
    precipProb: h.precipitation_probability?.[i] ?? null,
    weatherCode: h.weather_code?.[i] ?? null,
    pressureHpa: h.pressure_msl?.[i] ?? null,
    cloudCover: h.cloud_cover?.[i] ?? null,
    visibilityM: h.visibility?.[i] ?? null,
    windKmh: h.wind_speed_10m?.[i] ?? null,
    windDirDeg: h.wind_direction_10m?.[i] ?? null,
    gustKmh: h.wind_gusts_10m?.[i] ?? null,
  }))

  const daily = (d.time || []).map((t, i) => ({
    date: t,
    weatherCode: d.weather_code?.[i] ?? null,
    tempMaxC: d.temperature_2m_max?.[i] ?? null,
    tempMinC: d.temperature_2m_min?.[i] ?? null,
    feelsMaxC: d.apparent_temperature_max?.[i] ?? null,
    precipMm: d.precipitation_sum?.[i] ?? 0,
    precipProbMax: d.precipitation_probability_max?.[i] ?? null,
    windMaxKmh: d.wind_speed_10m_max?.[i] ?? null,
    gustMaxKmh: d.wind_gusts_10m_max?.[i] ?? null,
    uvMax: d.uv_index_max?.[i] ?? null,
    sunrise: d.sunrise?.[i] ?? null,
    sunset: d.sunset?.[i] ?? null,
  }))

  const c = raw.current || {}
  return {
    current: {
      time: c.time ?? null,
      tempC: c.temperature_2m ?? null,
      feelsLikeC: c.apparent_temperature ?? null,
      humidity: c.relative_humidity_2m ?? null,
      precipMm: c.precipitation ?? 0,
      weatherCode: c.weather_code ?? null,
      pressureHpa: c.pressure_msl ?? null,
      cloudCover: c.cloud_cover ?? null,
      windKmh: c.wind_speed_10m ?? null,
      windDirDeg: c.wind_direction_10m ?? null,
      gustKmh: c.wind_gusts_10m ?? null,
    },
    hourly,
    daily,
    meta: {
      source: 'Open-Meteo',
      model: 'best_match',
      latitude: raw.latitude,
      longitude: raw.longitude,
      timezone: raw.timezone,
      elevation: raw.elevation,
      generatedAt: new Date().toISOString(),
      license: 'CC BY 4.0 — attribution required',
    },
  }
}

/**
 * Hourly precipitation from each configured model, for the spread analysis.
 * With several models requested, Open-Meteo suffixes each variable with the
 * model id (`precipitation_ecmwf_ifs025`); with one it does not. Handle both.
 */
export async function fetchEnsemble(lat, lon, { days = 3 } = {}) {
  const models = env.ensembleModels
  const key = cacheKey('ens', lat, lon, `${days}:${models.join('+')}`)

  return cached(key, env.forecastTtlMinutes, async () => {
    const raw = await getJson(
      url('/forecast', {
        latitude: round(lat),
        longitude: round(lon),
        hourly: 'precipitation',
        models: models.join(','),
        timezone: 'auto',
        forecast_days: String(days),
        precipitation_unit: 'mm',
      }),
    )

    const times = raw.hourly?.time || []
    const series = models
      .map((m) => {
        const values = raw.hourly?.[`precipitation_${m}`] ?? raw.hourly?.precipitation ?? null
        if (!values) {
          log.warn('ensemble model returned no series', { model: m })
          return null
        }
        return { model: m, precipMm: values }
      })
      .filter(Boolean)

    return { time: times, series, meta: { source: 'Open-Meteo', models, generatedAt: new Date().toISOString() } }
  })
}

/**
 * Collapse the ensemble into per-model 24-hour totals from `fromIso`.
 * This is exactly the input the uncertainty engine expects.
 */
export function totalsFor24h(ensemble, fromIso) {
  const times = ensemble.time || []
  const start = fromIso ? new Date(fromIso) : new Date(times[0])
  const end = new Date(start.getTime() + 24 * 3600e3)

  const idx = times
    .map((t, i) => ({ t: new Date(t), i }))
    .filter(({ t }) => t >= start && t < end)
    .map(({ i }) => i)

  return (ensemble.series || []).map((s) => ({
    model: s.model,
    mm: Number(idx.reduce((sum, i) => sum + (s.precipMm[i] ?? 0), 0).toFixed(1)),
  }))
}

/** Rainfall already on the ground — the flood composite needs it. */
export function antecedentRainfall(forecast, hours = 72) {
  const now = Date.now()
  const cutoff = now - hours * 3600e3
  return Number(
    (forecast.hourly || [])
      .filter((h) => {
        const t = new Date(h.time).getTime()
        return t >= cutoff && t <= now
      })
      .reduce((sum, h) => sum + (h.precipMm || 0), 0)
      .toFixed(1),
  )
}

export const describeCode = (code) => WEATHER_CODES[code] ?? 'Unknown'

/**
 * Smart nowcasting condition resolver.
 * Combines WMO code, active precipitation, and immediate hourly window.
 */
export function deriveCurrentCondition(current, hourly = [], summary24h = null) {
  if (!current) return 'Unknown'
  const code = current.weatherCode

  // 1. Direct severe codes take top priority
  if (code >= 95) {
    if (code === 96 || code === 99) return 'Thunderstorm with Hail'
    return 'Thunderstorm & Heavy Rain'
  }
  if (code === 82 || code === 65) return 'Heavy Rain Showers'
  if (code === 81 || code === 63) return 'Moderate Rain Showers'
  if (code === 80 || code === 61) return 'Rain Showers'
  if (code >= 51 && code <= 55) return 'Drizzle & Light Rain'

  // 2. Active precipitation rate right now
  const precip = current.precipMm ?? 0
  if (precip >= 5) return 'Heavy Rain Showers'
  if (precip >= 1.5) return 'Rain Showers'
  if (precip > 0) return 'Light Rain'

  // 3. Current hourly nowcasting window
  const now = Date.now()
  const currentHourData = (hourly || []).find((h) => {
    const t = new Date(h.time).getTime()
    return Math.abs(t - now) <= 3600e3
  })

  if (currentHourData) {
    const hCode = currentHourData.weatherCode
    if (hCode >= 95) return 'Thunderstorm & Rain'
    if (hCode >= 80 && hCode <= 82) return 'Rain Showers'
    if (hCode >= 61 && hCode <= 65) return 'Heavy Rain'
    if ((currentHourData.precipMm || 0) >= 2) return 'Heavy Rain Showers'
    if ((currentHourData.precipMm || 0) > 0) return 'Rain Showers'
    if ((currentHourData.precipProb || 0) >= 70 && (current.cloudCover || 0) >= 80) return 'Rain Showers Likely'
  }

  // 4. High-humidity convective rain pattern
  if (summary24h && (summary24h.rain_24h_mm >= 25 || (summary24h.rain_duration_hours >= 6 && (summary24h.rain_probability || 0) >= 0.5))) {
    if ((current.humidity || 0) >= 80 && (current.cloudCover || 0) >= 80) {
      return 'Thunderstorm & Heavy Rain'
    }
  }

  return describeCode(code)
}

