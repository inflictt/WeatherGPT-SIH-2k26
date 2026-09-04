import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useActiveWarnings, useData } from '../lib/DataContext'
import WarningBanner from '../components/warning/WarningBanner'
import LandingHero from '../components/weather/LandingHero'
import Hero from '../components/weather/Hero'
import TelemetryGauges from '../components/weather/TelemetryGauges'
import HourlyPills from '../components/weather/HourlyPills'
import DailyList from '../components/weather/DailyList'
import MultiHazardMatrix from '../components/risk/MultiHazardMatrix'
import StatusTiles from '../components/weather/StatusTiles'
import ConfidencePanel from '../components/weather/ConfidencePanel'
import Recommendations from '../components/weather/Recommendations'
import RiskPanel from '../components/risk/RiskPanel'
import MonthlyForecast from '../components/weather/MonthlyForecast'
import Reveal from '../components/ui/Reveal'
import { SectionTitle } from '../components/ui/Bits'
import { formatters } from '../lib/usePreferences'
import { cn } from '../lib/utils'

export default function Home({ persona, setPersona, prefs, picker }) {
  const active = useActiveWarnings()
  const { summary24h, risk, location } = useData()
  const fmt = formatters(prefs?.units)
  const [activeTab, setActiveTab] = useState('overview') // 'overview' | '24h' | '7day' | 'agro' | 'monthly'
  const [searchQuery, setSearchQuery] = useState('')

  const handleOpenLocationModal = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('open-location-picker'))
    }
  }

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    picker?.setSearch?.(searchQuery)
    handleOpenLocationModal()
  }

  const handleSelectCity = (city) => {
    picker?.select?.(city)
  }

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Official CAP Warning Banner */}
      <WarningBanner warning={active[0]} />

      {/* 2. Cinematic Atmospheric Intelligence Landing Hero */}
      <LandingHero prefs={prefs} onOpenLocationModal={handleOpenLocationModal} />

      {/* 3. TODAY'S WEATHER OUTLOOK & Telemetry Grid matching Image 2 */}
      <div className="shell space-y-4 pt-1">
        {/* Section Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 text-[#38bdf8] font-mono text-xs font-bold tracking-wider">
              <span>✨</span>
              <span>TODAY'S WEATHER OUTLOOK</span>
            </div>
            <p className="text-xs text-[#94a3b8] font-mono">
              {location?.name
                ? `Real-time meteorological projections & telemetry for ${location.name}, ${location.country || 'India'}.`
                : 'Please select a city or use your GPS location to load real-time atmospheric intelligence.'}
            </p>
          </div>

          <button
            onClick={() => {
              if (picker?.refresh) picker.refresh()
              else window.location.reload()
            }}
            className="p-2 rounded-xl text-[#64748b] hover:text-white hover:bg-[#111726] border border-[#1e293b]/60 transition-colors"
            title="Refresh Meteorological Telemetry"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {/* 2-Column Split: Left (Temp Curve) & Right (Gauges) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          <div className="lg:col-span-6 xl:col-span-6">
            <Reveal>
              <Hero prefs={prefs} onSelectCity={handleSelectCity} />
            </Reveal>
          </div>

          <div className="lg:col-span-6 xl:col-span-6">
            <Reveal delay={50}>
              <div className="h-full rounded-[24px] border border-[#1e293b]/80 bg-[#090d16] p-6 shadow-xl flex flex-col justify-between space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#1e293b]/60">
                  <h3 className="font-mono text-xs uppercase tracking-wider font-bold text-[#94a3b8]">
                    ATMOSPHERIC CONDITIONS & GAUGES
                  </h3>
                  <span className="font-mono text-[10px] text-[#64748b] uppercase tracking-wider">
                    {location?.name ? 'Live Telemetry' : 'Pending Selection'}
                  </span>
                </div>
                <TelemetryGauges />
              </div>
            </Reveal>
          </div>
        </div>
      </div>

      {/* 4. Top Search & Subview Header Bar */}
      <div className="shell pt-2">
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          {/* Search Input Box */}
          <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[280px] max-w-xl relative">
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-ink-3 text-sm pointer-events-none">🔍</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Indian city (e.g. Pune, Jaipur, Surat)..."
                className="w-full rounded-2xl border border-line bg-surface/80 py-2.5 pl-10 pr-4 font-mono text-xs text-ink placeholder:text-ink-3 focus:border-cyanSignal focus:outline-none transition-all shadow-sm backdrop-blur-md"
              />
            </div>
          </form>

          {/* Subview Filter Tabs */}
          <div className="flex items-center gap-1.5 rounded-2xl border border-line bg-surface/80 p-1 backdrop-blur-md shadow-sm">
            <button
              onClick={() => setActiveTab('overview')}
              className={cn(
                'rounded-xl px-3.5 py-1.5 font-mono text-xs font-semibold transition-all',
                activeTab === 'overview'
                  ? 'bg-accent text-on-accent shadow-sm'
                  : 'text-ink-3 hover:text-ink'
              )}
            >
              Overview
            </button>

            <button
              onClick={() => setActiveTab('24h')}
              className={cn(
                'rounded-xl px-3.5 py-1.5 font-mono text-xs font-semibold transition-all',
                activeTab === '24h'
                  ? 'bg-accent text-on-accent shadow-sm'
                  : 'text-ink-3 hover:text-ink'
              )}
            >
              24-Hour
            </button>

            <button
              onClick={() => setActiveTab('7day')}
              className={cn(
                'rounded-xl px-3.5 py-1.5 font-mono text-xs font-semibold transition-all',
                activeTab === '7day'
                  ? 'bg-accent text-on-accent shadow-sm'
                  : 'text-ink-3 hover:text-ink'
              )}
            >
              7-Day
            </button>

            <button
              onClick={() => setActiveTab('agro')}
              className={cn(
                'rounded-xl px-3.5 py-1.5 font-mono text-xs font-semibold transition-all',
                activeTab === 'agro'
                  ? 'bg-accent text-on-accent shadow-sm'
                  : 'text-ink-3 hover:text-ink'
              )}
            >
              Agro-Risk
            </button>

            <button
              onClick={() => setActiveTab('monthly')}
              className={cn(
                'rounded-xl px-3.5 py-1.5 font-mono text-xs font-semibold transition-all',
                activeTab === 'monthly'
                  ? 'bg-accent text-on-accent shadow-sm'
                  : 'text-ink-3 hover:text-ink'
              )}
            >
              Monthly
            </button>
          </div>
        </div>
      </div>

      {/* 6. Subview Content Panels */}
      <div className="shell space-y-10 pt-2">
        {/* 24-Hour Graph View */}
        {activeTab === '24h' && (
          <Reveal>
            <HourlyPills />
          </Reveal>
        )}

        {/* 7-Day Detailed View */}
        {activeTab === '7day' && (
          <Reveal>
            <DailyList />
          </Reveal>
        )}

        {/* Agro-Risk View */}
        {activeTab === 'agro' && (
          <Reveal>
            <MultiHazardMatrix />
          </Reveal>
        )}

        {/* Monthly Forecast View */}
        {activeTab === 'monthly' && (
          <Reveal>
            <MonthlyForecast prefs={prefs} />
          </Reveal>
        )}

        {/* Default Overview View */}
        {activeTab === 'overview' && (
          <>
            {/* Status Tiles: Right now what to do */}
            <section>
              <Reveal>
                <SectionTitle>Actionable Operational Directives</SectionTitle>
              </Reveal>
              <Reveal delay={60}>
                <StatusTiles forecast={summary24h} risk={risk} fmt={fmt} />
              </Reveal>
            </section>

            {/* Risk & Confidence Assessment */}
            <section>
              <Reveal>
                <SectionTitle
                  aside={
                    <Link
                      to="/alerts"
                      className="-my-2 inline-flex min-h-[44px] items-center font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 transition-colors duration-250 hover:text-amber-400"
                    >
                      {active.length} active {active.length === 1 ? 'warning' : 'warnings'} →
                    </Link>
                  }
                >
                  Physics Confidence & Sector Analysis
                </SectionTitle>
              </Reveal>

              <div className="grid gap-4 lg:grid-cols-2">
                <Reveal delay={60}>
                  <RiskPanel />
                </Reveal>
                <div className="space-y-4">
                  <Reveal delay={120}>
                    <ConfidencePanel />
                  </Reveal>
                  <Reveal delay={180}>
                    <Recommendations persona={persona} setPersona={setPersona} />
                  </Reveal>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  )
}
