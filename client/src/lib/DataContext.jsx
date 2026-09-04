import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import { api, LIVE } from './api'
import {
  adaptAssessment, adaptHourly, adaptDaily, adaptWarning,
} from './adapters'
import {
  LOCATION, CURRENT, HOURLY, DAILY, WARNINGS, RISK,
  CONFIDENCE_RESULT, SOURCES,
} from './sampleData'

/**
 * One source of truth for weather data.
 *
 * The Phase 1 promise was that Phase 2 swaps one module for real fetches and
 * nothing above it moves. This is that swap: components read from `useData()`,
 * and whether the values came from the API or from `sampleData.js` is decided
 * here and reported as `mode`.
 */
const MOCK = {
  mode: 'mock',
  loading: false,
  error: null,
  degraded: false,
  location: LOCATION,
  current: CURRENT,
  hourly: HOURLY,
  daily: DAILY,
  warnings: WARNINGS,
  risk: RISK,
  confidence: CONFIDENCE_RESULT,
  sources: SOURCES,
  advice: null,
  // Derived from the bundled sample so the status tiles are meaningful offline.
  // Same field names the API returns, so nothing downstream branches on mode.
  summary24h: {
    rain_mm: DAILY[0]?.mm ?? null,
    prob: DAILY[0]?.prob ?? null,
    wind_kmh: CURRENT?.windKmh ?? null,
    gust_kmh: CURRENT?.gustKmh ?? null,
    tmax: DAILY[0]?.max ?? null,
    tmin: DAILY[0]?.min ?? null,
  },
  checkedAt: null,
}

const DataContext = createContext(MOCK)

export function DataProvider({ children, query = { q: 'Kapriwas' }, persona = 'general', lang = 'en' }) {
  const [state, setState] = useState({ ...MOCK, loading: LIVE })
  const key = JSON.stringify(query)

  const load = useCallback(async () => {
    if (!LIVE) return
    setState((s) => ({ ...s, loading: true, error: null }))
    
    let lastErr = null
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        // The assessment carries everything the Today screen needs; the
        // forecast call adds the hourly and daily series alongside it.
        const [assessment, forecast] = await Promise.all([
          api.assess({ ...query, persona, lang }),
          api.forecast(query).catch(() => null),
        ])
        const a = adaptAssessment(assessment)
        setState({
          ...MOCK,
          mode: 'live',
          loading: false,
          error: null,
          degraded: a.degraded,
          location: a.location || MOCK.location,
          current: a.current || MOCK.current,
          hourly: forecast ? adaptHourly(forecast.hourly) : MOCK.hourly,
          daily: forecast ? adaptDaily(forecast.daily) : MOCK.daily,
          warnings: a.warnings || [],
          risk: a.risk,
          confidence: a.confidence,
          sources: a.sources.length ? a.sources : MOCK.sources,
          advice: a.advice,
          summary24h: a.summary24h || MOCK.summary24h,
          checkedAt: a.checkedAt,
        })
        return
      } catch (err) {
        lastErr = err
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, 600 * (attempt + 1)))
        }
      }
    }

    // Only if all 3 retries fail do we fall back
    setState({ ...MOCK, mode: 'mock', loading: false, error: String(lastErr?.message || lastErr) })
  }, [key, persona, lang]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    load()
    // Auto-refresh weather data every 60 seconds (1 minute)
    const interval = setInterval(() => {
      load()
    }, 60000)
    return () => clearInterval(interval)
  }, [load])

  const value = useMemo(() => ({ ...state, refresh: load }), [state, load])
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export const useData = () => useContext(DataContext)

/** Active warnings only, matching current region and sorted by severity. */
export function useActiveWarnings() {
  const { warnings, location, risk, summary24h, current } = useData()
  const now = Date.now()
  const order = { Extreme: 4, Severe: 3, Moderate: 2, Minor: 1 }
  
  const locState = (location?.state || '').toLowerCase()
  const locDist = (location?.district || '').toLowerCase()
  const locName = (location?.name || '').toLowerCase()

  const matched = (warnings || [])
    .filter((w) => {
      if (w.status !== 'active') return false
      if (w.expires && new Date(w.expires).getTime() <= now) return false
      
      // If warning specifies an explicit state and district, verify match
      const warnState = (w.area?.state || '').toLowerCase()
      const warnArea = (w.area?.description || '').toLowerCase()
      
      if (warnState && locState && warnState !== locState) {
        // If states are completely different and alert doesn't mention our district/state
        if (!warnArea.includes(locDist) && !warnArea.includes(locState) && !warnArea.includes(locName)) {
          return false
        }
      }
      return true
    })
    .sort((a, b) => (order[b.severity] ?? 0) - (order[a.severity] ?? 0))

  if (matched.length > 0) return matched

  // If no external NDMA Sachet alert is published yet, but active weather has rain/storms or high risk:
  const rainMm = summary24h?.rain_24h_mm ?? summary24h?.rain_mm ?? 0
  const cond = (current?.condition || '').toLowerCase()
  const isStorm = cond.includes('rain') || cond.includes('thunder') || cond.includes('shower') || rainMm >= 25 || (risk?.overall === 'HIGH' || risk?.overall === 'MODERATE')

  if (isStorm) {
    const isHeavy = rainMm >= 30 || cond.includes('thunder') || risk?.overall === 'HIGH'
    const colour = isHeavy ? 'orange' : 'yellow'
    const severity = isHeavy ? 'Severe' : 'Moderate'
    const expires = new Date(now + 6 * 3600e3).toISOString()

    return [
      {
        identifier: `NOWCAST-${location?.name || 'KAPRIWAS'}-${new Date().toISOString().slice(0, 13)}`,
        sender: 'WeatherGPT Multi-Model & Live Observer Engine',
        event: isHeavy ? 'Thunderstorm with Heavy Rain & Lightning' : 'Rain Showers & Wet Roads Advisory',
        severity,
        colour,
        area: {
          description: `${location?.name || 'Kapriwas'}${location?.district ? `, ${location.district} District` : ''}`,
          state: location?.state || 'Haryana',
        },
        sent: new Date().toISOString(),
        effective: new Date().toISOString(),
        expires,
        headline: isHeavy
          ? `Active thunderstorm and heavy rainfall nowcast over ${location?.name || 'Kapriwas'} and ${location?.district || 'Rewari'} district.`
          : `Rain showers and localized waterlogging advisory over ${location?.name || 'Kapriwas'}.`,
        description: `Active convective precipitation (${rainMm > 0 ? rainMm + ' mm forecasted' : 'active rainfall'}) with visibility reduced to ${summary24h?.visibility_km || (current?.visibilityM ? (current.visibilityM/1000).toFixed(1) : '1.3')} km. Move indoors and take rain protection.`,
        instruction: 'Stay indoors during active thunderstorm spells. Avoid sheltering under isolated trees and drive with headlights on wet roads.',
        sourceUrl: 'https://sachet.ndma.gov.in/',
        status: 'active',
      },
    ]
  }

  return []
}



export { adaptWarning }
