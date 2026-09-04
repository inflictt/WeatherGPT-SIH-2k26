import {
  fetchForecast,
  fetchEnsemble,
  totalsFor24h,
  antecedentRainfall,
  describeCode,
} from './openMeteo.js'
import { warningsForPoint, highest } from './capIngest.js'
import { resolveLocation } from './gazetteer.js'
import { parseNlu, composeAnswer, scoreRisk, scoreUncertainty } from './aiClient.js'
import { log } from '../utils/logger.js'

/**
 * The conversational pipeline — §5 of the PRD, in order.
 *
 *   parse -> resolve location -> fetch (forecast ‖ warnings) -> risk ->
 *   confidence -> compose -> render
 *
 * Two properties matter more than anything else here.
 *
 * **Every step degrades on its own.** NLU down falls back to a regex; the risk
 * engine down returns `risk: null` and the cards still render; compose down
 * returns the structured context with `answer: null`. There is no step whose
 * failure produces a blank screen, because §10 requires the product to degrade
 * to a very good weather app rather than to nothing.
 *
 * **Nothing downstream may soften anything upstream.** The composer receives
 * the risk band the engine computed — including the safety floor — and can only
 * phrase it. Official CAP text travels through untouched and is rendered from
 * its own field.
 *
 * Dependencies are injected with defaults so the ordering, the degradation and
 * the follow-up behaviour can be tested without a database or a live network.
 */

const DEPS = {
  parseNlu,
  resolveLocation,
  fetchForecast,
  fetchEnsemble,
  warningsForPoint,
  scoreRisk,
  scoreUncertainty,
  composeAnswer,
}

const round1 = (n) => (n == null ? null : Number(Number(n).toFixed(1)))

/**
 * Which place the question is about.
 *
 * Order is deliberate: an explicitly named place always wins, because "will it
 * rain in Jaipur" must not be answered about the user's saved village. Only
 * when no place is named do we fall back to the previous turn — which is what
 * makes "what about tomorrow evening?" work — and then to coordinates.
 */
export async function resolveForQuestion(nlu, ctx, deps = DEPS) {
  const { lat, lon, q, history = [] } = ctx

  if (nlu.location) {
    const found = await deps.resolveLocation({ q: nlu.location })
    if (found) return { ...found, resolvedFrom: 'question' }
    // A named place we cannot find is a dead end, not an excuse to answer
    // about somewhere else. §10: say so rather than guess.
    return null
  }

  const previous = [...history].reverse().find((h) => h && h.location)
  if (previous) return { ...previous.location, resolvedFrom: 'previous-turn' }

  if (q && q !== 'Selected location') {
    const found = await deps.resolveLocation({ q, lat, lon })
    if (found) return { ...found, resolvedFrom: 'saved' }
  }

  if (Number.isFinite(lat) && Number.isFinite(lon)) {
    const found = await deps.resolveLocation({ lat, lon, q })
    if (found) return { ...found, resolvedFrom: 'coordinates' }
  }

  return null
}

/**
 * Collapse the requested window into the handful of figures the engines take.
 *
 * The NLU returns a *relative* window; the clock and the timezone live here,
 * which is the whole reason the parser refuses to return a timestamp.
 */
export function windowFor(hourly, nluWindow, now = new Date()) {
  const offset = nluWindow?.day_offset ?? 0
  const from = new Date(now)
  from.setDate(from.getDate() + offset)

  if (nluWindow?.from_hour != null) from.setHours(nluWindow.from_hour, 0, 0, 0)
  else if (offset > 0) from.setHours(0, 0, 0, 0)

  const to = new Date(from)
  if (nluWindow?.to_hour != null) to.setHours(nluWindow.to_hour, 0, 0, 0)
  else to.setTime(from.getTime() + 24 * 3600e3)

  // Never look backwards: a window that has already passed is answered from
  // now forward, not with history the user did not ask for.
  const start = Math.max(from.getTime(), now.getTime())
  const end = Math.max(to.getTime(), start + 3600e3)

  const rows = (hourly || []).filter((h) => {
    const t = new Date(h.time).getTime()
    return t >= start && t < end
  })

  const rainMm = rows.reduce((s, h) => s + (h.precipMm || 0), 0)
  const probs = rows.map((h) => h.precipProb).filter((p) => p != null)
  const temps = rows.map((h) => h.tempC).filter((t) => t != null)

  let peak = null
  if (rows.length >= 3) {
    let best = -1
    let at = 0
    for (let i = 0; i + 3 <= rows.length; i += 1) {
      const sum = rows.slice(i, i + 3).reduce((s, h) => s + (h.precipMm || 0), 0)
      if (sum > best) {
        best = sum
        at = i
      }
    }
    if (best > 1) {
      const hh = (iso) => new Date(iso).toTimeString().slice(0, 5)
      peak = `${hh(rows[at].time)}-${hh(rows[Math.min(at + 3, rows.length - 1)].time)}`
    }
  }

  return {
    rows,
    start: new Date(start),
    end: new Date(end),
    leadHours: Math.max(0, Math.round((start - now.getTime()) / 3600e3)),
    forecast: {
      rain_mm: round1(rainMm),
      prob: probs.length ? Math.max(...probs) / 100 : null,
      peak,
      wind_kmh: rows.length ? round1(Math.max(...rows.map((h) => h.windKmh || 0))) : null,
      gust_kmh: rows.length ? round1(Math.max(...rows.map((h) => h.gustKmh || 0))) : null,
      tmax: temps.length ? Math.round(Math.max(...temps)) : null,
      tmin: temps.length ? Math.round(Math.min(...temps)) : null,
    },
  }
}

/** One conversational turn, from raw text to a renderable answer. */
export async function answerQuestion(input, deps = DEPS) {
  const {
    text = '',
    lang = null,
    persona = 'general',
    lat,
    lon,
    q,
    history = [],
    now = new Date(),
  } = input

  // 1 — parse
  const nlu = await deps.parseNlu(text, lang)

  // 2 — resolve
  const location = await resolveForQuestion(nlu, { lat, lon, q, history }, deps)
  if (!location) {
    // §10: missing data produces "I don't know", never an estimate. A turn we
    // cannot place is still a well-formed turn — it just says so.
    return {
      nlu,
      location: null,
      unresolved: nlu.location || null,
      forecast: null,
      warnings: [],
      highestWarning: null,
      risk: null,
      confidence: null,
      answer: null,
      sources: [],
      degraded: true,
      checkedAt: now.toISOString(),
    }
  }

  // 3 — fetch. Warnings run *alongside* the forecast, never after it, so a slow
  // forecast can never delay a warning the user needs to see.
  const [forecast, ensemble, warnings] = await Promise.all([
    deps.fetchForecast(location.lat, location.lon, { days: 7 }).catch((err) => {
      log.warn('forecast unavailable', { error: String(err.message || err) })
      return null
    }),
    deps.fetchEnsemble(location.lat, location.lon, { days: 3 }).catch(() => null),
    deps
      .warningsForPoint({
        lat: location.lat,
        lon: location.lon,
        district: location.district,
        state: location.state,
      })
      .catch(() => []),
  ])

  // An expired warning is never presented as active — checked against the
  // clock at read time, not just the stored flag (invariant 3).
  const live = (warnings || []).filter(
    (w) => w.status === 'active' && (!w.expires || new Date(w.expires) > now),
  )
  const top = highest(live)

  const win = forecast ? windowFor(forecast.hourly, nlu.window, now) : null

  // 4 — risk
  const riskPayload = forecast
    ? {
        location: {
          name: location.name,
          district: location.district,
          state: location.state,
          lat: location.lat,
          lon: location.lon,
          zone: location.zone || 'plains',
          urban_flood_prone: Boolean(location.urbanFloodProne),
        },
        forecast: {
          rain_24h_mm: win.forecast.rain_mm,
          rain_probability: win.forecast.prob,
          wind_kmh: win.forecast.wind_kmh,
          gust_kmh: win.forecast.gust_kmh,
          temp_max_c: win.forecast.tmax,
          temp_min_c: win.forecast.tmin,
          rain_duration_hours: win.rows.filter((h) => (h.precipMm || 0) >= 0.5).length,
        },
        antecedent: { rain_72h_mm: antecedentRainfall(forecast, 72) },
        warnings: live.map((w) => ({
          identifier: w.identifier,
          event: w.event,
          severity: w.severity,
          colour: w.colour,
          expires: w.expires,
        })),
      }
    : null

  const models = ensemble ? totalsFor24h(ensemble, (win?.start || now).toISOString()) : []

  // 5 & 6 — risk and confidence, in parallel; neither depends on the other.
  const [risk, confidence] = await Promise.all([
    riskPayload ? deps.scoreRisk(riskPayload) : Promise.resolve(null),
    models.length >= 2
      ? deps.scoreUncertainty({
          models: models.map((m) => ({ name: m.model, rain_24h_mm: m.mm })),
          lead_hours: win?.leadHours ?? 12,
          probability: win?.forecast.prob ?? null,
        })
      : Promise.resolve(null),
  ])

  const sources = [
    ...(forecast ? [{ name: 'Open-Meteo', role: 'forecast', fetchedAt: forecast.fetchedAt }] : []),
    ...(live.length ? [{ name: 'NDMA Sachet (CAP)', role: 'warnings', count: live.length }] : []),
  ]

  // 7 — compose. The context is entirely fetched or computed; nothing in it
  // originates with a language model.
  const effectivePersona = nlu.persona && nlu.persona !== 'general' ? nlu.persona : (persona || 'general')
  const effectiveLanguage = nlu.language || lang || 'en'

  const answer = await deps.composeAnswer({
    question: text,
    intent: nlu.intent,
    language: effectiveLanguage,
    persona: effectivePersona,
    location: {
      name: location.name,
      district: location.district,
      state: location.state,
    },
    window: nlu.window,
    forecast: win ? win.forecast : null,
    warnings: live.map((w) => ({
      identifier: w.identifier,
      event: w.event,
      severity: w.severity,
      colour: w.colour,
      headline: w.headline,
      description: w.description,
      instruction: w.instruction,
      senderName: w.senderName || w.sender,
      expires: w.expires,
    })),
    risk,
    confidence,
    sources,
  })

  return {
    nlu,
    location,
    window: win ? { from: win.start.toISOString(), to: win.end.toISOString(), label: nlu.window?.label } : null,
    current: forecast
      ? { ...forecast.current, condition: describeCode(forecast.current.weatherCode) }
      : null,
    forecast: win ? win.forecast : null,
    warnings: live,
    highestWarning: top,
    risk,
    confidence,
    models,
    answer,
    sources,
    // "degraded" means some layer is missing, not that the answer is wrong.
    degraded: !forecast || !risk || !answer,
    checkedAt: now.toISOString(),
  }
}
