import { env } from '../config/env.js'
import { getJson } from '../utils/http.js'
import { ForecastCache } from '../models/ForecastCache.js'
import { log } from '../utils/logger.js'

const round = (n, p = 4) => Number(Number(n).toFixed(p))

/**
 * Fetch live real-time observation from OpenWeatherMap API 2.5
 */
export async function fetchCurrentOpenWeather(lat, lon) {
  if (!env.openWeatherApiKey) {
    return null
  }

  const key = `owm:current:${round(lat)}:${round(lon)}`
  const ttlMinutes = 10

  try {
    const hit = await ForecastCache.findOne({ key }).lean()
    if (hit && hit.expiresAt > new Date()) {
      return { ...hit.payload, cached: true, fetchedAt: hit.fetchedAt }
    }

    const url = `${env.openWeatherBase}/weather?lat=${round(lat)}&lon=${round(lon)}&appid=${env.openWeatherApiKey}&units=metric`
    const raw = await getJson(url)

    if (!raw || raw.cod !== 200) {
      log.warn('OpenWeatherMap returned non-200 code', { cod: raw?.cod, message: raw?.message })
      return null
    }

    const payload = normaliseOpenWeatherCurrent(raw)
    const expiresAt = new Date(Date.now() + ttlMinutes * 60_000)

    await ForecastCache.findOneAndUpdate(
      { key },
      { key, payload, fetchedAt: new Date(), expiresAt },
      { upsert: true },
    )

    return { ...payload, cached: false, fetchedAt: new Date() }
  } catch (err) {
    log.warn('OpenWeatherMap fetch failed, falling back to Open-Meteo', { error: err.message })
    return null
  }
}

/**
 * Normalise OpenWeatherMap 2.5 current payload into our standard schema
 */
function normaliseOpenWeatherCurrent(raw) {
  const w = raw.weather?.[0] || {}
  const m = raw.main || {}
  const wind = raw.wind || {}
  const rain = raw.rain || {}
  const clouds = raw.clouds || {}
  const sys = raw.sys || {}

  // Format condition description nicely: "Light rain" -> "Light Rain"
  const rawDesc = w.description || w.main || 'Overcast'
  const condition = rawDesc.replace(/\b\w/g, (c) => c.toUpperCase())

  const precipMm = rain['1h'] ?? rain['3h'] ?? 0
  const windKmh = wind.speed != null ? Number((wind.speed * 3.6).toFixed(1)) : null
  const gustKmh = wind.gust != null ? Number((wind.gust * 3.6).toFixed(1)) : windKmh

  return {
    time: new Date((raw.dt || Math.floor(Date.now() / 1000)) * 1000).toISOString(),
    tempC: m.temp != null ? Number(m.temp.toFixed(1)) : null,
    feelsLikeC: m.feels_like != null ? Number(m.feels_like.toFixed(1)) : null,
    humidity: m.humidity ?? null,
    pressureHpa: m.pressure ?? null,
    precipMm: Number(precipMm.toFixed(1)),
    cloudCover: clouds.all ?? null,
    visibilityM: raw.visibility ?? null,
    windKmh,
    windDirDeg: wind.deg ?? null,
    gustKmh,
    weatherCode: w.id ?? null,
    condition,
    sunrise: sys.sunrise ? new Date(sys.sunrise * 1000).toISOString() : null,
    sunset: sys.sunset ? new Date(sys.sunset * 1000).toISOString() : null,
    source: 'OpenWeatherMap',
  }
}
