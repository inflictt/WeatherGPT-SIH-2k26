import { useCallback, useEffect, useState } from 'react'
import { api, LIVE } from './api'

/**
 * Browser push subscription — the client half of the alert path.
 *
 * The states are named rather than boolean because they need different
 * sentences and different buttons:
 *
 *   unsupported   no service worker or PushManager (Safari < 16, some in-app
 *                 browsers). Say so; do not offer a button that cannot work.
 *   unconfigured  the server has no VAPID keys. Not the user's problem to fix.
 *   signed-out    push needs an account, because a notification must reach a
 *                 device the browser is not open on.
 *   denied        the permission was refused. Only the browser's own settings
 *                 can undo this — a second prompt is not possible, and
 *                 pretending otherwise wastes the user's time.
 *   ready         permission granted and the endpoint is registered.
 *   idle          everything is possible; the button does something.
 */

function urlBase64ToUint8Array(base64) {
  // VAPID keys are URL-safe base64; PushManager wants raw bytes.
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}

const supported =
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  'Notification' in window

export function usePush(token) {
  const [state, setState] = useState(supported ? 'idle' : 'unsupported')
  const [vapidKey, setVapidKey] = useState(null)
  const [error, setError] = useState(null)

  // Ask the server whether push is configured at all, once.
  useEffect(() => {
    if (!supported || !LIVE) return
    api
      .vapidKey()
      .then((res) => {
        if (res?.enabled && res.publicKey) setVapidKey(res.publicKey)
        else setState('unconfigured')
      })
      .catch(() => setState('unconfigured'))
  }, [])

  // Reflect the permission the browser already holds, so someone who granted
  // it last week is not asked again.
  useEffect(() => {
    if (!supported) return
    if (Notification.permission === 'denied') setState('denied')
    else if (Notification.permission === 'granted') {
      navigator.serviceWorker.ready
        .then((reg) => reg.pushManager.getSubscription())
        .then((sub) => sub && setState('ready'))
        .catch(() => {})
    }
  }, [])

  const subscribe = useCallback(async () => {
    if (!supported) return setState('unsupported')
    if (!token) return setState('signed-out')
    if (!vapidKey) return setState('unconfigured')

    setError(null)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') return setState('denied')

      const registration = await navigator.serviceWorker.ready
      // An existing subscription is reused rather than replaced — re-subscribing
      // mints a new endpoint and orphans the old row on the server.
      const existing = await registration.pushManager.getSubscription()
      const subscription =
        existing ||
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        }))

      await api.registerPush(subscription.toJSON(), token)
      setState('ready')
    } catch (err) {
      setError(String(err?.message || err))
      setState('idle')
    }
  }, [token, vapidKey])

  const unsubscribe = useCallback(async () => {
    if (!supported) return
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      if (subscription) await subscription.unsubscribe()
      setState('idle')
    } catch (err) {
      setError(String(err?.message || err))
    }
  }, [])

  // Resolve the ambiguity between "possible" and "needs an account" up front,
  // so the component does not have to know the rules.
  const effective = state === 'idle' && !token ? 'signed-out' : state

  return { state: effective, subscribe, unsubscribe, error, supported }
}

export default usePush
