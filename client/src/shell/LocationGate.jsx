import { useEffect, useMemo, useRef, useState } from 'react'
import { DISTRICTS, searchDistricts, nearestDistrict } from '../lib/districts'
import { cn } from '../lib/utils'
import Icon from '../ui/Icon'

/**
 * The first thing anyone sees, and the one screen they cannot skip.
 *
 * Every number this product prints — forecast, warning, risk band, irrigation
 * advice — is computed for one place. There is no sensible "default" here: a
 * dashboard silently showing Udaipur's rainfall to someone in Guwahati is worse
 * than no dashboard, so the app does not start until a place is chosen.
 *
 * That makes it a modal with no escape, which is a hostile pattern *unless*
 * every user has a way through it. Both obvious paths can fail — GPS can be
 * denied or unsupported, and search needs the API — so there is always a third:
 * a bundled list of district headquarters spanning the country's climate zones,
 * which works with no permission, no network and no backend. A dialog you
 * cannot dismiss and cannot satisfy is a trap, not a gate.
 */
export default function LocationGate({ picker, onDone, onCancel }) {
  const [query, setQuery] = useState('')
  const [gps, setGps] = useState('idle') // idle | locating | denied | unsupported | failed
  const dialogRef = useRef(null)
  const searchRef = useRef(null)

  // Recents first when the field is empty — most people check the same two or
  // three places forever — then the bundled list to fill the panel.
  const rows = useMemo(() => {
    const q = query.trim()
    if (q) return searchDistricts(q, 8)
    const recents = (picker.recents || []).slice(0, 3)
    const ids = new Set(recents.map((r) => r.id))
    return [...recents, ...DISTRICTS.filter((d) => !ids.has(d.id))].slice(0, 8)
  }, [query, picker.recents])

  useEffect(() => {
    // Focus the search field, not the GPS button: typing is the path that
    // always works, and it means a keyboard user is one keystroke from a
    // result rather than one tab away from a permission prompt.
    searchRef.current?.focus({ preventScroll: true })
  }, [])

  // Trap focus. Without this, tabbing walks straight out of the dialog into
  // the page behind it — which for a screen-reader user is the same bug as
  // having no gate at all.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && onCancel) {
        onCancel()
        return
      }
      if (e.key !== 'Tab') return
      const nodes = dialogRef.current?.querySelectorAll(
        'button:not([disabled]), input, [href], [tabindex]:not([tabindex="-1"])',
      )
      if (!nodes?.length) return
      const first = nodes[0]
      const last = nodes[nodes.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onCancel])

  const choose = (row) => {
    picker.select(row)
    onDone?.()
  }

  const locate = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGps('unsupported')
      return
    }
    setGps('locating')
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        // Resolve the fix to a *named* place. "Bhinder" is something a person
        // can check; a pair of decimals is not, and a wrong fix should be
        // visible rather than silently believed.
        const near = nearestDistrict(coords.latitude, coords.longitude)
        choose(
          near && near.distanceKm < 120
            ? { ...near, source: 'gps' }
            : { id: 'gps', name: 'My location', lat: coords.latitude, lon: coords.longitude, source: 'gps' },
        )
      },
      (err) => setGps(err?.code === 1 ? 'denied' : 'failed'),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 },
    )
  }

  const GPS_COPY = {
    idle: ['Use my current location', 'One tap. The fix resolves to the nearest district so you can check it.'],
    locating: ['Finding you…', 'Waiting for a fix from your device.'],
    denied: ['Location permission denied', 'No problem — search or pick a district below instead.'],
    unsupported: ['This browser has no GPS', 'Search or pick a district below instead.'],
    failed: ['Could not get a fix', 'Try again, or pick a district below.'],
  }
  const [gpsTitle, gpsNote] = GPS_COPY[gps] || GPS_COPY.idle
  const gpsBad = gps === 'denied' || gps === 'unsupported' || gps === 'failed'

  return (
    <div
      className="fixed inset-0 z-[200] animate-fade overflow-y-auto bg-ground"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gate-title"
    >
      {/* Two slow blurred fields, the only ambient motion in the product.
          They sit behind a solid ground and carry no information, so they are
          purely a first impression — and they stop entirely under
          prefers-reduced-motion. */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <span className="animate-drift absolute -left-[8%] -top-[20%] h-[54vw] w-[54vw] rounded-full bg-accent opacity-[0.14] blur-[90px]" />
        <span className="animate-drift-slow absolute -bottom-[26%] -right-[10%] h-[46vw] w-[46vw] rounded-full bg-sev-orange opacity-[0.10] blur-[100px]" />
      </div>

      <div
        ref={dialogRef}
        className="relative mx-auto flex min-h-full max-w-[1120px] flex-col justify-center gap-6 p-6 sm:gap-8 sm:p-10 lg:p-16"
      >
        <div className="flex flex-col gap-3 sm:gap-4">
          <div className="flex items-center gap-2.5">
            <span className="grid h-7 w-7 flex-none place-items-center rounded-md bg-accent text-on-accent">
              <Icon name="cloudRain" size={16} />
            </span>
            <span className="lbl">WeatherGPT · Farmer's Friend</span>
          </div>
          <h1
            id="gate-title"
            className="headline max-w-[22ch] text-display text-ink"
            style={{ letterSpacing: '-0.04em', lineHeight: 0.98 }}
          >
            Where is your farm?
          </h1>
          <p className="max-w-[56ch] text-body-lg leading-relaxed text-ink-2">
            Forecast, warnings, irrigation advice and risk are all computed for one place.
            Choose it once — you can change it any time from the header.
          </p>
        </div>

        <div className="grid items-start gap-3 sm:gap-4 md:grid-cols-2">
          {/* --- GPS --- */}
          <button
            type="button"
            onClick={locate}
            disabled={gps === 'locating'}
            className={cn(
              'flex flex-col gap-3.5 rounded-xl border bg-surface p-5 text-left shadow-card transition-[transform,border-color] duration-200 sm:p-6',
              gpsBad ? 'border-sev-yellow' : 'border-line hover:-translate-y-0.5 hover:border-accent',
              gps === 'locating' && 'cursor-wait',
            )}
          >
            <span className="flex items-center justify-between gap-3">
              <span
                className={cn(
                  'grid h-11 w-11 flex-none place-items-center rounded-lg',
                  gpsBad ? 'bg-sev-yellow-w text-sev-yellow' : 'bg-accent-soft text-accent',
                )}
              >
                <Icon
                  name={gpsBad ? 'alert' : 'crosshair'}
                  size={21}
                  className={gps === 'locating' ? 'animate-spin-slow' : undefined}
                />
              </span>
              <span className="lbl">GPS · most accurate</span>
            </span>
            <span className="block">
              <span className="block text-subheading font-semibold tracking-[-0.02em] text-ink">
                {gpsTitle}
              </span>
              <span className="mt-1 block text-data leading-relaxed text-ink-2">{gpsNote}</span>
            </span>
          </button>

          {/* --- search + list --- */}
          <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4 shadow-card sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <span className="lbl">{query.trim() ? 'Matches' : 'Saved & nearby'}</span>
              <span className="lbl">{rows.length}</span>
            </div>

            <div className="relative">
              <Icon
                name="search"
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3"
              />
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search village, district or city"
                aria-label="Search for a place"
                className="h-11 w-full rounded-lg border border-line bg-sunk pl-9 pr-3 text-caption text-ink outline-none transition-colors duration-150 placeholder:text-ink-3 focus:border-accent focus:bg-surface"
              />
            </div>

            <ul className="-mx-1.5 flex max-h-[266px] flex-col overflow-y-auto">
              {rows.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => choose(p)}
                    className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-left transition-colors duration-150 hover:bg-sunk"
                  >
                    <span className="h-2 w-2 flex-none rounded-full bg-accent" aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-caption font-medium text-ink">{p.name}</span>
                      <span className="block truncate font-mono text-[11px] text-ink-3">
                        {[p.district && p.district !== p.name ? `${p.district} district` : null, p.state]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    </span>
                    <Icon name="chevronRight" size={15} className="flex-none text-ink-3" />
                  </button>
                </li>
              ))}
              {rows.length === 0 && (
                <li className="px-2.5 py-4 text-data leading-relaxed text-ink-3">
                  Nothing matches that. This list is the bundled gazetteer — connect the API for
                  full village-level search, or pick a nearby district.
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-1">
          {[
            'Your location stays on this device',
            'Change it any time from the header',
            `${DISTRICTS.length} districts bundled offline`,
          ].map((g) => (
            <span key={g} className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 flex-none rounded-full bg-accent" aria-hidden="true" />
              <span className="font-mono text-[12px] text-ink-3">{g}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
