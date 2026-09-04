import { useCallback, useEffect, useRef, useState } from 'react'
import { api, LIVE } from './api'
import { LOCATION as SAMPLE_LOCATION } from './sampleData'

/**
 * Which place the app is showing, and how you change it.
 *
 * Until now `DataProvider` had `{ q: 'Udaipur' }` hardcoded and nothing could
 * move it — which quietly broke the demo's most important moment, where a judge
 * names any district and the whole screen follows. This is that seam.
 *
 * Three ways in, in the order people actually reach for them:
 *
 *   search    type a village, town or district; the gazetteer answers first and
 *             a geocoder only covers what it has not seeded
 *   GPS       one tap, and the nearest seeded place is resolved from the fix
 *   recents   because people check the same two or three places forever
 *
 * The chosen place is persisted, so reopening the app does not dump someone
 * back in Udaipur.
 */

const KEY = 'wg-location'
const RECENTS_KEY = 'wg-recent-locations'
const MAX_RECENTS = 6

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* private mode or quota — the session still works in memory */
  }
}

/** Everything the rest of the app needs to identify a place. */
function normalise(row) {
  if (!row) return null
  return {
    id: row.id || row._id || `${row.lat},${row.lon}`,
    name: row.name,
    district: row.district,
    state: row.state,
    lat: row.lat,
    lon: row.lon,
    kind: row.kind,
    source: row.source,
  }
}

export function useLocationPicker() {
  const [location, setLocationState] = useState(
    () => readJson(KEY, null) || normalise(SAMPLE_LOCATION),
  )
  const [recents, setRecents] = useState(() => readJson(RECENTS_KEY, []))

  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)

  // GPS is a permission prompt, so its states are named rather than boolean:
  // "idle" and "denied" need different words on screen.
  const [gps, setGps] = useState('idle') // idle | locating | denied | unsupported | failed
  const [error, setError] = useState(null)

  const debounce = useRef(null)
  const seq = useRef(0)

  const select = useCallback((row) => {
    const next = normalise(row)
    if (!next) return
    setLocationState(next)
    writeJson(KEY, next)
    setRecents((prev) => {
      const deduped = [next, ...prev.filter((r) => r.id !== next.id)].slice(0, MAX_RECENTS)
      writeJson(RECENTS_KEY, deduped)
      return deduped
    })
    setQuery('')
    setResults([])
  }, [])

  // --- search -----------------------------------------------------------
  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setResults([])
      setSearching(false)
      return undefined
    }
    if (!LIVE) {
      // No API: say so rather than showing an empty list that looks like
      // "no such place".
      setResults([])
      setError('no-api')
      return undefined
    }

    setSearching(true)
    setError(null)
    clearTimeout(debounce.current)

    // 120 ms: feels immediate and instant with fast local + Open-Meteo geocoding
    debounce.current = setTimeout(async () => {
      const mine = ++seq.current
      try {
        const res = await api.searchLocations(q)
        if (mine !== seq.current) return // a later keystroke already won
        setResults((res.results || []).map(normalise))
      } catch (err) {
        if (mine !== seq.current) return
        setResults([])
        setError(String(err?.message || err))
      } finally {
        if (mine === seq.current) setSearching(false)
      }
    }, 120)

    return () => clearTimeout(debounce.current)
  }, [query])

  // --- GPS --------------------------------------------------------------
  const useMyLocation = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGps('unsupported')
      return
    }
    setGps('locating')
    setError(null)

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const { latitude: lat, longitude: lon } = coords
        try {
          if (LIVE) {
            // Resolve the fix to a named place, so the interface can say
            // "Bhinder" rather than a pair of decimals nobody recognises.
            const res = await api.reverse(lat, lon)
            select(res.location || { name: 'My location', lat, lon })
          } else {
            select({ name: 'My location', lat, lon, source: 'gps' })
          }
          setGps('idle')
        } catch {
          select({ name: 'My location', lat, lon, source: 'gps' })
          setGps('idle')
        }
      },
      (err) => {
        // PERMISSION_DENIED is 1. The others are position-unavailable and
        // timeout, which are the same thing to a user: try again or type it.
        setGps(err?.code === 1 ? 'denied' : 'failed')
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 },
    )
  }, [select])

  const clearRecents = useCallback(() => {
    setRecents([])
    writeJson(RECENTS_KEY, [])
  }, [])

  return {
    location,
    select,
    query,
    setQuery,
    results,
    searching,
    recents,
    clearRecents,
    useMyLocation,
    gps,
    error,
    /** What DataProvider fetches with. Coordinates win; they are unambiguous. */
    asQuery:
      location?.lat != null && location?.lon != null
        ? { lat: location.lat, lon: location.lon }
        : { q: location?.name || 'Udaipur' },
  }
}

export default useLocationPicker
