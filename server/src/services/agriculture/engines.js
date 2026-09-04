import { env } from '../../config/env.js'
import { log } from '../../utils/logger.js'

/**
 * Client for the Python agriculture engines.
 *
 * Same contract as `aiClient.js`: every call has a documented degraded return
 * rather than throwing, because the API must still answer when the engine is
 * down. The difference between "the engine said LOW" and "the engine did not
 * answer" is preserved all the way to the interface — a null is never
 * flattened into a reassuring default here.
 */
async function call(path, body, { method = 'POST', timeoutMs = 6000 } = {}) {
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), timeoutMs)
  try {
    const res = await fetch(`${env.aiServiceUrl}${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: ctl.signal,
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } finally {
    clearTimeout(timer)
  }
}

const degraded = (name) => (err) => {
  log.warn(`agriculture engine unavailable: ${name}`, { error: String(err?.message || err) })
  return null
}

export const irrigation = (payload) =>
  call('/agriculture/irrigation', payload).catch(degraded('irrigation'))

export const farmRisk = (payload) =>
  call('/agriculture/risk', payload).catch(degraded('risk'))

export const diseaseRisk = (payload) =>
  call('/agriculture/disease/risk', payload).catch(degraded('disease'))

export const cropCalendar = (crop, sownAt) =>
  call(
    `/agriculture/crop/${encodeURIComponent(crop)}${sownAt ? `?sown_at=${encodeURIComponent(sownAt)}` : ''}`,
    null,
    { method: 'GET' },
  ).catch(degraded('crop calendar'))

export const crops = () =>
  call('/agriculture/crops', null, { method: 'GET' }).catch(degraded('crops'))

export const context = (payload) =>
  call('/agriculture/context', payload, { timeoutMs: 8000 }).catch(degraded('context'))

export default { irrigation, farmRisk, diseaseRisk, cropCalendar, crops, context }
