/**
 * API client.
 *
 * `VITE_API_URL` decides everything: set it and the app talks to the Phase 2
 * server; leave it unset and the app runs entirely on the Phase 1 mock data.
 * That is what lets the UI be demoed on a laptop with no backend at all.
 */
export const API_URL = (import.meta.env?.VITE_API_URL || '').replace(/\/$/, '')
export const LIVE = Boolean(API_URL)

class ApiError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

async function req(path, { method = 'GET', body, token, timeoutMs = 25000 } = {}) {
  if (!API_URL) throw new ApiError(0, 'No API configured')
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), timeoutMs)
  try {
    const res = await fetch(`${API_URL}${path}`, {
      method,
      signal: ctl.signal,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new ApiError(res.status, data.error || `Request failed (${res.status})`)
    return data
  } finally {
    clearTimeout(timer)
  }
}

const qs = (params) =>
  '?' + new URLSearchParams(Object.entries(params).filter(([, v]) => v != null && v !== '')).toString()

export const api = {
  health: () => req('/api/health'),

  /** The Today screen: forecast + warnings + risk + confidence in one call. */
  assess: (where) => req('/api/assess' + qs(where)),

  /**
   * One conversational turn. The server owns the whole pipeline — NLU,
   * location, forecast, warnings, risk, confidence, compose — and returns all
   * of it, so a failure in any single layer still renders the rest.
   *
   * Longer timeout than the rest: this route fans out to three upstreams and
   * may call a language model.
   */
  chat: (body, token) =>
    req('/api/chat/query', { method: 'POST', body, token, timeoutMs: 30000 }),

  forecast: (where) => req('/api/weather/forecast' + qs({ ...where, days: 7 })),
  current: (where) => req('/api/weather/current' + qs(where)),
  ensemble: (where) => req('/api/weather/ensemble' + qs(where)),

  activeWarnings: (where) => req('/api/warnings/active' + qs(where)),
  warning: (identifier) => req(`/api/warnings/${encodeURIComponent(identifier)}`),
  recentWarnings: () => req('/api/warnings/recent'),

  searchLocations: (q) => req('/api/locations/search' + qs({ q })),

  /* --- saved locations and alert subscriptions (auth required) --------- */
  subscriptions: (token) => req('/api/alerts/subscriptions', { token }),
  subscribe: (body, token) =>
    req('/api/alerts/subscriptions', { method: 'POST', body, token }),
  unsubscribe: (id, token) =>
    req(`/api/alerts/subscriptions/${encodeURIComponent(id)}`, { method: 'DELETE', token }),
  /** Register a browser push endpoint against the signed-in user. */
  registerPush: (subscription, token) =>
    req('/api/alerts/push', { method: 'POST', body: { subscription }, token }),
  vapidKey: () => req('/api/alerts/vapid-key'),
  reverse: (lat, lon) => req('/api/locations/reverse' + qs({ lat, lon })),

  login: (email, password) => req('/api/auth/login', { method: 'POST', body: { email, password } }),
  register: (payload) => req('/api/auth/register', { method: 'POST', body: payload }),
  me: (token) => req('/api/auth/me', { token }),
}
