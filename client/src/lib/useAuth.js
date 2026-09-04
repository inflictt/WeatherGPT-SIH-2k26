import { useCallback, useEffect, useState } from 'react'
import { api, LIVE } from './api'

/**
 * Sign-in, and the token everything authenticated needs.
 *
 * An account is optional on purpose and the interface says so. Requiring one
 * before someone can check the weather for their village would exclude exactly
 * the people this is built for. What an account buys is specific and worth
 * stating plainly in the UI: saved locations that survive a new phone, and push
 * notifications — which have to reach a device when the browser is closed, and
 * therefore need a row on a server.
 *
 * The token lives in localStorage rather than a cookie because the API is on a
 * different origin and this is a JWT-bearer API. That is a deliberate trade:
 * simpler CORS, at the cost of being readable by any script on the page. For
 * what is stored behind it — saved place names and alert preferences — that is
 * an acceptable exposure; it would not be for anything else, and nothing else
 * should be put behind it without revisiting this.
 */

const KEY = 'wg-auth'

function readStored() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function useAuth() {
  const [session, setSession] = useState(readStored)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  // Confirm a stored token is still good. An expired one should log you out
  // quietly at load, not fail on the first thing you try to do with it.
  useEffect(() => {
    if (!session?.token || !LIVE) return
    let cancelled = false
    api
      .me(session.token)
      .then((res) => {
        if (!cancelled && res?.user) {
          setSession((s) => ({ ...s, user: res.user }))
        }
      })
      .catch(() => {
        if (!cancelled) {
          localStorage.removeItem(KEY)
          setSession(null)
        }
      })
    return () => {
      cancelled = true
    }
    // Only on mount, and only for the token we started with.
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const persist = useCallback((next) => {
    setSession(next)
    try {
      if (next) localStorage.setItem(KEY, JSON.stringify(next))
      else localStorage.removeItem(KEY)
    } catch {
      /* private mode — the session still works until reload */
    }
  }, [])

  const run = useCallback(
    async (fn) => {
      if (!LIVE) {
        setError('Sign-in needs the API. Set VITE_API_URL to enable accounts.')
        return false
      }
      setBusy(true)
      setError(null)
      try {
        const res = await fn()
        persist({ token: res.token, user: res.user })
        return true
      } catch (err) {
        // The API's own message is more useful than anything generic —
        // "Email already registered" tells someone what to do next.
        setError(String(err?.message || 'That did not work. Try again.'))
        return false
      } finally {
        setBusy(false)
      }
    },
    [persist],
  )

  const login = useCallback(
    (email, password) => run(() => api.login(email, password)),
    [run],
  )

  const register = useCallback(
    (payload) => run(() => api.register(payload)),
    [run],
  )

  const logout = useCallback(() => {
    persist(null)
    setError(null)
  }, [persist])

  return {
    token: session?.token || null,
    user: session?.user || null,
    signedIn: Boolean(session?.token),
    busy,
    error,
    clearError: () => setError(null),
    login,
    register,
    logout,
    available: LIVE,
  }
}

export default useAuth
