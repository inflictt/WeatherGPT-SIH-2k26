import { env } from '../config/env.js'
import { log } from './logger.js'
import { upstream } from './AppError.js'

/**
 * fetch with a timeout, a descriptive User-Agent (Nominatim requires one) and
 * one retry on a transient failure. Node 18+ has fetch built in — no dependency.
 */
export async function getJson(url, { timeoutMs = 12000, retries = 1, headers } = {}) {
  return request(url, { timeoutMs, retries, headers, parse: 'json' })
}

export async function getText(url, { timeoutMs = 15000, retries = 1, headers } = {}) {
  return request(url, { timeoutMs, retries, headers, parse: 'text' })
}

async function request(url, { timeoutMs, retries, headers, parse }) {
  let lastErr
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const ctl = new AbortController()
    const timer = setTimeout(() => ctl.abort(), timeoutMs)
    try {
      const res = await fetch(url, {
        signal: ctl.signal,
        headers: { 'User-Agent': env.userAgent, Accept: '*/*', ...headers },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return parse === 'json' ? await res.json() : await res.text()
    } catch (err) {
      lastErr = err
      log.warn('upstream request failed', { url: short(url), attempt, error: String(err.message || err) })
      if (attempt < retries) await sleep(400 * (attempt + 1))
    } finally {
      clearTimeout(timer)
    }
  }
  throw upstream(`Upstream request failed: ${short(url)}`, { cause: String(lastErr?.message || lastErr) })
}

const short = (u) => String(u).slice(0, 120)
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
