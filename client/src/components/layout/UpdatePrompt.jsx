import { useEffect, useState } from 'react'

/**
 * Offline status, and the "a new version is ready" prompt.
 *
 * `registerType: 'prompt'` means the service worker waits for the user rather
 * than swapping the app out from under them. That matters more here than in
 * most products: reloading mid-question would discard a thread, and someone
 * reading an active warning should not have the page replaced while they read
 * it. So the choice is theirs, and it is one tap.
 *
 * The offline notice is separate and unconditional, because a stale forecast
 * shown without saying it is stale is the one thing this product must not do.
 */
export default function UpdatePrompt() {
  const [needRefresh, setNeedRefresh] = useState(false)
  const [offline, setOffline] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false,
  )
  const [updateFn, setUpdateFn] = useState(null)

  useEffect(() => {
    const on = () => setOffline(false)
    const off = () => setOffline(true)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    // Imported lazily and defensively: the virtual module only exists in a PWA
    // build, and `npm run dev` must not fail because of it.
    import('virtual:pwa-register')
      .then(({ registerSW }) => {
        if (cancelled) return
        const update = registerSW({
          immediate: true,
          onNeedRefresh: () => setNeedRefresh(true),
        })
        setUpdateFn(() => update)
      })
      .catch(() => {
        /* no service worker in this build — nothing to prompt about */
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (!offline && !needRefresh) return null

  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-[68px] z-50 mx-auto w-fit max-w-[92vw] md:bottom-5"
    >
      <div className="flex items-center gap-3 rounded-md border border-line bg-surface px-4 py-2.5">
        <span
          className={offline ? 'h-1.5 w-1.5 rounded-full bg-sev-yellow' : 'h-1.5 w-1.5 rounded-full bg-accent'}
          aria-hidden="true"
        />
        <span className="text-[12.5px] text-ink-2">
          {offline
            ? 'Offline — showing the last data that loaded'
            : 'A new version is ready'}
        </span>
        {needRefresh && !offline && (
          <button
            type="button"
            onClick={() => updateFn?.(true)}
            className="rounded-full bg-accent px-3 py-1 text-[12px] text-on-accent transition-opacity duration-200 hover:opacity-90"
          >
            Reload
          </button>
        )}
      </div>
    </div>
  )
}
