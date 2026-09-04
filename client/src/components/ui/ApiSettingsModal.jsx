import { useState, useEffect } from 'react'
import { Card, CardHead } from './Card'
import { cn } from '../../lib/utils'

export default function ApiSettingsModal({ isOpen, onClose }) {
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
    }, 1200)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl glass-panel border border-line shadow-2xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5 bg-surface-2/50">
          <div className="flex items-center gap-2">
            <span className="text-iris">⚙️</span>
            <h3 className="font-mono text-xs uppercase tracking-wider font-bold text-ink">
              Ensemble Fusion & API Keys
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-ink-3 hover:text-ink text-sm font-mono transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Active Model Stack Status */}
          <div className="rounded-xl border border-line bg-surface/50 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-semibold text-ink">Base Physics Ensemble</span>
              <span className="rounded-full bg-sev-green/20 text-sev-green px-2 py-0.5 font-mono text-[9px] font-bold">
                ACTIVE · ZERO CONFIG
              </span>
            </div>
            <p className="text-xs text-ink-2 leading-relaxed">
              Fuses <strong>ECMWF IFS (9 km)</strong>, <strong>NOAA GFS</strong>, and <strong>DWD ICON</strong> via high-resolution physics grids. No keys required.
            </p>
          </div>

          {/* Optional Key Overrides */}
          <div className="space-y-3 pt-1">
            <span className="font-mono text-[10.5px] uppercase tracking-wider text-ink-3 block">
              Optional Custom Provider Keys (Override)
            </span>

            <div>
              <label className="font-mono text-[10px] text-ink-2 block mb-1">
                OpenWeatherMap API Key (Radar / Satellite)
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
                WeatherAPI.com Key (1M free tier)
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
                Tomorrow.io API Key (100m high-res)
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
                Groq API Key (Sub-second LLM inference)
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
        </div>

        <div className="flex items-center justify-between border-t border-line px-5 py-3.5 bg-surface-2/50">
          <span className="font-mono text-[10px] text-ink-3">
            Keys stored securely in client sandbox
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg font-mono text-xs text-ink-3 hover:text-ink transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className={cn(
                'px-4 py-1.5 rounded-lg font-mono text-xs font-bold text-white transition-all shadow-sm',
                saved ? 'bg-sev-green' : 'bg-iris hover:bg-iris/90'
              )}
            >
              {saved ? 'Saved ✓' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
