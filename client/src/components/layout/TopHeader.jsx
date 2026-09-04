import { useState } from 'react'
import { useData } from '../../lib/DataContext'
import { formatters } from '../../lib/usePreferences'
import LocationPicker from './LocationPicker'
import LangToggle from './LangToggle'
import ThemeToggle from './ThemeToggle'
import ApiSettingsModal from '../ui/ApiSettingsModal'

export default function TopHeader({ lang, setLang, picker, resolved, toggleTheme, prefs, setPrefs }) {
  const { current, location, warnings, loading, refresh } = useData()
  const [showApiModal, setShowApiModal] = useState(false)
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
        {/* Left: Brand Logo & Location Quick View */}
        <div className="flex items-center gap-3">
          <a href="#/" className="flex items-center gap-2 group" title="WeatherGPT Home">
            <img src="/favicon.svg" alt="WeatherGPT Logo" className="w-7 h-7 rounded-lg shadow-md group-hover:scale-105 transition-transform" />
            <span className="font-display font-bold text-base text-ink tracking-tight hidden lg:inline">WeatherGPT</span>
          </a>

          <div className="flex items-center gap-2 glass-pill px-3 py-1.5 rounded-lg">
            <span className="text-iris text-sm">📍</span>
            <span className="font-display font-light text-sm text-ink">
              {location?.name || 'Kapriwas'}{location?.district ? `, ${location.district}` : ''}
            </span>
          </div>

          {current && (
            <div className="hidden sm:flex items-center gap-2 font-mono text-xs text-ink-2">
              <span className="text-base">
                {(() => {
                  const c = (current.condition || '').toLowerCase()
                  if (c.includes('thunder') || c.includes('storm')) return '⛈️'
                  if (c.includes('rain') || c.includes('shower')) return '🌧️'
                  if (c.includes('drizzle')) return '🌦️'
                  if (c.includes('snow') || c.includes('sleet')) return '❄️'
                  if (c.includes('fog') || c.includes('mist') || c.includes('smog')) return '🌫️'
                  if (c.includes('clear') || c.includes('sun')) return '☀️'
                  return '⛅'
                })()}
              </span>
              <span className="font-semibold text-ink text-sm">
                {fmt.temp(current.tempC)} {fmt.tempUnit}
              </span>
              {current.condition && (
                <span className="text-xs text-ink-3 hidden md:inline truncate max-w-[150px]">
                  ({current.condition})
                </span>
              )}
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

        {/* Right: Controls (Refresh Now, °C/°F Unit Switcher, Language, Theme) */}
        <div className="flex items-center gap-2 order-2 sm:order-3">
          {/* Refresh Now Button (1-min auto refresh sync) */}
          <button
            onClick={() => refresh && refresh()}
            disabled={loading}
            title="Refresh weather data now (Auto-refreshes every 60s)"
            className="glass-pill px-2.5 py-1 rounded-lg font-mono text-xs font-semibold text-ink hover:bg-raised active:scale-95 transition-all duration-150 flex items-center gap-1.5 disabled:opacity-60"
            aria-label="Refresh weather data"
          >
            <svg
              className={`w-3.5 h-3.5 text-ink-2 ${loading ? 'animate-spin text-iris' : 'group-hover:rotate-180 transition-transform duration-500'}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="hidden md:inline text-[11px] text-ink-2 font-medium">
              {loading ? 'Updating…' : 'Refresh'}
            </span>
          </button>

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

          {/* API Keys / Ensemble Settings Modal Button */}
          <button
            onClick={() => setShowApiModal(true)}
            title="Ensemble Settings & Custom API Keys"
            className="glass-pill px-2.5 py-1 rounded-lg font-mono text-xs text-ink hover:bg-raised transition-colors duration-150 flex items-center gap-1"
          >
            <span>⚙️</span>
            <span className="hidden xl:inline text-[11px] text-ink-2">Ensemble</span>
          </button>
        </div>
      </div>

      <ApiSettingsModal isOpen={showApiModal} onClose={() => setShowApiModal(false)} />
    </header>
  )
}
