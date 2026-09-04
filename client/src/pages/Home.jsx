import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useActiveWarnings, useData } from '../lib/DataContext'
import WarningBanner from '../components/warning/WarningBanner'
import Hero from '../components/weather/Hero'
import ForecastPanel from '../components/weather/ForecastPanel'
import StatusTiles from '../components/weather/StatusTiles'
import DailyList from '../components/weather/DailyList'
import ConfidencePanel from '../components/weather/ConfidencePanel'
import Recommendations from '../components/weather/Recommendations'
import RiskPanel from '../components/risk/RiskPanel'
import MonthlyForecast from '../components/weather/MonthlyForecast'
import Reveal from '../components/ui/Reveal'
import { SectionTitle } from '../components/ui/Bits'
import { formatters } from '../lib/usePreferences'

export default function Home({ persona, setPersona, prefs }) {
  const active = useActiveWarnings()
  const { mode, degraded, error, summary24h, risk } = useData()
  const fmt = formatters(prefs?.units)
  const [activeTab, setActiveTab] = useState('monthly') // 'monthly' | 'overview' | 'hourly' | '7day'

  return (
    <div className="space-y-8 pb-12">
      {/* 1. Official CAP Warning Banner (Invariant: Top Priority) */}
      <WarningBanner warning={active[0]} />

      {/* 2. Weather Hero Section */}
      <Hero prefs={prefs} />



      {/* 3. Navigation View Switcher (Origin Financial Style) */}
      <div className="shell">
        <div className="glass-panel p-2 rounded-xl flex flex-wrap items-center justify-center sm:justify-start gap-2">
          <button
            onClick={() => setActiveTab('monthly')}
            className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
              activeTab === 'monthly'
                ? 'bg-accent text-on-accent font-semibold shadow-sm'
                : 'text-ink-3 hover:text-ink hover:bg-raised'
            }`}
          >
            <span>📅</span>
            <span>Monthly Forecast</span>
          </button>

          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
              activeTab === 'overview'
                ? 'bg-accent text-on-accent font-semibold shadow-sm'
                : 'text-ink-3 hover:text-ink hover:bg-raised'
            }`}
          >
            <span>⚡</span>
            <span>Actionable Advice & Risk</span>
          </button>

          <button
            onClick={() => setActiveTab('hourly')}
            className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
              activeTab === 'hourly'
                ? 'bg-accent text-on-accent font-semibold shadow-sm'
                : 'text-ink-3 hover:text-ink hover:bg-raised'
            }`}
          >
            <span>⏱️</span>
            <span>24-Hour Graph</span>
          </button>

          <button
            onClick={() => setActiveTab('7day')}
            className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
              activeTab === '7day'
                ? 'bg-accent text-on-accent font-semibold shadow-sm'
                : 'text-ink-3 hover:text-ink hover:bg-raised'
            }`}
          >
            <span>📊</span>
            <span>7-Day Detailed</span>
          </button>
        </div>
      </div>

      {/* 4. Tab Content */}
      <div className="shell space-y-12">
        {/* Monthly Forecast View */}
        {activeTab === 'monthly' && (
          <Reveal>
            <MonthlyForecast prefs={prefs} />
          </Reveal>
        )}

        {/* 24-Hour Graph View */}
        {activeTab === 'hourly' && (
          <Reveal>
            <ForecastPanel prefs={prefs} />
          </Reveal>
        )}

        {/* 7-Day Detailed View */}
        {activeTab === '7day' && (
          <Reveal>
            <DailyList prefs={prefs} />
          </Reveal>
        )}

        {/* Actionable Advice & Status Section (Always visible or in Overview) */}
        <section>
          <Reveal>
            <SectionTitle>Right now, what to do</SectionTitle>
          </Reveal>
          <Reveal delay={60}>
            <StatusTiles forecast={summary24h} risk={risk} fmt={fmt} />
          </Reveal>
        </section>

        {/* What this weather means: Risk + Uncertainty */}
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
              What this weather means
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

        {/* Extended Grid Overview when not in single tab */}
        {activeTab === 'overview' && (
          <section>
            <Reveal>
              <SectionTitle>Extended Outlook</SectionTitle>
            </Reveal>
            <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
              <Reveal delay={60}>
                <ForecastPanel prefs={prefs} />
              </Reveal>
              <Reveal delay={120}>
                <DailyList prefs={prefs} />
              </Reveal>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
