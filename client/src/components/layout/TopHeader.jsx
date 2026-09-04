import { useData } from '../../lib/DataContext'
import { formatters } from '../../lib/usePreferences'
import LocationPicker from './LocationPicker'
import LangToggle from './LangToggle'
import ThemeToggle from './ThemeToggle'

export default function TopHeader({ lang, setLang, picker, resolved, toggleTheme, prefs, setPrefs }) {
  const { current, location, warnings } = useData()
  const fmt = formatters(prefs?.units)
  const isImperial = prefs?.units === 'imperial'

  const toggleUnits = () => {
    if (setPrefs) {
      setPrefs('units', isImperial ? 'metric' : 'imperial')
    }
  }

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-line px-4 py-2.5 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3 max-w-7xl mx-auto">
        {/* Left: Location & Condition Quick View */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 glass-pill px-3 py-1.5 rounded-lg">
            <span className="text-iris text-sm">📍</span>
            <span className="font-display font-light text-sm text-ink">
              {location?.name || 'Kapriwas'}{location?.district ? `, ${location.district}` : ''}
            </span>
          </div>

          {current && (
            <div className="hidden sm:flex items-center gap-2 font-mono text-xs text-ink-2">
              <span className="text-base">⛅</span>
              <span className="font-semibold text-ink text-sm">
                {fmt.temp(current.tempC)} {fmt.tempUnit}
              </span>
              {warnings?.length > 0 && (
                <span className="flex items-center gap-1 rounded-full bg-sev-orange/20 text-sev-orange px-2 py-0.5 text-[10px] font-semibold border border-sev-orange/30 animate-pulse">
                  ⚠️ {warnings.length} {warnings.length === 1 ? 'Alert' : 'Alerts'}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Center: Search location input */}
        <div className="w-full sm:w-64 md:w-80 order-3 sm:order-2">
          <LocationPicker picker={picker} />
        </div>

        {/* Right: Controls (°C/°F Unit Switcher, Language, Theme) */}
        <div className="flex items-center gap-2 order-2 sm:order-3">
          {/* Unit Toggle */}
          <button
            onClick={toggleUnits}
            title="Toggle between Celsius and Fahrenheit"
            className="glass-pill px-2.5 py-1 rounded-lg font-mono text-xs font-semibold text-ink hover:bg-raised transition-colors duration-150 flex items-center gap-1"
          >
            <span className={!isImperial ? 'text-ink font-bold' : 'text-ink-3'}>°C</span>
            <span className="text-ink-3">/</span>
            <span className={isImperial ? 'text-ink font-bold' : 'text-ink-3'}>°F</span>
          </button>

          <LangToggle lang={lang} setLang={setLang} />
          <ThemeToggle resolved={resolved} toggle={toggleTheme} />
        </div>
      </div>
    </header>
  )
}
