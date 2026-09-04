import { RISK_TONE } from './constants'

/**
 * The daily brief, composed from figures — never written.
 *
 * The design opens the Today screen with a sentence rather than a number:
 * "A dry, bright day. Good window for spraying." That is the best thing in it
 * and also the most dangerous, because a sentence *feels* like an opinion and
 * would be trivially easy to hand-write or hand to a model.
 *
 * So it is neither. Every clause below is selected by a threshold on a value
 * that is also printed on the same screen, and the thresholds are IMD's
 * published ones. If the rainfall figure changes band, the sentence changes
 * with it; if the data is missing, the sentence says so instead of guessing.
 * That is the same rule the Python composer follows, for the same reason.
 */

/** IMD 24-hour rainfall categories, in mm. */
const RAIN = { light: 64.5, heavy: 115.6, veryHeavy: 204.5 }
/** IMD wind advisory thresholds, km/h. */
const WIND = { breezy: 20, strong: 40, squall: 62 }

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n))

export function greeting(now = new Date()) {
  const h = now.getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

/**
 * The headline sentence and its supporting line.
 *
 * `audience` changes what the second half talks about — a spray window for a
 * farm, travel and clothing for everyone else — but never the first half,
 * because what the weather *is* does not depend on who is asking.
 */
export function statement({ current, summary24h, daily, audience = 'everyone', fmt }) {
  if (!current || current.tempC == null) {
    return {
      headline: "I don't have current conditions for this place.",
      sub: 'Nothing here is estimated. Connect the API, or pick another location.',
      unknown: true,
    }
  }

  const mm = summary24h?.rainMm ?? daily?.[0]?.mm ?? 0
  const wind = current.windKmh ?? 0
  const gust = current.gustKmh ?? wind
  const temp = current.tempC
  const prob = current.rainProb ?? 0

  // --- first half: what the weather is doing ---
  let head
  if (mm >= RAIN.veryHeavy) head = 'Extremely heavy rain is coming.'
  else if (mm >= RAIN.heavy) head = 'Very heavy rain is coming.'
  else if (mm >= RAIN.light) head = 'Heavy rain is on the way.'
  else if (prob >= 0.6) head = 'Rain is likely today.'
  else if (gust >= WIND.squall) head = 'Squally winds today.'
  else if (temp >= 40) head = 'A dangerously hot day.'
  else if (temp >= 35) head = 'A hot, dry day.'
  else if (prob >= 0.3) head = 'A mixed day — showers possible.'
  else head = 'A dry, bright day.'

  // --- second half: what it means for the person asking ---
  let tail
  if (audience === 'farm') {
    if (mm >= RAIN.heavy) tail = 'Hold off on spraying and irrigation.'
    else if (mm >= RAIN.light) tail = 'Delay irrigation and secure loose cover.'
    else if (wind >= WIND.strong) tail = 'Too windy to spray.'
    else if (prob >= 0.5) tail = 'Narrow window for spraying.'
    else if (wind <= WIND.breezy && temp < 35) tail = 'Good window for spraying.'
    else tail = 'Irrigation may be worth checking.'
  } else if (mm >= RAIN.heavy) tail = 'Avoid low-lying routes.'
  else if (mm >= RAIN.light) tail = 'Expect travel disruption.'
  else if (gust >= WIND.squall) tail = 'Secure anything loose outdoors.'
  else if (temp >= 40) tail = 'Stay out of the afternoon sun.'
  else if (prob >= 0.5) tail = 'Carry an umbrella.'
  else tail = 'Good day to be outdoors.'

  // The supporting line names the two figures the sentence turned on, so the
  // reader can check the reasoning rather than take it on trust.
  const bits = []
  if (mm > 0) bits.push(`${fmt ? fmt.rain(mm) : Math.round(mm)} ${fmt ? fmt.rainUnit : 'mm'} expected in 24 h`)
  else bits.push(`${Math.round(prob * 100)}% chance of rain`)
  bits.push(`winds ${fmt ? fmt.speed(wind) : Math.round(wind)} ${fmt ? fmt.speedUnit : 'km/h'}`)

  return { headline: head, sub: `${bits.join(' · ')}.`, unknown: false }
}

/** The four status tiles under the hero. */
export function briefTiles({ current, summary24h, risk, daily, audience, fmt }) {
  const mm = summary24h?.rainMm ?? daily?.[0]?.mm ?? null
  const wind = current?.windKmh ?? null
  const band = risk?.overall || null
  const tone = band ? RISK_TONE[band] || 'green' : null

  const rainTone =
    mm == null ? null : mm >= RAIN.veryHeavy ? 'red' : mm >= RAIN.heavy ? 'orange' : mm >= RAIN.light ? 'yellow' : 'green'

  const tiles = [
    {
      key: 'weather',
      label: 'Weather',
      value: current?.condition || 'Unknown',
      note:
        mm == null
          ? 'No rainfall figure'
          : `${fmt ? fmt.rain(mm) : Math.round(mm)} ${fmt ? fmt.rainUnit : 'mm'} in 24 h`,
      tone: rainTone,
    },
    {
      key: 'risk',
      label: audience === 'farm' ? 'Farm risk' : 'Risk',
      value: band || 'Unavailable',
      note: risk?.score != null ? `Score ${risk.score}/100` : 'Risk engine unreachable',
      tone,
    },
  ]

  if (audience === 'farm') {
    const irr = irrigation({ current, summary24h, daily })
    tiles.push({
      key: 'irrigation',
      label: 'Irrigation',
      value: irr.recommendation,
      note: irr.reason,
      tone: irr.tone,
    })
    tiles.push({
      key: 'crop',
      label: 'Crop health',
      value: 'Not scanned',
      note: 'Run a scan in Crop Doctor',
      tone: null,
    })
  } else {
    tiles.push({
      key: 'wind',
      label: 'Wind',
      value: wind == null ? 'Unknown' : `${fmt ? fmt.speed(wind) : Math.round(wind)} ${fmt ? fmt.speedUnit : 'km/h'}`,
      note: current?.windDir ? `From ${current.windDir}` : '—',
      tone: wind == null ? null : wind >= WIND.squall ? 'orange' : wind >= WIND.strong ? 'yellow' : 'green',
    })
    tiles.push({
      key: 'visibility',
      label: 'Visibility',
      value:
        current?.visibilityKm == null
          ? 'Unknown'
          : `${fmt ? fmt.distance(current.visibilityKm) : current.visibilityKm} ${fmt ? fmt.distanceUnit : 'km'}`,
      note: current?.humidity != null ? `${current.humidity}% humidity` : '—',
      tone: current?.visibilityKm == null ? null : current.visibilityKm < 2 ? 'orange' : 'green',
    })
  }

  return tiles
}

/**
 * Irrigation advice.
 *
 * Deliberately crude and deliberately transparent: it is a rainfall lookup,
 * not an evapotranspiration model, and it says so. The PRD's full version
 * wants soil type, crop stage and recent irrigation, none of which exist
 * without a farm profile and a backend — so rather than pretend, this returns
 * the one thing rainfall alone can honestly support, plus the list of inputs
 * it did *not* have.
 */
export function irrigation({ current, summary24h, daily }) {
  const mm = summary24h?.rainMm ?? daily?.[0]?.mm ?? null
  const soon = daily?.slice(0, 2).reduce((a, d) => a + (d.mm || 0), 0) ?? null

  if (mm == null) {
    return {
      recommendation: 'Unknown',
      band: 'No data',
      tone: null,
      reason: 'No rainfall forecast is available for this place, so no recommendation is possible.',
      confidence: 'LOW',
      inputs: [],
      missing: ['rainfall', 'soil type', 'crop stage', 'last irrigation'],
    }
  }

  let recommendation
  let tone
  let reason
  if (mm >= RAIN.heavy) {
    recommendation = 'Do not irrigate'
    tone = 'orange'
    reason = `${Math.round(mm)} mm is forecast in the next 24 hours — well past what the soil can take up.`
  } else if (mm >= RAIN.light) {
    recommendation = 'Wait'
    tone = 'yellow'
    reason = `${Math.round(mm)} mm is expected within 24 hours. The rain will do the work.`
  } else if (soon != null && soon >= 20) {
    recommendation = 'Wait'
    tone = 'yellow'
    reason = `About ${Math.round(soon)} mm is expected over the next two days.`
  } else if ((current?.tempC ?? 0) >= 35 && mm < 5) {
    recommendation = 'Irrigate'
    tone = 'green'
    reason = `Little rain forecast and temperatures near ${Math.round(current.tempC)} °C.`
  } else {
    recommendation = 'Check the soil'
    tone = null
    reason = 'Rainfall alone does not settle this one — feel the soil at root depth before deciding.'
  }

  return {
    recommendation,
    band: mm >= RAIN.light ? 'Rain-limited' : 'Rainfall-based',
    tone,
    reason,
    confidence: mm >= RAIN.light || mm < 2 ? 'MEDIUM' : 'LOW',
    inputs: ['24 h rainfall', '48 h rainfall', 'air temperature'],
    // Naming what is missing is the point. A recommendation that hides its
    // gaps is the one a farmer would be wrong to trust.
    missing: ['soil type', 'crop stage', 'last irrigation date', 'soil moisture'],
  }
}

/** Today's actions, each tied to the figure that produced it. */
export function actions({ current, summary24h, daily, audience }) {
  const mm = summary24h?.rainMm ?? daily?.[0]?.mm ?? 0
  const wind = current?.windKmh ?? 0
  const gust = current?.gustKmh ?? wind
  const out = []

  if (audience === 'farm') {
    if (mm >= RAIN.light)
      out.push({ text: 'Cover harvested produce', why: `${Math.round(mm)} mm forecast in 24 h` })
    if (mm >= RAIN.light)
      out.push({ text: 'Check drainage on low-lying plots', why: 'Standing water after heavy rain' })
    if (mm < RAIN.light && wind <= WIND.breezy)
      out.push({ text: 'Spray window is open', why: `Winds ${Math.round(wind)} km/h, below the 20 km/h limit` })
    if (wind >= WIND.strong)
      out.push({ text: 'Do not spray today', why: `Winds ${Math.round(wind)} km/h — drift risk` })
    if (mm >= RAIN.light) out.push({ text: 'Delay irrigation', why: 'The soil will take up this rain' })
  } else {
    if (mm >= RAIN.light) out.push({ text: 'Avoid low-lying roads', why: `${Math.round(mm)} mm forecast in 24 h` })
    if (gust >= WIND.squall) out.push({ text: 'Secure loose items outdoors', why: `Gusts to ${Math.round(gust)} km/h` })
    if ((current?.rainProb ?? 0) >= 0.5)
      out.push({ text: 'Carry an umbrella', why: `${Math.round((current.rainProb || 0) * 100)}% chance of rain` })
    if ((current?.tempC ?? 0) >= 38)
      out.push({ text: 'Stay out of the midday sun', why: `${Math.round(current.tempC)} °C expected` })
  }

  // Never pad the list to look busy. An empty list is a real answer and gets
  // its own sentence in the interface.
  return out.slice(0, 4)
}

export { RAIN, WIND, clamp }
