import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AUDIENCES, ACTIVE_LANGUAGES } from '../lib/constants'
import { searchDistricts } from '../lib/districts'
import { cn } from '../lib/utils'
import Icon from '../ui/Icon'
import { Segmented, IconButton, Shell } from '../ui/Bits'

/**
 * The header: mark, search, and the controls that change what the whole
 * product says rather than what one card shows.
 *
 * `audience` sits beside the unit toggle deliberately. It is not a filter —
 * it decides whether the same forecast is read as "take an umbrella" or as
 * "the spray window closes at 14:00", which is a bigger switch than °C/°F and
 * belongs at the same level.
 */
export default function TopBar({
  picker,
  activeLocation,
  lang,
  setLang,
  units,
  setUnits,
  audience,
  setAudience,
  theme,
  toggleTheme,
  onChangeLocation,
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const box = useRef(null)
  const navigate = useNavigate()

  const currentLoc = activeLocation || picker?.location
  const locName = currentLoc?.name || currentLoc?.district || 'Location'

  const results = query.trim() ? searchDistricts(query, 6) : []

  useEffect(() => {
    const onDown = (e) => {
      if (box.current && !box.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [])

  const pick = (row) => {
    picker.select(row)
    setQuery('')
    setOpen(false)
  }

  return (
    <div className="border-b border-line bg-surface">
      <Shell className="flex min-h-[62px] flex-wrap items-center gap-x-3 gap-y-2.5 py-2.5 sm:gap-x-5">
        <Link to="/" className="flex flex-none items-center gap-2.5">
          <span className="grid h-[30px] w-[30px] place-items-center rounded-md bg-accent text-on-accent">
            <Icon name="cloudRain" size={18} />
          </span>
          <span className="text-body-sm font-semibold tracking-[-0.02em] text-ink">WeatherGPT</span>
        </Link>

        {/* --- search --- */}
        <div
          ref={box}
          className="relative order-last w-full min-w-0 sm:order-none sm:w-[min(400px,100%)] sm:min-w-[200px] sm:flex-1 lg:w-auto"
        >
          <Icon
            name="search"
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setOpen(true)
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && results[0]) pick(results[0])
              if (e.key === 'Escape') setOpen(false)
            }}
            placeholder="Search village, district or city"
            aria-label="Search for a place"
            className="h-10 w-full rounded-lg border border-line bg-sunk pl-9 pr-3 text-caption text-ink outline-none transition-colors duration-150 placeholder:text-ink-3 focus:border-accent focus:bg-surface"
          />

          {open && query.trim() && (
            <div className="absolute inset-x-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-lg border border-line bg-surface shadow-card">
              <div className="border-b border-line-soft px-3 py-2">
                <span className="lbl">{results.length ? 'Bundled gazetteer' : 'No match'}</span>
              </div>
              {results.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => pick(r)}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors duration-150 hover:bg-sunk"
                >
                  <Icon name="pin" size={15} className="flex-none text-ink-3" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-caption text-ink">{r.name}</span>
                    <span className="block truncate font-mono text-[11px] text-ink-3">
                      {[r.district !== r.name ? r.district : null, r.state].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                </button>
              ))}
              {!results.length && (
                <p className="px-3 py-3 text-data leading-relaxed text-ink-3">
                  Nothing bundled matches that. Connect the API for village-level search.
                </p>
              )}
            </div>
          )}
        </div>

        {/* --- controls --- */}
        <div className="flex flex-1 items-center justify-end gap-2 sm:flex-none">
          <Segmented
            label="Who this is for"
            options={AUDIENCES.map((a) => ({ key: a.key, label: a.label }))}
            value={audience}
            onChange={setAudience}
          />
          <Segmented
            label="Units"
            size="sm"
            className="hidden min-[400px]:flex"
            options={[
              { key: 'metric', label: '°C' },
              { key: 'imperial', label: '°F' },
            ]}
            value={units}
            onChange={setUnits}
          />
          <Segmented
            label="Language"
            size="sm"
            className="hidden min-[430px]:flex"
            options={ACTIVE_LANGUAGES.map((l) => ({
              key: l.code,
              label: l.tiny || l.short,
              title: l.label,
            }))}
            value={lang}
            onChange={setLang}
          />
          <IconButton icon="pin" label="Change location" onClick={onChangeLocation} />
          <IconButton icon="map" label="Warning map" onClick={() => navigate('/map')} className="hidden sm:grid" />
          <IconButton
            icon="settings"
            label="Settings"
            onClick={() => navigate('/settings')}
            className="hidden sm:grid"
          />
          <IconButton
            icon={theme === 'dark' ? 'sun' : 'moon'}
            label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            onClick={toggleTheme}
          />
        </div>
      </Shell>
    </div>
  )
}
