import { useState } from 'react'
import { useData } from '../lib/DataContext'
import { SEVERITY, RAINFALL_BANDS } from '../lib/constants'
import { t } from '../lib/i18n'
import { hhmm, cn } from '../lib/utils'
import Icon from '../ui/Icon'
import { Card, CardHead, CardBody, Shell, PageHead, SubTabs, Skeleton } from '../ui/Bits'
import { SeverityTile, SeverityChip } from '../ui/Severity'
import Reveal from '../ui/Reveal'
import SavedLocations from '../shell/SavedLocations'
import ShelterSection from '../weather/ShelterSection'
import { useAuth } from '../lib/useAuth'

export default function Alerts({ prefs, lang = 'en' }) {
  const { warnings, advice, location, loading } = useData()
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

  const glossFor = (w) =>
    w.status === 'active' && w.identifier === (warnings || []).find((x) => x.status === 'active')?.identifier
      ? advice?.warningMessage
      : null

  return (
    <Shell className="space-y-4 pb-8">
      <PageHead
        eyebrow={`NDMA Sachet · CAP 1.2 · ${location?.name || ''}`}
        title={t('warningsTitle', lang)}
      >
        Issued by IMD, CWC and state disaster authorities. Official wording is preserved.
      </PageHead>

      <SubTabs
        value={tab}
        onChange={setTab}
        tabs={[
          { key: 'active', label: `${t('tabActiveAlerts', lang)} · ${counts.active}` },
          { key: 'expired', label: `${t('tabExpiredAlerts', lang)} · ${counts.expired}` },
        ]}
      />

      <div className="space-y-3 pt-1">
        {loading && [0, 1].map((i) => <Skeleton key={i} className="h-[120px] rounded-xl" />)}

        {!loading &&
          shown.map((w, i) => {
            const sev = SEVERITY[w.colour] || SEVERITY.green
            const isOpen = open === i
            const expired = w.status !== 'active'
            const sevLabel = lang === 'hi' ? t(`sev${sev.label}Label`, lang) : sev.label
            const sevAction = lang === 'hi' ? t(`sev${sev.label}Action`, lang) : sev.action

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
                          {expired ? t('tabExpiredAlerts', lang) : `${sevLabel} · ${sevAction}`}
                        </span>
                        <span className="lbl">
                          {w.expires ? `${t('expires', lang)} ${hhmm(w.expires)}` : ''}
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
                          <span className="lbl">{t('officialTextUnedited', lang)}</span>
                        </div>
                        {[
                          [t('officialHeadline', lang), w.headline],
                          [t('officialDescription', lang), w.description],
                          [t('officialInstruction', lang), w.instruction],
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
                            <div className="lbl text-accent">{t('plainLanguageAdded', lang)}</div>
                            <p className="mt-1.5 text-data leading-relaxed text-ink-2">{glossFor(w)}</p>
                          </div>
                        )}
                      </div>

                      {/* --- metadata --- */}
                      <dl className="p-5">
                        {[
                          [t('sender', lang), w.sender],
                          [t('severity', lang), w.severity],
                          [t('urgency', lang), w.urgency],
                          [t('certainty', lang), w.certainty],
                          [t('issued', lang), w.effective ? hhmm(w.effective) : '—'],
                          [t('expires', lang), w.expires ? hhmm(w.expires) : '—'],
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
                          {t('viewOnSachet', lang)}
                          <Icon name="arrowRight" size={13} />
                        </a>
                      </dl>
                    </div>
                  )}
                </Card>
              </Reveal>
            )
          })}

        {!loading && shown.length === 0 && (
          <Card className="p-10 text-center">
            <span className="mx-auto grid h-11 w-11 place-items-center rounded-lg bg-sev-green-w text-sev-green">
              <Icon name="shield" size={20} />
            </span>
            <p className="mt-3 text-subheading font-medium text-ink">
              {t('noAlertsMsg', lang)}
            </p>
            <p className="mt-1.5 text-data text-ink-3">
              {t('noAlertsSub', lang)}
            </p>
          </Card>
        )}
      </div>

      {/* -------------------------------------------------- nearest shelters */}
      <Reveal delay={40}>
        <ShelterSection location={location} lang={lang} />
      </Reveal>

      {/* --------------------------------------------------- saved locations */}
      <Reveal delay={60}>
        <SavedLocations token={auth.token} lang={lang} />
      </Reveal>

      {/* ------------------------------------------------------ colour code */}
      <Reveal delay={90}>
        <div className="grid gap-3 lg:grid-cols-2">
          <Card>
            <CardHead title={t('imdColourCode', lang)} meta={t('whatEachBandAsks', lang)} />
            <CardBody className="space-y-2.5">
              {['green', 'yellow', 'orange', 'red'].map((k) => {
                const sev = SEVERITY[k]
                const label = lang === 'hi' ? t(`sev${sev.label}Label`, lang) : sev.label
                const action = lang === 'hi' ? t(`sev${sev.label}Action`, lang) : sev.action
                return (
                  <div key={k} className="flex items-center gap-3">
                    <SeverityChip tone={k} size="sm">
                      {label}
                    </SeverityChip>
                    <span className="text-data text-ink-2">{action}</span>
                  </div>
                )
              })}
            </CardBody>
          </Card>

          <Card>
            <CardHead title={t('imdRainfallBands', lang)} meta={t('twentyFourHourTotals', lang)} />
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
    </Shell>
  )
}
