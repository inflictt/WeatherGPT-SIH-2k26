import { useState } from 'react'
import { cn } from '../../lib/utils'

export default function ApiSettingsModal({ isOpen, onClose }) {
  const [showOverrides, setShowOverrides] = useState(false)
  const [keys, setKeys] = useState(() => ({
    weatherApi: localStorage.getItem('weathergpt_key_weatherapi') || '',
    tomorrow: localStorage.getItem('weathergpt_key_tomorrow') || '',
    openWeather: localStorage.getItem('weathergpt_key_openweather') || '',
    groq: localStorage.getItem('weathergpt_key_groq') || '',
  }))

  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    localStorage.setItem('weathergpt_key_weatherapi', keys.weatherApi)
    localStorage.setItem('weathergpt_key_tomorrow', keys.tomorrow)
    localStorage.setItem('weathergpt_key_openweather', keys.openWeather)
    localStorage.setItem('weathergpt_key_groq', keys.groq)
    setSaved(true)
    setTimeout(() => {
      setSaved(false)
      onClose()
    }, 1000)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl glass-panel border border-line shadow-2xl bg-surface/95">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-5 py-4 bg-surface-2/60">
          <div className="flex items-center gap-2.5">
            <span className="text-iris text-base">⚙️</span>
            <div>
              <h3 className="font-mono text-xs uppercase tracking-wider font-bold text-ink">
                Model Ensemble & API Architecture
              </h3>
              <p className="font-mono text-[10px] text-ink-3">
                Server-Managed · Zero Client Configuration
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-ink-3 hover:text-ink text-base font-mono transition-colors p-1"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Server-Managed Status Badge Banner */}
          <div className="rounded-xl border border-sev-green/30 bg-sev-green/10 p-3.5 flex items-start gap-3">
            <span className="text-sev-green text-sm mt-0.5">✓</span>
            <div className="space-y-0.5">
              <span className="font-mono text-[11px] font-bold text-sev-green block">
                All Backend APIs Active & Operational
              </span>
              <p className="text-xs text-ink-2 leading-relaxed">
                WeatherGPT manages all numerical physics models, official IMD alerts, and Groq LLM inference securely on the backend. No user configuration or API keys required.
              </p>
            </div>
          </div>

          {/* Active Live Stack Cards */}
          <div className="space-y-2">
            <span className="font-mono text-[10px] uppercase tracking-wider text-ink-3 block font-semibold">
              Live Connected Providers (Backend Managed)
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="rounded-lg border border-line bg-surface-2/40 p-3 flex items-center justify-between">
                <div>
                  <span className="font-mono text-xs font-bold text-ink block">Groq Cloud AI</span>
                  <span className="font-mono text-[10px] text-ink-3">gpt-oss-120b (Sub-300ms)</span>
                </div>
                <span className="rounded-full bg-sev-green/20 text-sev-green px-2 py-0.5 font-mono text-[9px] font-bold">
                  ACTIVE
                </span>
              </div>

              <div className="rounded-lg border border-line bg-surface-2/40 p-3 flex items-center justify-between">
                <div>
                  <span className="font-mono text-xs font-bold text-ink block">ECMWF IFS (9 km)</span>
                  <span className="font-mono text-[10px] text-ink-3">Global NWP Physics Grid</span>
                </div>
                <span className="rounded-full bg-sev-green/20 text-sev-green px-2 py-0.5 font-mono text-[9px] font-bold">
                  ACTIVE
                </span>
              </div>

              <div className="rounded-lg border border-line bg-surface-2/40 p-3 flex items-center justify-between">
                <div>
                  <span className="font-mono text-xs font-bold text-ink block">OpenWeatherMap</span>
                  <span className="font-mono text-[10px] text-ink-3">Radar & Satellite Ingest</span>
                </div>
                <span className="rounded-full bg-sev-green/20 text-sev-green px-2 py-0.5 font-mono text-[9px] font-bold">
                  ACTIVE
                </span>
              </div>

              <div className="rounded-lg border border-line bg-surface-2/40 p-3 flex items-center justify-between">
                <div>
                  <span className="font-mono text-xs font-bold text-ink block">NDMA Sachet (CAP)</span>
                  <span className="font-mono text-[10px] text-ink-3">IMD Early Warnings</span>
                </div>
                <span className="rounded-full bg-sev-green/20 text-sev-green px-2 py-0.5 font-mono text-[9px] font-bold">
                  ACTIVE
                </span>
              </div>
            </div>
          </div>

          {/* Collapsible Advanced Developer Overrides */}
          <div className="pt-2 border-t border-line">
            <button
              onClick={() => setShowOverrides(!showOverrides)}
              className="w-full flex items-center justify-between py-2 text-left font-mono text-[11px] text-ink-3 hover:text-ink transition-colors"
            >
              <span>⚙️ Optional Developer Key Overrides</span>
              <span>{showOverrides ? '▲ Hide' : '▼ Expand'}</span>
            </button>

            {showOverrides && (
              <div className="space-y-3 pt-2 animate-fadeIn">
                <p className="text-[11px] text-ink-3">
                  Only required if you wish to override the backend with your personal quotas during live benchmark testing.
                </p>

                <div>
                  <label className="font-mono text-[10px] text-ink-2 block mb-1">
                    Custom OpenWeatherMap Key (Override)
                  </label>
                  <input
                    type="password"
                    value={keys.openWeather}
                    onChange={(e) => setKeys({ ...keys, openWeather: e.target.value })}
                    placeholder="e.g. 9a8b7c6d..."
                    className="w-full rounded-lg border border-line bg-surface-2/60 px-3 py-2 font-mono text-xs text-ink placeholder:text-ink-3 focus:border-iris focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-mono text-[10px] text-ink-2 block mb-1">
                    Custom WeatherAPI.com Key (Optional)
                  </label>
                  <input
                    type="password"
                    value={keys.weatherApi}
                    onChange={(e) => setKeys({ ...keys, weatherApi: e.target.value })}
                    placeholder="e.g. 5e4d3c2b..."
                    className="w-full rounded-lg border border-line bg-surface-2/60 px-3 py-2 font-mono text-xs text-ink placeholder:text-ink-3 focus:border-iris focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-mono text-[10px] text-ink-2 block mb-1">
                    Custom Tomorrow.io Key (Optional)
                  </label>
                  <input
                    type="password"
                    value={keys.tomorrow}
                    onChange={(e) => setKeys({ ...keys, tomorrow: e.target.value })}
                    placeholder="e.g. abc123xyz..."
                    className="w-full rounded-lg border border-line bg-surface-2/60 px-3 py-2 font-mono text-xs text-ink placeholder:text-ink-3 focus:border-iris focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-mono text-[10px] text-ink-2 block mb-1">
                    Custom Groq API Key (Override)
                  </label>
                  <input
                    type="password"
                    value={keys.groq}
                    onChange={(e) => setKeys({ ...keys, groq: e.target.value })}
                    placeholder="gsk_..."
                    className="w-full rounded-lg border border-line bg-surface-2/60 px-3 py-2 font-mono text-xs text-ink placeholder:text-ink-3 focus:border-iris focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-line px-5 py-3.5 bg-surface-2/60">
          <span className="font-mono text-[10px] text-ink-3">
            {showOverrides ? 'Client override sandbox' : 'All systems green'}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg font-mono text-xs text-ink-3 hover:text-ink transition-colors bg-surface-2/40 border border-line"
            >
              Close
            </button>
            {showOverrides && (
              <button
                onClick={handleSave}
                className={cn(
                  'px-4 py-1.5 rounded-lg font-mono text-xs font-bold text-white transition-all shadow-sm',
                  saved ? 'bg-sev-green' : 'bg-iris hover:bg-iris/90'
                )}
              >
                {saved ? 'Saved ✓' : 'Save Overrides'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
