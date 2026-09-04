import { useEffect, useMemo, useRef, useState } from 'react'
import { DISTRICTS, searchDistricts, nearestDistrict } from '../lib/districts'
import { api, LIVE } from '../lib/api'
import { t } from '../lib/i18n'
import { ACTIVE_LANGUAGES } from '../lib/constants'
import { cn } from '../lib/utils'
import Icon from '../ui/Icon'
import { Segmented } from '../ui/Bits'

/**
 * 2-Step Landing Onboarding Gate for Aakrishi with full multi-language support (English, Hindi, Hinglish).
 */
export default function LocationGate({
  picker,
  audience = 'everyone',
  setAudience,
  lang = 'en',
  setLang,
  onDone,
  onCancel,
}) {
  const [step, setStep] = useState(1) // 1: Mode Selection, 2: Location Selection
  const [selectedAudience, setSelectedAudience] = useState(audience)
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [gps, setGps] = useState('idle') // idle | locating | denied | unsupported | failed
  const dialogRef = useRef(null)
  const searchRef = useRef(null)
  const searchDebounce = useRef(null)

  // Focus search when entering Step 2
  useEffect(() => {
    if (step === 2) {
      searchRef.current?.focus({ preventScroll: true })
    }
  }, [step])

  // Live and local combined search
  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setSearchResults([])
      setSearching(false)
      return undefined
    }

    // Direct Lat,Lon coordinate detection
    const coordMatch = q.match(/^(-?\d+(\.\d+)?)\s*,\s*(-?\d+(\.\d+)?)$/)
    if (coordMatch) {
      const lat = parseFloat(coordMatch[1])
      const lon = parseFloat(coordMatch[3])
      if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
        setSearchResults([
          {
            id: `coord_${lat}_${lon}`,
            name: `Coordinates: ${lat.toFixed(4)}, ${lon.toFixed(4)}`,
            district: 'Direct Coordinates',
            state: 'Custom Position',
            lat,
            lon,
            source: 'coordinates',
            kind: 'coordinate-point',
          },
        ])
        setSearching(false)
        return undefined
      }
    }

    // Local instant hits
    const localHits = searchDistricts(q, 8)
    setSearchResults(localHits)

    if (LIVE) {
      setSearching(true)
      clearTimeout(searchDebounce.current)
      searchDebounce.current = setTimeout(async () => {
        try {
          const res = await api.searchLocations(q)
          if (res?.results?.length) {
            const seen = new Set(localHits.map((d) => `${d.name}|${d.state}`))
            const extra = (res.results || []).filter((r) => !seen.has(`${r.name}|${r.state}`))
            setSearchResults([...localHits, ...extra].slice(0, 10))
          }
        } catch {
          // keep local hits
        } finally {
          setSearching(false)
        }
      }, 200)
    }

    return () => clearTimeout(searchDebounce.current)
  }, [query])

  // Popular / Recent fallback
  const defaultRows = useMemo(() => {
    const recents = (picker?.recents || []).slice(0, 3)
    const ids = new Set(recents.map((r) => r.id))
    return [...recents, ...DISTRICTS.filter((d) => !ids.has(d.id))].slice(0, 8)
  }, [picker?.recents])

  const displayRows = query.trim() ? searchResults : defaultRows

  const choose = (row) => {
    if (setAudience) setAudience(selectedAudience)
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
      async ({ coords }) => {
        const { latitude: lat, longitude: lon } = coords
        if (LIVE) {
          try {
            const res = await api.reverse(lat, lon)
            if (res?.location) {
              choose(res.location)
              setGps('idle')
              return
            }
          } catch {
            /* fall through */
          }
        }
        const near = nearestDistrict(lat, lon)
        choose(
          near && near.distanceKm < 120
            ? { ...near, source: 'gps' }
            : { id: 'gps', name: 'My location', lat, lon, source: 'gps' },
        )
        setGps('idle')
      },
      (err) => setGps(err?.code === 1 ? 'denied' : 'failed'),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5 * 60 * 1000 },
    )
  }

  const GPS_COPY = {
    idle: [t('gateGpsTitle', lang), t('gateGpsNote', lang)],
    locating: [lang === 'hi' ? 'जीपीएस स्थान ढूँढा जा रहा है…' : 'Locating you with high precision…', 'Waiting for satellite fix…'],
    denied: [lang === 'hi' ? 'स्थान अनुमति नहीं मिली' : 'Location permission denied', 'Search your village or district below.'],
    unsupported: [lang === 'hi' ? 'जीपीएस उपलब्ध नहीं है' : 'GPS not available', 'Search your village or district below.'],
    failed: [lang === 'hi' ? 'जीपीएस संपर्क नहीं हो सका' : 'Could not get GPS fix', 'Try typing your village name below.'],
  }
  const [gpsTitle, gpsNote] = GPS_COPY[gps] || GPS_COPY.idle
  const gpsBad = gps === 'denied' || gps === 'unsupported' || gps === 'failed'

  return (
    <div
      className={cn(
        'fixed inset-0 z-[200] animate-fade bg-ground flex flex-col justify-center',
        step === 1 ? 'overflow-hidden h-screen' : 'overflow-y-auto min-h-screen',
      )}
      role="dialog"
      aria-modal="true"
      aria-labelledby="gate-title"
    >
      {/* Background ambient lighting */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <span className="animate-drift absolute -left-[8%] -top-[20%] h-[50vw] w-[50vw] rounded-full bg-accent opacity-[0.14] blur-[90px]" />
        <span className="animate-drift-slow absolute -bottom-[26%] -right-[10%] h-[44vw] w-[44vw] rounded-full bg-sev-orange opacity-[0.10] blur-[100px]" />
      </div>

      <div
        ref={dialogRef}
        className={cn(
          'relative mx-auto flex w-full max-w-[1180px] flex-col justify-center px-5 sm:px-8 lg:px-12',
          step === 1 ? 'py-4 md:py-6 max-h-screen gap-4 md:gap-6' : 'py-8 gap-6',
        )}
      >
        {/* Brand Header with Language Switcher */}
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-accent text-on-accent shadow-md">
              <Icon name="cloudRain" size={20} />
            </span>
            <div>
              <span className="text-body font-bold tracking-tight text-ink">{t('appName', lang)} · {t('appName', 'hi')}</span>
              <span className="block text-[11px] font-mono text-ink-3">{t('appTagline', lang)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {setLang && (
              <Segmented
                label="Language"
                size="sm"
                options={ACTIVE_LANGUAGES.map((l) => ({
                  key: l.code,
                  label: l.tiny || l.short,
                  title: l.label,
                }))}
                value={lang}
                onChange={setLang}
              />
            )}
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="rounded-lg border border-line bg-surface px-3 py-1 text-caption font-medium text-ink-2 hover:bg-sunk"
              >
                ✕ Close
              </button>
            )}
          </div>
        </div>

        {/* ========================================================= STEP 1: 50-50 RATIO BIG BOXED PARTITION */}
        {step === 1 && (
          <div className="animate-fade space-y-4 md:space-y-6">
            <div className="flex flex-col gap-1 text-left">
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-accent/15 px-2.5 py-0.5 font-mono text-[11px] font-bold text-accent">
                  {t('gateStep1Badge', lang)}
                </span>
                <span className="text-[12px] text-ink-3 font-mono">Bilingual Selection · अपनी भूमिका चुनें</span>
              </div>
              <h1
                id="gate-title"
                className="headline text-[26px] sm:text-[34px] font-bold text-ink leading-tight"
                style={{ letterSpacing: '-0.03em' }}
              >
                {t('gateStep1Title', lang)}
              </h1>
            </div>

            {/* 50-50 EQUAL RATIO PARTITION */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 lg:gap-7 items-stretch">
              {/* BOX 1: GENERAL VIEW */}
              <button
                type="button"
                onClick={() => setSelectedAudience('everyone')}
                className={cn(
                  'group relative flex flex-col justify-between rounded-3xl border-2 p-6 sm:p-7 lg:p-8 text-left transition-all duration-200 cursor-pointer shadow-sm',
                  selectedAudience === 'everyone'
                    ? 'border-accent bg-accent-soft/40 ring-4 ring-accent/20 shadow-card scale-[1.01]'
                    : 'border-line bg-surface hover:border-ink-3 hover:bg-sunk/30',
                )}
              >
                <div className="space-y-4">
                  {/* Top Bar inside Box */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3.5">
                      <span
                        className={cn(
                          'grid h-12 w-12 place-items-center rounded-2xl transition-colors',
                          selectedAudience === 'everyone' ? 'bg-accent text-on-accent shadow-md' : 'bg-sunk text-ink-2',
                        )}
                      >
                        <Icon name="cloud" size={24} />
                      </span>
                      <div>
                        <h3 className="text-subheading font-bold text-ink text-[18px] sm:text-[20px] leading-snug">
                          {t('gateGeneralTitle', lang)} <span className="text-ink-3 font-normal text-[15px]">· {t('gateGeneralSub', lang)}</span>
                        </h3>
                        <span className="text-[12px] font-bold text-accent font-mono">{t('gateGeneralAi', lang)}</span>
                      </div>
                    </div>
                    <div
                      className={cn(
                        'grid h-6 w-6 place-items-center rounded-full border text-[12px] font-bold transition-all',
                        selectedAudience === 'everyone'
                          ? 'border-accent bg-accent text-on-accent shadow-sm'
                          : 'border-line text-transparent',
                      )}
                    >
                      ✓
                    </div>
                  </div>

                  {/* Descriptions */}
                  <div className="space-y-1 text-data leading-relaxed">
                    <p className="font-semibold text-ink text-[14px]">
                      {t('gateGeneralDesc1', lang)}
                    </p>
                    <p className="text-ink-3 text-[12px]">
                      {t('gateGeneralDesc2', lang)}
                    </p>
                  </div>
                </div>

                {/* Feature Checklist */}
                <ul className="space-y-2 border-t border-line-soft pt-4 text-[12px] font-mono text-ink-2">
                  <li className="flex items-center gap-2.5">
                    <span className="text-accent font-bold text-[14px]">✓</span>
                    <span>7-Day & 24-Hour Pinpoint Weather</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="text-accent font-bold text-[14px]">✓</span>
                    <span>NDMA Sachet Emergency CAP Alerts</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="text-accent font-bold text-[14px]">✓</span>
                    <span>Akashvaani AI Weather Assistant</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="text-accent font-bold text-[14px]">✓</span>
                    <span>Zero Agricultural Clutter</span>
                  </li>
                </ul>
              </button>

              {/* BOX 2: KRISHI VIEW (FARMER + GENERAL) */}
              <button
                type="button"
                onClick={() => setSelectedAudience('farm')}
                className={cn(
                  'group relative flex flex-col justify-between rounded-3xl border-2 p-6 sm:p-7 lg:p-8 text-left transition-all duration-200 cursor-pointer shadow-sm',
                  selectedAudience === 'farm'
                    ? 'border-accent bg-accent-soft/40 ring-4 ring-accent/20 shadow-card scale-[1.01]'
                    : 'border-line bg-surface hover:border-ink-3 hover:bg-sunk/30',
                )}
              >
                <div className="space-y-4">
                  {/* Top Bar inside Box */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3.5">
                      <span
                        className={cn(
                          'grid h-12 w-12 place-items-center rounded-2xl transition-colors',
                          selectedAudience === 'farm' ? 'bg-accent text-on-accent shadow-md' : 'bg-sunk text-ink-2',
                        )}
                      >
                        <Icon name="sprout" size={24} />
                      </span>
                      <div>
                        <h3 className="text-subheading font-bold text-ink text-[18px] sm:text-[20px] leading-snug">
                          {t('gateKrishiTitle', lang)} <span className="text-ink-3 font-normal text-[15px]">· {t('gateKrishiSub', lang)}</span>
                        </h3>
                        <span className="text-[12px] font-bold text-accent font-mono">{t('gateKrishiAi', lang)}</span>
                      </div>
                    </div>
                    <div
                      className={cn(
                        'grid h-6 w-6 place-items-center rounded-full border text-[12px] font-bold transition-all',
                        selectedAudience === 'farm'
                          ? 'border-accent bg-accent text-on-accent shadow-sm'
                          : 'border-line text-transparent',
                      )}
                    >
                      ✓
                    </div>
                  </div>

                  {/* Descriptions */}
                  <div className="space-y-1 text-data leading-relaxed">
                    <p className="font-semibold text-ink text-[14px]">
                      {t('gateKrishiDesc1', lang)}
                    </p>
                    <p className="text-ink-3 text-[12px]">
                      {t('gateKrishiDesc2', lang)}
                    </p>
                  </div>
                </div>

                {/* Feature Checklist */}
                <ul className="space-y-2 border-t border-line-soft pt-4 text-[12px] font-mono text-ink-2">
                  <li className="flex items-center gap-2.5">
                    <span className="text-accent font-bold text-[14px]">✓</span>
                    <span>All Citizen Forecasts & Disaster Alerts</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="text-accent font-bold text-[14px]">✓</span>
                    <span>Crop Doctor Leaf Disease AI Scanner</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="text-accent font-bold text-[14px]">✓</span>
                    <span>Soil Type Classifier & Smart Irrigation</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="text-accent font-bold text-[14px]">✓</span>
                    <span>5-Day Agro-Risk Matrix & Krishivaani AI</span>
                  </li>
                </ul>
              </button>
            </div>

            {/* Bottom Action Button */}
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex items-center gap-3 rounded-2xl bg-accent px-8 py-3.5 text-body-sm font-bold text-on-accent shadow-md transition-all hover:opacity-95 hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>{t('gateContinueBtn', lang)}</span>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= STEP 2: LOCATION SELECTION */}
        {step === 2 && (
          <div className="animate-fade space-y-6">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex items-center gap-1.5 text-caption font-semibold text-accent hover:underline"
                >
                  <span>{t('backToMode', lang)}</span>
                </button>
                <span className="rounded-md bg-accent/15 px-2.5 py-0.5 font-mono text-[11px] font-bold text-accent">
                  Active: {selectedAudience === 'farm' ? 'Krishi View (Krishivaani)' : 'General View (Akashvaani)'}
                </span>
              </div>

              <h1 id="gate-title" className="headline text-display text-ink" style={{ letterSpacing: '-0.03em' }}>
                {t('gateStep2Title', lang)}
              </h1>
              <p className="max-w-[70ch] text-body leading-relaxed text-ink-2">
                {t('gateStep2Sub', lang)}
              </p>
            </div>

            <div className="grid items-start gap-4 md:grid-cols-2">
              {/* Option A: One-Tap GPS */}
              <button
                type="button"
                onClick={locate}
                disabled={gps === 'locating'}
                className={cn(
                  'flex flex-col gap-3.5 rounded-2xl border bg-surface p-5 text-left shadow-card transition-all duration-200 sm:p-6',
                  gpsBad ? 'border-sev-yellow' : 'border-line hover:-translate-y-0.5 hover:border-accent',
                  gps === 'locating' && 'cursor-wait',
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <span
                    className={cn(
                      'grid h-12 w-12 flex-none place-items-center rounded-xl',
                      gpsBad ? 'bg-sev-yellow-w text-sev-yellow' : 'bg-accent-soft text-accent',
                    )}
                  >
                    <Icon
                      name={gpsBad ? 'alert' : 'crosshair'}
                      size={24}
                      className={gps === 'locating' ? 'animate-spin-slow' : undefined}
                    />
                  </span>
                  <span className="lbl text-accent font-bold">{t('gateGpsBtn', lang)}</span>
                </div>
                <div>
                  <span className="block text-subheading font-bold text-ink">{gpsTitle}</span>
                  <span className="mt-1 block text-data leading-relaxed text-ink-2">{gpsNote}</span>
                </div>
              </button>

              {/* Option B: Search Village / Town / Coordinates */}
              <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4 shadow-card sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <span className="lbl text-ink font-semibold">
                    {query.trim() ? `Search Matches (${displayRows.length})` : t('gateSearchHeader', lang)}
                  </span>
                  {searching && <span className="lbl animate-pulse text-accent">Querying Geocoder…</span>}
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
                    placeholder="Search village, tehsil, city or lat,lon (e.g. Kapriwas, Rewari, 28.24, 76.84)"
                    aria-label="Search location"
                    className="h-11 w-full rounded-xl border border-line bg-sunk pl-9 pr-3 text-caption text-ink outline-none transition-colors duration-150 placeholder:text-ink-3 focus:border-accent focus:bg-surface"
                  />
                </div>

                <ul className="-mx-1 flex max-h-[230px] flex-col overflow-y-auto divide-y divide-line-soft">
                  {displayRows.map((p) => (
                    <li key={p.id || `${p.lat},${p.lon}`}>
                      <button
                        type="button"
                        onClick={() => choose(p)}
                        className="group flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-left transition-colors duration-150 hover:bg-sunk"
                      >
                        <span className="h-2 w-2 flex-none rounded-full bg-accent group-hover:scale-125 transition-transform" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-caption font-bold text-ink">{p.name}</span>
                          <span className="block truncate font-mono text-[11px] text-ink-3">
                            {[p.district && p.district !== p.name ? p.district : null, p.state]
                              .filter(Boolean)
                              .join(' · ')}
                            {p.kind && ` (${p.kind})`}
                          </span>
                        </span>
                        <Icon name="chevronRight" size={15} className="flex-none text-ink-3 group-hover:text-accent" />
                      </button>
                    </li>
                  ))}
                  {displayRows.length === 0 && !searching && (
                    <li className="px-2.5 py-4 text-center text-data text-ink-3">
                      No matching village or city found. You can also type direct coordinates (e.g. 28.2435, 76.8453).
                    </li>
                  )}
                </ul>
              </div>
            </div>

            {/* Footer Direct Launch */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
              <span className="text-[12px] font-mono text-ink-3">
                Selected location coordinates will be used for precision numerical weather models.
              </span>
              <button
                type="button"
                onClick={() => choose(displayRows[0] || DISTRICTS[0])}
                className="flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-caption font-bold text-on-accent shadow-sm hover:opacity-95"
              >
                <span>{t('gateLaunchBtn', lang)}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
