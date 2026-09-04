import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useActiveWarnings, useData } from '../lib/DataContext'
import WarningBanner from '../components/warning/WarningBanner'
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

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    picker?.setSearch?.(searchQuery)
    picker?.open?.()
  }

  const handleSelectCity = (city) => {
    picker?.select?.(city)
  }

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Official CAP Warning Banner */}
      <WarningBanner warning={active[0]} />

      {/* 2. Top Search & Subview Header Bar */}
      <div className="shell">
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          {/* Search Input Box */}
          <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[280px] max-w-xl relative">
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-ink-3 text-sm pointer-events-none">🔍</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Indian city (e.g. Pune, Jaipur, Surat)..."
                className="w-full rounded-2xl border border-line bg-surface/80 py-2.5 pl-10 pr-4 font-mono text-xs text-ink placeholder:text-ink-3 focus:border-amber-400 focus:outline-none transition-all shadow-sm backdrop-blur-md"
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

      {/* 3. Main Hero Card with Bezier Spline */}
      <Hero prefs={prefs} onSelectCity={handleSelectCity} />

      {/* 4. 5 Telemetry Gauges Cluster */}
      <div className="shell">
        <Reveal delay={50}>
          <TelemetryGauges />
        </Reveal>
      </div>

      {/* 5. Subview Content Panels */}
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
