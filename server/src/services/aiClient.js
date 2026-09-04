import { env } from '../config/env.js'
import { log } from '../utils/logger.js'

/**
 * Thin client for the Phase 3 Python service.
 *
 * If the service is down the API must still answer, so every call has a
 * documented degraded return rather than throwing — §10's "degrade to a very
 * good weather app" rule starts here.
 */
async function post(path, body, { timeoutMs = 8000 } = {}) {
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), timeoutMs)
  try {
    const res = await fetch(`${env.aiServiceUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctl.signal,
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } finally {
    clearTimeout(timer)
  }
}

export async function scoreRisk(payload) {
  try {
    return await post('/risk/score', payload)
  } catch (err) {
    log.warn('risk service unavailable', { error: String(err.message || err) })
    return null
  }
}

export async function scoreUncertainty(payload) {
  try {
    return await post('/uncertainty/score', payload)
  } catch (err) {
    log.warn('uncertainty service unavailable', { error: String(err.message || err) })
    return null
  }
}

/**
 * Question -> {intent, language, location, window, variables}.
 *
 * Degrades to a Node-side regex rather than to nothing: without a parse there
 * is no location and no window, and the whole turn fails. The fallback is
 * deliberately dumber than the Python engine — it only has to keep the product
 * answering while the service restarts.
 */
export async function parseNlu(text, defaultLanguage = null) {
  try {
    return await post('/nlu/parse', { text, default_language: defaultLanguage })
  } catch (err) {
    log.warn('nlu service unavailable, using local fallback', {
      error: String(err.message || err),
    })
    return localParse(text, defaultLanguage)
  }
}

export async function composeAnswer(context) {
  try {
    return await post('/compose/answer', context, { timeoutMs: 15000 })
  } catch (err) {
    log.warn('compose service unavailable', { error: String(err.message || err) })
    return null
  }
}

/** The minimum parse that keeps a turn answerable. Mirrors ai/app/engines/nlu.py. */
const HINGLISH_HINT =
  /\b(kal|aaj|barish|baarish|mausam|gaon|gaanv|hogi|hoga|kya|mere|mera|shaam|subah|kitna)\b/i

export function localParse(text, defaultLanguage = null) {
  const t = String(text || '')
  const language = /[ऀ-ॿ]/.test(t)
    ? 'hi'
    : HINGLISH_HINT.test(t)
      ? 'hinglish'
      : defaultLanguage && !t
        ? defaultLanguage
        : 'en'

  const lower = ` ${t.toLowerCase()} `
  const intent = /(warning|alert|चेतावनी)/.test(lower)
    ? 'warning_check'
    : /(should i|safe to|karun|चाहिए)/.test(lower)
      ? 'advice'
      : /(rain|barish|baarish|बारिश)/.test(lower)
        ? 'rain_forecast'
        : 'general'

  const dayOffset = /(tomorrow|kal|कल)/.test(lower) ? 1 : 0
  const evening = /(evening|shaam|sham|शाम)/.test(lower)
  const morning = /(morning|subah|सुबह)/.test(lower)

  return {
    intent,
    language,
    location: null,
    location_hint: /(my |mere |मेरे )/.test(lower) ? 'self' : null,
    window: {
      day_offset: dayOffset,
      from_hour: evening ? 16 : morning ? 5 : null,
      to_hour: evening ? 21 : morning ? 11 : null,
      label: `${dayOffset === 1 ? 'tomorrow' : 'today'}${evening ? ' evening' : morning ? ' morning' : ''}`,
    },
    variables: ['precipitation'],
    engine_version: 'node-fallback',
    degraded: true,
  }
}

export async function aiHealth() {
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), 3000)
  try {
    const res = await fetch(`${env.aiServiceUrl}/health`, { signal: ctl.signal })
    return res.ok ? { status: 'ok', ...(await res.json()) } : { status: 'down', code: res.status }
  } catch (err) {
    return { status: 'down', error: String(err.message || err) }
  } finally {
    clearTimeout(timer)
  }
}
