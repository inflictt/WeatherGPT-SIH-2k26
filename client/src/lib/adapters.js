/**
 * API response -> the shapes the components already render.
 *
 * This module is the seam. When the backend contract changes, this file
 * changes and no component does.
 */
import { SEVERITY } from './constants.js'

const CAP_COLOUR = { Extreme: 'red', Severe: 'orange', Moderate: 'yellow', Minor: 'yellow' }

export function adaptLocation(loc) {
  if (!loc) return null
  return {
    id: loc.id || loc._id || `${loc.lat},${loc.lon}`,
    name: loc.name,
    district: loc.district,
    state: loc.state,
    lat: loc.lat,
    lon: loc.lon,
    kind: loc.kind,
  }
}

export function adaptCurrent(current, checkedAt) {
  if (!current) return null
  return {
    observedAt: current.time || checkedAt,
    tempC: round(current.tempC),
    feelsLikeC: round(current.feelsLikeC),
    condition: current.condition || '—',
    rainProb: current.rainProb ?? null,
    humidity: round(current.humidity),
    windKmh: round(current.windKmh),
    windDir: degToCompass(current.windDirDeg),
    gustKmh: round(current.gustKmh),
    visibilityKm: current.visibilityM != null ? Number((current.visibilityM / 1000).toFixed(1)) : null,
    pressureHpa: round(current.pressureHpa),
    uv: current.uv ?? null,
    sunrise: current.sunrise ?? null,
    sunset: current.sunset ?? null,
  }
}

/**
 * 24 hours, not 12: the chart can show a full day and the strip only ever
 * showed half of one. Wind is carried through because the forecast panel
 * charts it — it was dropped here, so the wind tab would have been silently
 * empty, which is the kind of bug that looks like "no wind today".
 */
export function adaptHourly(hourly = [], limit = 24) {
  return hourly.slice(0, limit).map((h) => ({
    t: h.time,
    tempC: round(h.tempC),
    mm: Number((h.precipMm ?? 0).toFixed(1)),
    prob: h.precipProb != null ? h.precipProb / 100 : null,
    windKmh: round(h.windKmh),
    gustKmh: round(h.gustKmh),
  }))
}

export function adaptDaily(daily = []) {
  const today = new Date().toDateString()
  return daily.map((d) => {
    const date = new Date(d.date)
    return {
      day: date.toDateString() === today ? 'Today' : date.toLocaleDateString('en-IN', { weekday: 'short' }),
      date: date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      min: round(d.tempMinC),
      max: round(d.tempMaxC),
      mm: Math.round(d.precipMm ?? 0),
      prob: d.precipProbMax != null ? d.precipProbMax / 100 : null,
      tone: rainTone(d.precipMm ?? 0),
      summary: d.condition || '—',
    }
  })
}

/** IMD 24-hour rainfall categories — the same ladder the risk engine uses. */
export function rainTone(mm) {
  if (mm >= 204.5) return 'red'
  if (mm >= 115.6) return 'orange'
  if (mm >= 64.5) return 'yellow'
  return 'green'
}

export function adaptWarning(w) {
  if (!w) return null
  return {
    identifier: w.identifier,
    sender: w.senderName || w.sender,
    event: w.event,
    severity: w.severity,
    colour: w.colour || CAP_COLOUR[w.severity] || 'yellow',
    area: {
      description: w.area?.description || (w.area?.districts || []).join(', '),
      state: w.area?.state,
    },
    sent: w.sent,
    effective: w.effective,
    expires: w.expires,
    headline: w.headline,
    description: w.description,
    instruction: w.instruction,
    sourceUrl: w.sourceUrl,
    status: w.status === 'active' && (!w.expires || new Date(w.expires) > new Date()) ? 'active' : 'expired',
  }
}

export function adaptRisk(risk) {
  if (!risk) return null
  return {
    overall: risk.overall,
    score: risk.score,
    computedBand: risk.computed_band,
    flooredBy: risk.floored_by
      ? { colour: risk.floored_by.colour, minimum: risk.floored_by.minimum }
      : null,
    hazardFloor: risk.hazard_floor || null,
    breakdown: (risk.breakdown || []).map((c) => ({
      key: c.key,
      label: c.label,
      band: c.band,
      weight: c.weight,
      note: c.note,
    })),
    derived: risk.derived || {},
    notes: risk.notes || [],
  }
}

export function adaptConfidence(conf) {
  if (!conf) return null
  return {
    level: conf.level,
    spread: conf.spread,
    leadHours: conf.lead_hours,
    bandAgreement: conf.band_agreement,
    reasons: conf.reasons || [],
    models: (conf.models || []).map((m) => ({ name: m.name, mm: Math.round(m.rain_24h_mm) })),
  }
}

export function adaptSources(sources = [], checkedAt) {
  return sources.map((s) => ({
    name: s.name,
    role: s.role,
    issuedAt: s.fetchedAt || checkedAt,
    status: s.status || 'ok',
  }))
}

/**
 * One conversational turn → the shape a message renders from.
 *
 * The seam earns its keep here. The composer speaks §10's contract
 * (`recommendedActions`, `warningMessage`), the message component has always
 * rendered `actions` and a warning block — this maps one to the other so
 * neither has to move.
 *
 * The important line is `warning`. The turn carries the resolved warning
 * *object*, not just an identifier: a question about a different district would
 * otherwise reference a warning the Today screen never loaded, the lookup would
 * silently miss, and the banner would vanish — breaking the one invariant that
 * matters most, in exactly the demo moment where a judge names a new district.
 */
export function adaptAnswer(res) {
  if (!res) return null
  const a = res.answer
  const warning = res.highestWarning ? adaptWarning(res.highestWarning) : null

  return {
    id: `a${Date.now()}`,
    role: 'assistant',
    lang: a?.language || 'en',
    intent: res.intent || a?.intent || null,

    // prose
    summary: a?.summary ?? null,
    gloss: a?.gloss ?? null,
    speech: a?.speech ?? a?.summary ?? null,
    warningMessage: a?.warningMessage ?? null,
    riskExplanation: a?.riskExplanation ?? null,
    uncertaintyExplanation: a?.uncertaintyExplanation ?? null,
    actions: a?.recommendedActions ?? [],
    actionsGloss: a?.actionsGloss ?? [],

    // structure — only present when relevant
    warning,
    warningRef: a?.warningRef ?? warning?.identifier ?? null,
    officialText: a?.officialText ?? null,
    riskBand: a?.riskBand ?? res.risk?.overall ?? null,
    riskScore: res.risk?.score ?? null,
    flooredBy: a?.flooredBy ?? res.risk?.floored_by ?? null,
    confidence: a?.confidenceLevel ?? res.confidence?.level ?? null,
    confidenceReasons: res.confidence?.reasons ?? [],
    location: res.location ? adaptLocation(res.location) : null,
    unresolved: res.unresolved ?? null,
    forecast: res.forecast ?? null,
    sources: Array.isArray(a?.sources)
      ? a.sources
      : Array.isArray(res.sources)
        ? res.sources.map((s) => s.name || s).filter(Boolean)
        : [],

    // provenance: which layers actually answered
    composer: res.composer ?? a?.composer ?? 'deterministic',
    grounded: Boolean(a?.grounded ?? true),
    checkedAt: res.checkedAt || new Date().toISOString(),
  }
}

/** The whole Today payload, in one place. */
export function adaptAssessment(res) {
  const warnings = (res.warnings || []).map(adaptWarning)
  const a = res.answer
  return {
    // Advice comes from the composer, conditioned on the real numbers and the
    // chosen persona. Null when the engine is unreachable, which is why the
    // card renders its own empty state rather than a stale list.
    advice: a
      ? {
          actions: a.recommendedActions || [],
          actionsGloss: a.actionsGloss || [],
          warningMessage: a.warningMessage ?? null,
          riskExplanation: a.riskExplanation ?? null,
          uncertaintyExplanation: a.uncertaintyExplanation ?? null,
          language: a.language || 'en',
          composer: a.composer ?? null,
        }
      : null,
    location: adaptLocation(res.location),
    current: adaptCurrent(res.current, res.checkedAt),
    // The 24-hour aggregate the risk engine was scored on. StatusTiles reads
    // it, so the "umbrella / outdoors" verdicts come from the same figures the
    // risk band did rather than from a second, drifting calculation.
    summary24h: res.summary24h || null,
    warnings,
    risk: adaptRisk(res.risk),
    confidence: adaptConfidence(res.confidence),
    sources: adaptSources(res.sources, res.checkedAt),
    degraded: Boolean(res.degraded),
    checkedAt: res.checkedAt,
  }
}

const round = (n) => (n == null ? null : Math.round(n))

function degToCompass(deg) {
  if (deg == null) return ''
  const points = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']
  return points[Math.round(deg / 22.5) % 16]
}

export const toneFor = (colour) => SEVERITY[colour] || SEVERITY.green
