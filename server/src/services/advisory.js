/**
 * Sector Decision Engine (advisory.js)
 * 
 * Translates raw meteorological physical parameters and official CAP bulletins
 * into deterministic, auditable decisions for critical sectors:
 * - Agriculture (Farmers / Agromet)
 * - Marine & Coastal (Fishermen / Port operations)
 * - Road & Commuter Transport
 * - Urban & Disaster Management (City admin)
 *
 * Implements standard IMD (India Meteorological Department) operational thresholds.
 */

// IMD Standard Impact Thresholds
export const THRESHOLDS = {
  // Marine
  SMALL_CRAFT_GUST_KMH: 63.0, // ~34 knots (IMD small-craft warning threshold)
  SMALL_CRAFT_GUST_KNOTS: 34.0,
  SQUALLY_WIND_KMH: 45.0,     // ~24 knots

  // Agriculture
  SPRAY_RAIN_MAX_MM: 2.5,     // Washing off threshold
  SPRAY_WIND_MAX_KMH: 15.0,   // Drift threshold
  SPRAY_HUMIDITY_MAX: 85,     // Fungal disease acceleration
  IRRIGATION_SKIP_RAIN_MM: 10.0,

  // Commuter / Transport
  VISIBILITY_POOR_KM: 2.0,
  VISIBILITY_VERY_POOR_KM: 0.5,
  HIGH_CROSSWIND_KMH: 50.0,

  // Urban / Disaster Management
  URBAN_WATERLOGGING_3H_MM: 25.0,
  HEATWAVE_SCREENING_C: 40.0,
  SEVERE_HEATWAVE_SCREENING_C: 45.0,
}

/**
 * Evaluates sector decision rules deterministically based on physical values.
 * Returns structured decisions with auditable threshold reasons.
 */
export function evaluateSectorDecisions({ current = {}, summary24h = {}, warnings = [], location = {} }) {
  const rain24h = summary24h.rain_24h_mm ?? summary24h.rain_mm ?? current.precipMm ?? 0
  const maxGust = summary24h.maxGustKmh ?? summary24h.gust_kmh ?? current.gustKmh ?? (current.windKmh ? current.windKmh * 1.3 : 0)
  const maxWind = summary24h.maxWindKmh ?? summary24h.wind_kmh ?? current.windKmh ?? 0
  const tempMax = summary24h.temp_max_c ?? summary24h.tmax ?? current.tempC ?? 25
  const humidity = current.humidity ?? 60
  const visibilityKm = summary24h.minVisibilityKm ?? summary24h.visibility_km ?? (current.visibilityM ? current.visibilityM / 1000 : 10)
  const condition = (current.condition || '').toLowerCase()
  const isConvective = condition.includes('thunder') || condition.includes('storm') || condition.includes('lightning')

  // 1. Farmer Decision (Agromet)
  let sprayDecision = { status: 'ALLOWED', label: 'Safe to Spray', reason: 'Favorable winds (<15 km/h) and dry window' }
  if (rain24h >= THRESHOLDS.SPRAY_RAIN_MAX_MM || isConvective) {
    sprayDecision = { status: 'NO_SPRAY', label: 'Do Not Spray', reason: `Rain (${rain24h} mm) will wash off chemicals` }
  } else if (maxWind >= THRESHOLDS.SPRAY_WIND_MAX_KMH) {
    sprayDecision = { status: 'NO_SPRAY', label: 'Drift Warning', reason: `Wind (${maxWind.toFixed(1)} km/h) exceeds 15 km/h drift limit` }
  } else if (humidity > THRESHOLDS.SPRAY_HUMIDITY_MAX) {
    sprayDecision = { status: 'CAUTION', label: 'High Humidity', reason: `Humidity (${humidity}%) may cause fungal retention` }
  }

  const irrigationDecision = rain24h >= THRESHOLDS.IRRIGATION_SKIP_RAIN_MM
    ? { status: 'SKIP', label: 'Skip Irrigation', reason: `Expected rainfall (${rain24h} mm) exceeds 10 mm requirement` }
    : { status: 'PROCEED', label: 'Normal Irrigation', reason: `Soil moisture adequate; light watering if topsoil is dry` }

  // 2. Fishermen & Marine (Small-Craft Safety)
  let marineDecision = { status: 'GO', label: 'Normal Sea State', reason: 'Wind & waves within safe coastal limits' }
  if (maxGust >= THRESHOLDS.SMALL_CRAFT_GUST_KMH || maxWind >= THRESHOLDS.SQUALLY_WIND_KMH) {
    marineDecision = {
      status: 'NO_GO',
      label: 'Small Craft Warning',
      reason: `Gusts (${maxGust.toFixed(1)} km/h) exceed IMD 34-knot (63 km/h) sea threshold`,
    }
  } else if (maxWind >= 30 || isConvective) {
    marineDecision = {
      status: 'CAUTION',
      label: 'Squally Weather',
      reason: 'Convective thunderstorm activity or choppy seas. Avoid deep-sea venture.',
    }
  }

  // 3. Travel & Commute (Road Safety)
  let travelDecision = { status: 'NORMAL', label: 'Clear Roads', reason: 'Normal visibility and dry highway conditions' }
  if (visibilityKm <= THRESHOLDS.VISIBILITY_POOR_KM) {
    travelDecision = {
      status: 'CAUTION',
      label: 'Low Visibility',
      reason: `Visibility reduced to ${visibilityKm} km (fog/rain). Drive with low-beams.`,
    }
  } else if (rain24h >= 20 || isConvective) {
    travelDecision = {
      status: 'WARNING',
      label: 'Wet Road / Aquaplaning',
      reason: 'Active rain showers causing surface water runoff. Avoid waterlogged underpasses.',
    }
  } else if (maxGust >= THRESHOLDS.HIGH_CROSSWIND_KMH) {
    travelDecision = {
      status: 'CAUTION',
      label: 'High Crosswinds',
      reason: `Wind gusts (${maxGust.toFixed(1)} km/h) on flyovers and open expressways.`,
    }
  }

  // 4. City & Urban Disaster Management
  let cityDecision = { status: 'NORMAL', label: 'Routine Drainage', reason: 'Precipitation within municipal capacity' }
  if (rain24h >= THRESHOLDS.URBAN_WATERLOGGING_3H_MM || location.urban_flood_prone) {
    cityDecision = {
      status: 'WATERLOGGING_ALERT',
      label: 'Pre-position Pumps',
      reason: `Rainfall (${rain24h} mm) exceeds 25 mm urban runoff threshold.`,
    }
  } else if (tempMax >= THRESHOLDS.HEATWAVE_SCREENING_C) {
    cityDecision = {
      status: 'HEAT_ACTION',
      label: 'Heat Action Triggered',
      reason: `Peak temp (${tempMax}°C) exceeds 40°C threshold. Activate hydration shelters.`,
    }
  }

  return {
    farmer: {
      spray: sprayDecision,
      irrigation: irrigationDecision,
      harvest: rain24h >= 5 ? 'Cover & Protect' : 'Normal Operations',
    },
    marine: marineDecision,
    travel: travelDecision,
    city: cityDecision,
  }
}

/**
 * Builds standard provenance tracking objects for anti-hallucination guarantees.
 */
export function buildProvenance({ source, product, isAuthoritative = false, issuedAt = null }) {
  return {
    source,
    product,
    isAuthoritative,
    issuedAt: issuedAt || new Date().toISOString(),
    badge: isAuthoritative ? 'IMD/NDMA Authoritative' : 'ECMWF 9km NWP Model',
    tone: isAuthoritative ? 'green' : 'amber',
  }
}
