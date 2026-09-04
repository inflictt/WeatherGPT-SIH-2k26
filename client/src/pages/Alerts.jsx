import { useState } from 'react'
import { useData } from '../lib/DataContext'
import { useSavedLocations } from '../lib/useSavedLocations'
import { SEVERITY } from '../lib/constants'
import { cn } from '../lib/utils'
import WarningCard from '../components/warning/WarningCard'
import { Card, CardHead } from '../components/ui/Card'
import { SeverityChip } from '../components/ui/Severity'
import Reveal from '../components/ui/Reveal'
import { SectionTitle, Switch, Skeleton } from '../components/ui/Bits'

const TABS = [
  { key: 'active', label: 'Active' },
  { key: 'expired', label: 'Expired' },
]

export default function Alerts({ lang = 'en', prefs }) {
  const [tab, setTab] = useState('active')
  const { warnings, loading, advice, location, mode } = useData()
  const saved = useSavedLocations(null)

  // "Severe events only" filters the list as well as gating push. Yellow is
  // still counted in the tab so nothing is hidden without saying so.
  const severeOnly = Boolean(prefs?.severeOnly)
  const isSevere = (w) => w.severity === 'Severe' || w.severity === 'Extreme'
  const shown = warnings
    .filter((w) => (tab === 'active' ? w.status === 'active' : w.status !== 'active'))
    .filter((w) => !severeOnly || tab !== 'active' || isSevere(w))
  const hiddenByFilter = severeOnly
    ? warnings.filter((w) => w.status === 'active' && !isSevere(w)).length
    : 0
  const counts = {
    active: warnings.filter((w) => w.status === 'active').length,
    expired: warnings.filter((w) => w.status !== 'active').length,
  }

  // The plain-language gloss comes from the composer, and only ever applies to
  // the warning it was actually composed for — the most severe active one.
  // A hardcoded per-identifier map (which is what this replaced) would attach
  // the wrong explanation to any warning it had not seen before, which is worse
  // than attaching none.
  const glossFor = (w) =>
    w.status === 'active' && w.identifier === warnings.find((x) => x.status === 'active')?.identifier
      ? advice?.warningMessage
      : null

  const alreadySaved = saved.rows.some(
    (r) => r.name === location?.name && r.district === location?.district,
  )

  return (
    <div className="shell space-y-12 py-10">
      <header>
        <Reveal>
          <h1 className="headline text-heading text-ink">
            Official warnings
          </h1>
          <p className="mt-4 text-body-lg font-normal leading-relaxed text-ink-2">
            Issued by IMD, CWC and state disaster authorities, delivered through NDMA's
            Sachet CAP feed. Text is reproduced exactly as received — WeatherGPT adds a
            plain-language reading beside it, never in place of it.
          </p>
        </Reveal>
      </header>

      <section>
        <Reveal>
          <div className="mb-5 flex items-center gap-1 border-b border-line-soft">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                aria-pressed={tab === t.key}
                className={cn(
                  'relative px-3 py-3 font-mono text-[11px] uppercase tracking-[0.13em] transition-colors duration-250',
                  tab === t.key ? 'text-ink' : 'text-ink-3 hover:text-ink-2',
                )}
              >
                {t.label}
                <span className="ml-2 tnum text-ink-3">{counts[t.key]}</span>
                <span
                  className={cn(
                    'absolute inset-x-2 -bottom-px h-px origin-left bg-accent transition-transform duration-300 ease-out',
                    tab === t.key ? 'scale-x-100' : 'scale-x-0',
                  )}
                />
              </button>
            ))}
          </div>
        </Reveal>

        <div className="space-y-4">
          {loading &&
            [0, 1].map((i) => (
              <Card key={i} className="px-5 py-6" aria-busy="true">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="mt-4 h-4 w-full" />
                <Skeleton className="mt-2 h-4 w-3/4" />
              </Card>
            ))}

          {!loading &&
            shown.map((w, i) => (
              <Reveal key={w.identifier} delay={i * 70}>
                <WarningCard warning={w} gloss={glossFor(w)} />
              </Reveal>
            ))}

          {!loading && hiddenByFilter > 0 && (
            <p className="text-[12.5px] leading-relaxed text-ink-3">
              {hiddenByFilter} yellow {hiddenByFilter === 1 ? 'warning is' : 'warnings are'} hidden
              by “severe events only”. Turn it off in Settings to see {hiddenByFilter === 1 ? 'it' : 'them'}.
            </p>
          )}

          {!loading && shown.length === 0 && (
            <Card className="px-5 py-10 text-center">
              <p className="font-display text-subheading font-light text-ink-2">
                No {tab} warnings for {location?.name || 'your location'}.
              </p>
              <p className="mt-1.5 text-[13px] text-ink-3">
                {tab === 'active'
                  ? 'That is the normal state. The Sachet feed is checked every five minutes.'
                  : 'Expired warnings are kept for audit and appear here once they lapse.'}
              </p>
            </Card>
          )}
        </div>
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
          <SectionTitle>Colour code</SectionTitle>
        </Reveal>
        <Reveal delay={60}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {['green', 'yellow', 'orange', 'red'].map((k) => (
              <Card
                key={k}
                className={cn('border-l-2 px-4 py-4', SEVERITY[k].ring.replace('border-', 'border-l-'))}
              >
                <SeverityChip tone={k} size="sm">
                  {SEVERITY[k].label}
                </SeverityChip>
                <p className="mt-2.5 text-[14px] text-ink">{SEVERITY[k].action}</p>
                <p className="mt-1 text-[12.5px] leading-relaxed text-ink-3">
                  {k === 'green' && 'Normal conditions. Nothing to do.'}
                  {k === 'yellow' && 'Heavy rain, 64.5–115.5 mm in 24 h. Stay updated.'}
                  {k === 'orange' && 'Very heavy rain, 115.6–204.4 mm. Prepare for disruption.'}
                  {k === 'red' && 'Extremely heavy rain, over 204.5 mm. Follow administration instructions.'}
                </p>
              </Card>
            ))}
          </div>
        </Reveal>
      </section>

      {mode !== 'live' && (
        <p className="text-[12.5px] leading-relaxed text-ink-3">
          Running on bundled sample data. Set <code className="font-mono">VITE_API_URL</code>{' '}
          to see the live NDMA Sachet feed.
        </p>
      )}
    </div>
  )
}
