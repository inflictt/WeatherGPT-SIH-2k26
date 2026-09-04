import { useState } from 'react'
import { useData, useActiveWarnings } from '../lib/DataContext'
import { useSavedLocations } from '../lib/useSavedLocations'
import { SEVERITY } from '../lib/constants'
import { cn } from '../lib/utils'
import WarningCard from '../components/warning/WarningCard'
import ShelterLocator from '../components/disaster/ShelterLocator'
import { Card, CardHead } from '../components/ui/Card'
import { SeverityChip } from '../components/ui/Severity'
import Reveal from '../components/ui/Reveal'
import { SectionTitle, Switch, Skeleton } from '../components/ui/Bits'

const TABS = [
  { key: 'active', label: 'Active Alerts' },
  { key: 'expired', label: 'Past / Expired' },
]

export default function Alerts({ lang = 'en', prefs }) {
  const [tab, setTab] = useState('active')
  const { warnings, loading, advice, location, mode } = useData()
  const activeList = useActiveWarnings()
  const saved = useSavedLocations(null)

  // "Severe events only" filters the list as well as gating push
  const severeOnly = Boolean(prefs?.severeOnly)
  const isSevere = (w) => w.severity === 'Severe' || w.severity === 'Extreme'

  // Active items combines real-time nowcasts + official NDMA alerts
  const activeItems = activeList.length > 0 ? activeList : (warnings || []).filter((w) => w.status === 'active')
  const expiredItems = (warnings || []).filter((w) => w.status !== 'active')
  const allCurrent = tab === 'active' ? activeItems : expiredItems

  const shown = allCurrent.filter((w) => !severeOnly || tab !== 'active' || isSevere(w))
  const hiddenByFilter = severeOnly
    ? activeItems.filter((w) => !isSevere(w)).length
    : 0

  const counts = {
    active: activeItems.length,
    expired: expiredItems.length,
  }

  const glossFor = (w) =>
    w.status === 'active'
      ? (advice?.warningMessage || advice?.riskExplanation || null)
      : null

  const alreadySaved = saved.rows.some(
    (r) => r.name === location?.name && r.district === location?.district,
  )

  return (
    <div className="shell space-y-10 py-10">
      <header>
        <Reveal>
          <div className="glass-pill inline-flex items-center gap-2 px-3 py-1 rounded-full font-mono text-xs text-amber-400 mb-3 border border-amber-400/30">
            <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
            <span>Official IMD & NDMA CAP Alerting Network</span>
          </div>
          <h1 className="headline text-heading text-ink">
            Official Warnings & Advisories
          </h1>
          <p className="mt-3 text-body-lg font-normal leading-relaxed text-ink-2 max-w-3xl">
            Issued by IMD, CWC and state disaster authorities, delivered in real-time through NDMA's
            Sachet CAP feed and WeatherGPT's multi-model nowcasting engine.
          </p>
        </Reveal>
      </header>

      <section>
        <Reveal>
          <div className="mb-6 flex items-center gap-2 glass-panel p-1.5 rounded-xl max-w-xs">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                aria-pressed={tab === t.key}
                className={cn(
                  'flex-1 py-2 px-3 rounded-lg font-mono text-xs font-semibold tracking-wider transition-all duration-200 flex items-center justify-center gap-2',
                  tab === t.key
                    ? 'bg-accent text-on-accent shadow-sm'
                    : 'text-ink-3 hover:text-ink hover:bg-raised/60',
                )}
              >
                <span>{t.label}</span>
                <span className={cn('px-1.5 py-0.2 rounded-full text-[10px] font-mono', tab === t.key ? 'bg-black/20 text-on-accent' : 'bg-raised text-ink-3')}>
                  {counts[t.key]}
                </span>
              </button>
            ))}
          </div>
        </Reveal>

        <div className="space-y-5">
          {loading &&
            [0, 1].map((i) => (
              <Card key={i} className="px-6 py-8" aria-busy="true">
                <Skeleton className="h-4 w-32 rounded-full" />
                <Skeleton className="mt-4 h-5 w-full rounded-md" />
                <Skeleton className="mt-3 h-4 w-3/4 rounded-md" />
              </Card>
            ))}

          {!loading &&
            shown.map((w, i) => (
              <Reveal key={w.identifier} delay={i * 70}>
                <WarningCard warning={w} gloss={glossFor(w)} />
              </Reveal>
            ))}

          {!loading && hiddenByFilter > 0 && (
            <p className="text-xs font-mono leading-relaxed text-ink-3 glass-pill p-3 rounded-xl">
              ⚠️ {hiddenByFilter} advisory {hiddenByFilter === 1 ? 'is' : 'are'} hidden
              by “severe events only”. Turn it off in Settings to see all warnings.
            </p>
          )}

          {!loading && shown.length === 0 && (
            <Card className="px-6 py-12 text-center">
              <div className="text-3xl mb-2">🌤️</div>
              <p className="font-display text-lg font-medium text-ink">
                No {tab} warnings for {location?.name || 'your location'}.
              </p>
              <p className="mt-2 text-xs font-mono text-ink-3 max-w-md mx-auto">
                {tab === 'active'
                  ? 'Atmospheric parameters are currently below hazard thresholds. Live radar and NDMA feeds are scanned every 5 minutes.'
                  : 'Expired warnings are kept for audit and appear here once lapsed.'}
              </p>
            </Card>
          )}
        </div>
      </section>

      <section>
        <Reveal>
          <ShelterLocator
            lat={location?.lat}
            lon={location?.lon}
            activeWarning={activeItems.length > 0 ? activeItems[0] : null}
          />
        </Reveal>
      </section>

      <section>
        <Reveal>
          <SectionTitle>Where you get alerted</SectionTitle>
        </Reveal>
        <Reveal delay={60}>
          <Card>
            <CardHead
              label="Saved locations"
              meta={saved.persisted ? 'Synced to your account' : 'This device only'}
            />

            {saved.rows.length === 0 ? (
              <div className="px-5 pb-5 pt-3">
                <p className="text-[13px] leading-relaxed text-ink-3">
                  No saved locations yet. Save one to be told when a severe
                  warning is issued for it.
                </p>
                {location && (
                  <button
                    type="button"
                    onClick={() => saved.add(location)}
                    className="mt-3 rounded-full bg-accent px-4 py-2 text-[13px] text-on-accent transition-opacity duration-200 hover:opacity-90"
                  >
                    Save {location.name}
                  </button>
                )}
              </div>
            ) : (
              <ul className="px-5 pb-4 pt-2">
                {saved.rows.map((l) => (
                  <li
                    key={l.id}
                    className="flex items-center gap-4 border-b border-line-soft py-3.5 last:border-b-0"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[14px] text-ink">{l.name}</div>
                      <div className="font-mono text-[10px] uppercase tracking-[0.11em] text-ink-3">
                        {[l.district && `${l.district} district`, l.state]
                          .filter(Boolean)
                          .join(', ')}
                      </div>
                    </div>
                    <Switch
                      on={l.active !== false}
                      label={`Alerts for ${l.name}`}
                      onChange={() => saved.toggle(l.id)}
                    />
                    <button
                      type="button"
                      onClick={() => saved.remove(l.id)}
                      aria-label={`Remove ${l.name}`}
                      className="tap flex-none text-ink-3 transition-colors duration-200 hover:text-sev-red"
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor"
                        strokeWidth="1.6" strokeLinecap="round">
                        <path d="M6 6l12 12M18 6L6 18" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="border-t border-line-soft px-5 py-3">
              <p className="text-[12.5px] leading-relaxed text-ink-3">
                {saved.persisted
                  ? 'You are notified once per warning. An update re-notifies only when severity or validity changes.'
                  : 'These are stored on this device only. Sign in to receive push notifications when the app is closed.'}
              </p>
              {location && saved.rows.length > 0 && !alreadySaved && (
                <button
                  type="button"
                  onClick={() => saved.add(location)}
                  className="mt-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3 transition-colors duration-200 hover:text-accent"
                >
                  + Add {location.name}
                </button>
              )}
            </div>
          </Card>
        </Reveal>
      </section>

      <section>
        <Reveal>
          <SectionTitle>Advisory Colour Matrix</SectionTitle>
        </Reveal>
        <Reveal delay={60}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {['green', 'yellow', 'orange', 'red'].map((k) => (
              <div
                key={k}
                className={cn(
                  'relative overflow-hidden rounded-2xl border border-line glass-panel p-5 backdrop-blur-md shadow-lg transition-all duration-250 hover:-translate-y-0.5',
                  k === 'red' ? 'hover:border-sev-red/50' : k === 'orange' ? 'hover:border-sev-orange/50' : k === 'yellow' ? 'hover:border-sev-yellow/50' : 'hover:border-accent/40',
                )}
              >
                <div className={cn('absolute left-0 top-0 bottom-0 w-1.5', SEVERITY[k].bg)} />
                <SeverityChip tone={k} size="sm">
                  {SEVERITY[k].label}
                </SeverityChip>
                <p className="mt-3 text-[14.5px] font-semibold text-ink">{SEVERITY[k].action}</p>
                <p className="mt-1.5 text-xs font-mono leading-relaxed text-ink-3">
                  {k === 'green' && 'Normal conditions. No weather action required.'}
                  {k === 'yellow' && 'Moderate weather, 64.5–115.5 mm rain in 24 h. Stay updated.'}
                  {k === 'orange' && 'Severe weather, 115.6–204.4 mm rain. Prepare for disruptions.'}
                  {k === 'red' && 'Extreme emergency, over 204.5 mm rain. Follow civil directives.'}
                </p>
              </div>
            ))}
          </div>
        </Reveal>
      </section>
    </div>

  )
}
