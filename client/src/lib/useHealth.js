import { useEffect, useState } from 'react'
import { api, LIVE } from './api'
import { SOURCES as SAMPLE_SOURCES } from './sampleData'

/**
 * Live source status from `GET /api/health`.
 *
 * This is the one screen where "degraded" is the *content*, not a failure mode:
 * the whole point of the panel is to say which upstream is unwell. So a failed
 * health check is itself rendered as a status rather than swallowed — an API we
 * cannot reach is reported as unreachable, not as silence.
 *
 * With no API configured at all it falls back to the bundled sample and says
 * so, exactly as the rest of the app does.
 */
export function useHealth({ refreshMs = 60000 } = {}) {
  const [state, setState] = useState({
    loading: LIVE,
    live: false,
    status: null,
    sources: LIVE ? [] : SAMPLE_SOURCES,
    error: null,
    checkedAt: null,
  })

  useEffect(() => {
    if (!LIVE) return undefined
    let cancelled = false

    async function load() {
      try {
        const res = await api.health()
        if (cancelled) return
        setState({
          loading: false,
          live: true,
          status: res.status,
          sources: (res.sources || []).map((s) => ({
            name: s.name,
            role: s.role,
            status: s.status,
            issuedAt: s.lastIngestAt || res.checkedAt,
            detail:
              s.activeCount != null
                ? `${s.activeCount} active`
                : s.count != null
                  ? `${s.count} rows`
                  : s.models
                    ? `${s.models.length} models`
                    : null,
          })),
          error: null,
          checkedAt: res.checkedAt,
        })
      } catch (err) {
        if (cancelled) return
        // The API being unreachable IS a source status. Show it as one.
        setState((s) => ({
          ...s,
          loading: false,
          live: false,
          status: 'down',
          error: String(err?.message || err),
          sources: [
            { name: 'WeatherGPT API', role: 'backend', status: 'down', issuedAt: null },
          ],
        }))
      }
    }

    load()
    const timer = setInterval(load, refreshMs)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [refreshMs])

  return state
}

export default useHealth
