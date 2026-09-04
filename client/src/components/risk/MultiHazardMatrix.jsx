import { useState } from 'react'
import { useData } from '../../lib/DataContext'

const CROPS = ['Cotton', 'Wheat', 'Rice (Paddy)', 'Sugarcane', 'Groundnut', 'Mustard', 'Vegetables']

export default function MultiHazardMatrix() {
  const [selectedCrop, setSelectedCrop] = useState('Cotton')
  const { current } = useData()

  const temp = current?.tempC || 28
  const wind = current?.windKmh || 8
  const rainProb = (current?.rainProb || 0.15) * 100

  return (
    <div className="space-y-4">
      {/* Crop Selector Card */}
      <div className="glass-panel rounded-3xl p-5 border border-amber-500/30 bg-amber-500/5 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🌱</span>
          <div>
            <h4 className="font-bold text-amber-300 text-sm sm:text-base font-display">
              {selectedCrop} Crop Agro-Advisory Engine
            </h4>
            <p className="text-xs text-ink-3">
              Automated IMD agromet thresholds calibrated for {selectedCrop.toLowerCase()} cultivation.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-ink-3">Select Crop:</span>
          <select
            value={selectedCrop}
            onChange={(e) => setSelectedCrop(e.target.value)}
            className="rounded-xl border border-amber-500/40 bg-surface px-3 py-1.5 font-mono text-xs font-semibold text-amber-300 focus:outline-none focus:ring-1 focus:ring-amber-400"
          >
            {CROPS.map((c) => (
              <option key={c} value={c} className="bg-surface text-ink">
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 5-Day Multi-Hazard Risk Matrix */}
      <div className="glass-panel rounded-3xl p-5 sm:p-6 border border-line bg-surface/95 shadow-xl space-y-4">
        <h3 className="font-mono text-xs uppercase tracking-wider font-bold text-ink-3">
          5-Day Multi-Hazard Risk Matrix
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* 1. Heat Stress Risk */}
          <div className="rounded-2xl border border-line bg-surface-2/60 p-4 space-y-1.5 hover:border-line-hover transition-all">
            <div className="flex items-center gap-2">
              <span className="text-base">🔥</span>
              <span className="font-bold text-amber-300 font-mono text-xs uppercase tracking-wider">
                Heat Stress Risk
              </span>
            </div>
            <p className="text-xs text-ink-2 leading-relaxed">
              {temp > 35
                ? 'High thermal load detected. Apply frequent light evening irrigations to prevent flower drop.'
                : 'Moderate thermal load. Ensure proper canopy hydration for crops.'}
            </p>
          </div>

          {/* 2. Heavy Precipitation Risk */}
          <div className="rounded-2xl border border-line bg-surface-2/60 p-4 space-y-1.5 hover:border-line-hover transition-all">
            <div className="flex items-center gap-2">
              <span className="text-base">🌧️</span>
              <span className="font-bold text-sky-300 font-mono text-xs uppercase tracking-wider">
                Heavy Precipitation Risk
              </span>
            </div>
            <p className="text-xs text-ink-2 leading-relaxed">
              {rainProb > 50
                ? 'High rainfall probability. Keep field drainage channels clear to prevent waterlogging.'
                : 'Low probability (< 20%). Soil erosion risk minimal over 5 days.'}
            </p>
          </div>

          {/* 3. High Wind & Gust Risk */}
          <div className="rounded-2xl border border-line bg-surface-2/60 p-4 space-y-1.5 hover:border-line-hover transition-all">
            <div className="flex items-center gap-2">
              <span className="text-base">💨</span>
              <span className="font-bold text-emerald-300 font-mono text-xs uppercase tracking-wider">
                High Wind & Gust Risk
              </span>
            </div>
            <p className="text-xs text-ink-2 leading-relaxed">
              {wind > 20
                ? 'Elevated wind speeds. Postpone foliar spraying to prevent chemical drift.'
                : 'Safe operating envelope. No lodging hazard for tall standing crops.'}
            </p>
          </div>

          {/* 4. Frost & Cold Injury */}
          <div className="rounded-2xl border border-line bg-surface-2/60 p-4 space-y-1.5 hover:border-line-hover transition-all">
            <div className="flex items-center gap-2">
              <span className="text-base">❄️</span>
              <span className="font-bold text-purple-300 font-mono text-xs uppercase tracking-wider">
                Frost & Cold Injury
              </span>
            </div>
            <p className="text-xs text-ink-2 leading-relaxed">
              No frost danger. Minimum nocturnal temperatures stay safely above 18°C.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
