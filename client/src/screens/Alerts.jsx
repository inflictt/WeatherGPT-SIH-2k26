import { useState } from 'react'
import { useData } from '../lib/DataContext'
import { SEVERITY, RAINFALL_BANDS } from '../lib/constants'
import { hhmm, cn } from '../lib/utils'
import Icon from '../ui/Icon'
import { Card, CardHead, CardBody, Shell, PageHead, SubTabs, Skeleton } from '../ui/Bits'
import { SeverityTile, SeverityChip } from '../ui/Severity'
import Reveal from '../ui/Reveal'
import SavedLocations from '../shell/SavedLocations'
import { useAuth } from '../lib/useAuth'

/**
 * Official warnings.
 *
 * The one screen with a rule that overrides every design decision: `headline`,
 * `description` and `instruction` are reproduced **exactly** as issued. No
 * summarising, no re-timing, no merging. The plain-language reading sits in a
 * separate, labelled block beside them — never in place of them — because the
 * official wording is what someone will be held to.
 */
export default function Alerts({ prefs, lang = 'en' }) {
  const { warnings, advice, location, loading, mode } = useData()
  const auth = useAuth()
  const [tab, setTab] = useState('active')
  const [open, setOpen] = useState(0)

  const severeOnly = Boolean(prefs?.severeOnly)
  const isSevere = (w) => w.severity === 'Severe' || w.severity === 'Extreme'

  const shown = (warnings || [])
    .filter((w) => (tab === 'active' ? w.status === 'active' : w.status !== 'active'))
    .filter((w) => !severeOnly || tab !== 'active' || isSevere(w))

  const hidden = severeOnly
    ? (warnings || []).filter((w) => w.status === 'active' && !isSevere(w)).length
    : 0

  const counts = {
    active: (warnings || []).filter((w) => w.status === 'active').length,
    expired: (warnings || []).filter((w) => w.status !== 'active').length,
  }

  // The gloss only ever belongs to the warning it was composed for — the most
  // severe active one. A per-identifier map would attach the wrong explanation
  // to any warning it had not seen, which is worse than attaching none.
  const glossFor = (w) =>
    w.status === 'active' && w.identifier === (warnings || []).find((x) => x.status === 'active')?.identifier
      ? advice?.warningMessage
      : null

  return (
    <Shell className="space-y-4 pb-8">
      <PageHead
        eyebrow={`NDMA Sachet · CAP 1.2 · ${location?.name || ''}`}
        title="Warnings"
      >
        Issued by IMD, CWC and state disaster authorities. Text is reproduced exactly as
        received — WeatherGPT adds a plain-language reading beside it, never in place of it.
      </PageHead>

      <SubTabs
        value={tab}
        onChange={setTab}
        tabs={[
          { key: 'active', label: `Active · ${counts.active}` },
          { key: 'expired', label: `Expired · ${counts.expired}` },
        ]}
      />

      <div className="space-y-3 pt-1">
        {loading && [0, 1].map((i) => <Skeleton key={i} className="h-[120px] rounded-xl" />)}

        {!loading &&
          shown.map((w, i) => {
            const sev = SEVERITY[w.colour] || SEVERITY.green
            const isOpen = open === i
            const expired = w.status !== 'active'
            return (
              <Reveal key={w.identifier} delay={i * 60}>
                <Card className={cn('overflow-hidden', expired && 'opacity-70')} tone>
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    className={cn('flex w-full items-start gap-3.5 p-4 text-left sm:p-5', !expired && sev.wash)}
                  >
                    <SeverityTile tone={expired ? 'green' : w.colour} size={42} />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className={cn('lbl', expired ? 'text-ink-3' : sev.text)}>
                          {expired ? 'Expired' : `${sev.label} · ${sev.action}`}
                        </span>
                        <span className="lbl">
                          {w.expires ? `Until ${hhmm(w.expires)}` : ''}
                        </span>
                      </span>
                      <span className="mt-1 block text-subheading font-semibold leading-snug tracking-[-0.02em] text-ink">
                        {w.event}
                      </span>
                      <span className="mt-1 block text-data text-ink-3">
                        {w.area?.description || w.sender}
                      </span>
                    </span>
                    <Icon
                      name="chevronDown"
                      size={16}
                      className={cn('mt-1 flex-none text-ink-3 transition-transform duration-200', isOpen && 'rotate-180')}
                    />
                  </button>

                  {isOpen && (
                    <div className="grid gap-0 border-t border-line-soft lg:grid-cols-[1.5fr_1fr]">
                      {/* --- verbatim CAP text --- */}
                      <div className="space-y-4 p-5 lg:border-r lg:border-line-soft">
                        <div className="flex items-center gap-2">
                          <span className="lbl">Official text — unedited</span>
                        </div>
                        {[
                          ['Headline', w.headline],
                          ['Description', w.description],
                          ['Instruction', w.instruction],
                        ].map(([k, v]) =>
                          v ? (
                            <div key={k}>
                              <div className="lbl">{k}</div>
                              <p className="mt-1 border-l-2 border-line pl-3 text-data leading-relaxed text-ink-2">
                                {v}
                              </p>
                            </div>
                          ) : null,
                        )}

                        {/* --- the gloss, separately labelled --- */}
                        {glossFor(w) && (
                          <div className="rounded-lg border border-accent/30 bg-accent-soft p-3.5">
                            <div className="lbl text-accent">Plain language · added by WeatherGPT</div>
                            <p className="mt-1.5 text-data leading-relaxed text-ink-2">{glossFor(w)}</p>
                          </div>
                        )}
                      </div>

                      {/* --- metadata --- */}
                      <dl className="p-5">
                        {[
                          ['Sender', w.sender],
                          ['Severity', w.severity],
                          ['Urgency', w.urgency],
                          ['Certainty', w.certainty],
                          ['Issued', w.effective ? hhmm(w.effective) : '—'],
                          ['Expires', w.expires ? hhmm(w.expires) : '—'],
                        ].map(([k, v]) => (
                          <div key={k} className="flex items-baseline justify-between gap-3 border-b border-line-soft py-2 last:border-b-0">
                            <dt className="lbl">{k}</dt>
                            <dd className="truncate text-data text-ink-2">{v || '—'}</dd>
                          </div>
                        ))}
                        <a
                          href="https://sachet.ndma.gov.in/"
                          target="_blank"
                          rel="noreferrer"
                          className="lbl mt-3 inline-flex items-center gap-1.5 text-accent hover:text-accent-2"
                        >
                          View on Sachet
                          <Icon name="arrowRight" size={13} />
                        </a>
                      </dl>
                    </div>
                  )}
                </Card>
              </Reveal>
            )
          })}

        {!loading && hidden > 0 && (
          <p className="text-data leading-relaxed text-ink-3">
            {hidden} yellow {hidden === 1 ? 'warning is' : 'warnings are'} hidden by “severe events
            only”. Turn it off in Settings to see {hidden === 1 ? 'it' : 'them'}.
          </p>
        )}

        {!loading && shown.length === 0 && (
          <Card className="p-10 text-center">
            <span className="mx-auto grid h-11 w-11 place-items-center rounded-lg bg-sev-green-w text-sev-green">
              <Icon name="shield" size={20} />
            </span>
            <p className="mt-3 text-subheading font-medium text-ink">
              No {tab} warnings for {location?.name || 'your location'}.
            </p>
            <p className="mt-1.5 text-data text-ink-3">
              {tab === 'active'
                ? 'That is the normal state. The Sachet feed is checked every five minutes.'
                : 'Expired warnings are kept for audit and appear here once they lapse.'}
            </p>
          </Card>
        )}
      </div>

      {/* --------------------------------------------------- saved locations */}
      <Reveal delay={60}>
        <SavedLocations token={auth.token} />
      </Reveal>

      {/* ------------------------------------------------------ colour code */}
      <Reveal delay={90}>
        <div className="grid gap-3 lg:grid-cols-2">
          <Card>
            <CardHead title="IMD colour code" meta="What each band asks of you" />
            <CardBody className="space-y-2.5">
              {['green', 'yellow', 'orange', 'red'].map((k) => (
                <div key={k} className="flex items-center gap-3">
                  <SeverityChip tone={k} size="sm">
                    {SEVERITY[k].label}
                  </SeverityChip>
                  <span className="text-data text-ink-2">{SEVERITY[k].action}</span>
                </div>
              ))}
            </CardBody>
          </Card>

          <Card>
            <CardHead title="Rainfall bands" meta="24-hour totals, mm" />
            <CardBody>
              {RAINFALL_BANDS.map((b) => (
                <div key={b.name} className="flex items-center gap-3 border-b border-line-soft py-2.5 last:border-b-0">
                  <span className={cn('h-2 w-2 flex-none rounded-full', SEVERITY[b.tone].bg)} aria-hidden="true" />
                  <span className="flex-1 text-data text-ink-2">{b.name}</span>
                  <span className="tnum text-data text-ink-3">{b.range}</span>
                </div>
              ))}
            </CardBody>
          </Card>
        </div>
      </Reveal>

      {mode !== 'live' && (
        <p className="text-data leading-relaxed text-ink-3">
          Running on bundled sample data. Set <code className="code">VITE_API_URL</code> to see
          the live NDMA Sachet feed.
        </p>
      )}
    </Shell>
  )
}
