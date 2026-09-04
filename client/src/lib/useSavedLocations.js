import { useCallback, useEffect, useState } from 'react'
import { api, LIVE } from './api'

/**
 * Saved locations and their alert subscriptions.
 *
 * Two storage backends behind one interface, chosen by whether anyone is signed
 * in. That is not a compromise — it is the honest shape of the product:
 *
 *   signed in   → the server, because a push notification has to reach a device
 *                 the browser is not open on, which needs a subscription row
 *   anonymous   → localStorage, and the UI *says* the list is only on this
 *                 device. Silently keeping someone's saved village in React
 *                 state and losing it on refresh is the failure this replaces
 *
 * Anonymous users deliberately keep working. Requiring an account before
 * someone can save their own village would exclude exactly the people this is
 * built for.
 */

const KEY = 'wg-saved-locations'

function readLocal() {
  try {
    const raw = localStorage.getItem(KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    // Private mode, cleared storage, corrupt value — an empty list is correct.
    return []
  }
}

function writeLocal(rows) {
  try {
    localStorage.setItem(KEY, JSON.stringify(rows))
  } catch {
    /* quota or private mode; the in-memory list still works for this session */
  }
}

export function useSavedLocations(token = null) {
  const [rows, setRows] = useState(() => readLocal())
  const [loading, setLoading] = useState(Boolean(token && LIVE))
  const [error, setError] = useState(null)

  const persisted = Boolean(token && LIVE)

  useEffect(() => {
    if (!persisted) {
      setRows(readLocal())
      setLoading(false)
      return
    }
    let cancelled = false
    api
      .subscriptions(token)
      .then((res) => {
        if (!cancelled) {
          setRows(res.subscriptions || [])
          setLoading(false)
        }
      })
      .catch((err) => {
        if (cancelled) return
        // Fall back to whatever is on this device rather than showing nothing.
        setRows(readLocal())
        setError(String(err?.message || err))
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [persisted, token])

  const add = useCallback(
    async (location) => {
      const row = {
        id: location.id || `${location.lat},${location.lon}`,
        name: location.name,
        district: location.district,
        state: location.state,
        lat: location.lat,
        lon: location.lon,
        minSeverity: 'Severe',
        active: true,
      }
      if (rows.some((r) => r.id === row.id)) return

      const next = [...rows, row]
      setRows(next)
      if (!persisted) return writeLocal(next)

      try {
        const res = await api.subscribe(row, token)
        setRows((cur) => cur.map((r) => (r.id === row.id ? { ...r, ...res.subscription } : r)))
      } catch (err) {
        // Roll back rather than showing a row that does not exist server-side.
        setRows(rows)
        setError(String(err?.message || err))
      }
    },
    [rows, persisted, token],
  )

  const remove = useCallback(
    async (id) => {
      const before = rows
      const next = rows.filter((r) => r.id !== id)
      setRows(next)
      if (!persisted) return writeLocal(next)
      try {
        await api.unsubscribe(id, token)
      } catch (err) {
        setRows(before)
        setError(String(err?.message || err))
      }
    },
    [rows, persisted, token],
  )

  const toggle = useCallback(
    async (id) => {
      const row = rows.find((r) => r.id === id)
      if (!row) return
      const next = rows.map((r) => (r.id === id ? { ...r, active: !r.active } : r))
      setRows(next)
      if (!persisted) return writeLocal(next)
      try {
        await api.subscribe({ ...row, active: !row.active }, token)
      } catch (err) {
        setRows(rows)
        setError(String(err?.message || err))
      }
    },
    [rows, persisted, token],
  )

  return { rows, loading, error, persisted, add, remove, toggle }
}

export default useSavedLocations
