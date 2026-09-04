import { fetchForecast, antecedentRainfall, window24h, describeCode } from '../openMeteo.js'
import { warningsForPoint, highest } from '../capIngest.js'
import * as engines from './engines.js'

/**
 * The daily farm brief — PRD §14, and `GET /api/agriculture/brief`.
 *
 * Assembles the whole picture in one round trip: forecast, warnings and every
 * agriculture engine, fetched in parallel so a slow engine cannot delay a
 * warning. That ordering is the point — the warning is fetched alongside the
 * forecast rather than after it, so a Sachet outage cannot cost someone the
 * one piece of information they needed.
 */
export async function buildBrief({ location, farm = {} }) {
  const now = new Date()

  const [forecast, warnings] = await Promise.all([
    fetchForecast(location.lat, location.lon, { days: 7 }),
    warningsForPoint({
      lat: location.lat,
      lon: location.lon,
      district: location.district,
      state: location.state,
    }).catch(() => []),
  ])

  const live = warnings.filter(
    (w) => w.status === 'active' && (!w.expires || new Date(w.expires) > now),
  )
  const top = highest(live)

  const next24 = window24h(forecast.hourly, now)
  const today = forecast.daily?.[0] || {}
  const tomorrow = forecast.daily?.[1] || {}
  // Already on the ground. `fetchForecast` asks for past_days: 3 precisely so
  // this is available without a second request.
  const rain72h = antecedentRainfall(forecast, 72)

  const crop = farm.crops?.[0] || {}
  const weather = {
    temp_c: forecast.current?.tempC ?? today.tempMaxC,
    temp_max_c: today.tempMaxC,
    temp_min_c: today.tempMinC,
    humidity: forecast.current?.humidity,
    feels_like_c: forecast.current?.feelsLikeC,
    wind_kmh: forecast.current?.windKmh,
    gust_kmh: forecast.current?.gustKmh ?? next24?.maxGustKmh,
    rain_24h_mm: next24?.rainMm ?? today.precipMm,
    rain_48h_mm: (today.precipMm || 0) + (tomorrow.precipMm || 0),
    rain_72h_mm: rain72h,
    condition: describeCode(forecast.current?.weatherCode),
    observed_at: forecast.current?.time || now.toISOString(),
  }

  const farmContext = {
    crop: crop.name || null,
    sown_at: crop.sownAt || null,
    soil_type: farm.soilType || null,
    irrigation_type: farm.irrigationType || null,
    area_ha: farm.areaHa ?? null,
    last_irrigated_days: farm.lastIrrigatedAt
      ? Math.round((now - new Date(farm.lastIrrigatedAt)) / 86400000)
      : null,
    soil_moisture_pct: farm.soilMoisturePct ?? null,
    last_disease_prediction: farm.lastDiseasePrediction || null,
    last_disease_confidence: farm.lastDiseaseConfidence ?? null,
  }

  const bundle = await engines.context({
    location: { name: location.name, district: location.district, state: location.state },
    weather,
    farm: farmContext,
    warnings: live.map((w) => ({
      colour: w.colour,
      severity: w.severity,
      event: w.event,
      headline: w.headline,
      instruction: w.instruction,
      sender: w.sender,
      expires: w.expires,
      status: 'active',
    })),
  })

  return {
    location: {
      name: location.name,
      district: location.district,
      state: location.state,
    },
    weather,
    warnings: live,
    highestWarning: top || null,
    // Null when the Python service is unreachable. The interface renders the
    // forecast and the warning regardless and says the engines are down —
    // it does not substitute a default.
    agriculture: bundle,
    degraded: bundle === null,
    observedAt: weather.observed_at,
  }
}

export default { buildBrief }
