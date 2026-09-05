import { useState } from 'react'
import { useActiveWarnings, useData } from '../lib/DataContext'
import { formatters } from '../lib/usePreferences'
import { SEVERITY, RAINFALL_BANDS } from '../lib/constants'
import { t } from '../lib/i18n'
import { ago, hhmm, cn, placeLine } from '../lib/utils'
import Icon from '../ui/Icon'
import { Card, CardHead, CardBody, Shell, Fact, Skeleton, Meter, PageHead } from '../ui/Bits'
import { SeverityTile } from '../ui/Severity'
import Reveal from '../ui/Reveal'
import RainChart from '../weather/RainChart'

export default function Forecast({ prefs, lang = 'en' }) {
  const { current, hourly, daily, location, confidence, loading, mode } = useData()
  const active = useActiveWarnings()
  const fmt = formatters(prefs?.units)
  const [open, setOpen] = useState(null)
  const [dismissed, setDismissed] = useState(false)

  const warning = active[0]
  const sev = warning ? SEVERITY[warning.colour] || SEVERITY.green : null

  if (loading) {
    return (
      <Shell className="space-y-4 py-8" aria-busy="true">
        <Skeleton className="h-10 w-64 rounded-lg" />
        <Skeleton className="h-[200px] rounded-xl" />
        <Skeleton className="h-[240px] rounded-xl" />
      </Shell>
    )
  }

  const sevLabel = sev ? (lang === 'hi' ? t(`sev${sev.label}Label`, lang) : sev.label) : ''

  return (
    <Shell className="space-y-4 py-5 sm:py-7">
      {/* ------------------------------------------------------- CAP banner */}
      {warning && !dismissed && (
        <div className={cn('flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:gap-4 sm:p-5', sev.ring, sev.wash)}>
          <SeverityTile tone={warning.colour} size={42} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className={cn('lbl', sev.text)}>
                CAP · {warning.severity} · {sevLabel}
              </span>
              {warning.expires && <span className="lbl">{t('expires', lang)} {hhmm(warning.expires)}</span>}
            </div>
            <div className="mt-1.5 text-subheading font-semibold tracking-[-0.02em] text-ink">
              {warning.event}
            </div>
            <p className="mt-1.5 text-data leading-relaxed text-ink-2">{warning.headline}</p>
            <div className="mt-3.5 flex flex-wrap gap-2.5">
              <a href="#/alerts" className={cn('btn', sev.bg, 'text-on-sev')}>
                {t('readFullInstruction', lang)}
                <Icon name="chevronRight" size={15} />
              </a>
              <button type="button" onClick={() => setDismissed(true)} className="btn-ghost">
                {t('dismiss', lang)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- header */}
      <PageHead
        eyebrow={placeLine(location)}
        title={location?.name || t('forecastTitle', lang)}
        aside={
          <span className="lbl">
            {current?.observedAt ? `${t('observedAgo', lang)} ${ago(current.observedAt)}` : ''}
          </span>
        }
      />

      {/* ---------------------------------------------------------- hero card */}
      <Card>
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_1.4fr]">
          <div className="flex items-start gap-4">
            <Icon name="sun" size={54} className="flex-none text-accent" />
            <div>
              <div className="flex items-start">
                <span className="tnum text-figure font-semibold text-ink">{fmt.temp(current?.tempC)}</span>
                <span className="mt-2 text-subheading font-medium text-ink-3">{fmt.tempUnit}</span>
              </div>
              <div className="mt-1 text-body-sm font-medium text-ink">
                {current?.condition || t('condUnknown', lang)}
              </div>
              <div className="mt-0.5 text-data text-ink-3">
                {t('feelsLike', lang)} {fmt.temp(current?.feelsLikeC)}{fmt.tempUnit}
              </div>
            </div>
          </div>

          <dl className="grid grid-cols-2 divide-x divide-y divide-line-soft">
            {[
              {
                icon: 'drop',
                label: t('rainChance', lang),
                value: `${Math.round(resolvedRainProb * 100)}%`,
                note: `${fmt.rain(daily?.[0]?.mm ?? 0)} ${fmt.rainUnit} ${t('in24h', lang)}`,
              },
              {
                icon: 'wind',
                label: t('wind', lang),
                value: `${fmt.speed(current?.windKmh)} ${fmt.speedUnit}`,
                note: `${current?.windDir ?? '—'} · gusts ${fmt.speed(current?.gustKmh)}`,
              },
              {
                icon: 'drop',
                label: t('humidity', lang),
                value: `${current?.humidity ?? '—'}%`,
                note: `${t('pressure', lang)} ${current?.pressureHpa ?? '—'} hPa`,
              },
              {
                icon: 'eye',
                label: t('visibility', lang),
                value: `${fmt.distance(current?.visibilityKm)} ${fmt.distanceUnit}`,
                note: `${t('uvIndex', lang)} ${current?.uv ?? '—'} · ${t('sunset', lang)} ${current?.sunset ?? '—'}`,
              },
            ].map((f) => (
              <Fact key={f.label} {...f} className="border-line-soft p-5" />
            ))}
          </dl>
        </div>
      </Card>

      {/* -------------------------------------------------------- next 12 h */}
      <Reveal>
        <Card>
          <CardHead title={t('next12Hours', lang)} meta={`${t('precipitation', lang)} · mm/h`} />
          <CardBody>
            <RainChart hours={hourly?.slice(0, 12) || []} fmt={fmt} />
          </CardBody>
        </Card>
      </Reveal>

      {/* --------------------------------------------------------- seven days */}
      <Reveal delay={60}>
        <Card>
          <CardHead title={t('sevenDayForecast', lang)} meta={`${t('imdRainfallBands', lang)} · 24 h`} />
          <div>
            {(daily || []).map((d, i) => {
              const tone = SEVERITY[d.tone || 'green']
              const isOpen = open === i
              return (
                <div key={d.day + i} className="border-b border-line-soft last:border-b-0">
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-3 px-5 py-3.5 text-left transition-colors duration-150 hover:bg-sunk sm:grid-cols-[110px_1fr_auto_140px]"
                  >
                    <span className="min-w-0">
                      <span className="block text-caption font-medium text-ink">{d.day}</span>
                      <span className="block font-mono text-[11px] text-ink-3">{d.date}</span>
                    </span>
                    <span className="flex min-w-0 items-center gap-2">
                      <span className={cn('h-1.5 w-1.5 flex-none rounded-full', tone.bg)} aria-hidden="true" />
                      <span className="truncate text-data text-ink-2">{d.summary}</span>
                    </span>
                    <span className="tnum hidden text-data text-ink-3 sm:block">
                      {d.mm > 0 ? `${fmt.rain(d.mm)} ${fmt.rainUnit}` : '—'}
                    </span>
                    <span className="tnum flex items-center justify-end gap-2 text-data">
                      <span className="text-ink-3">{fmt.temp(d.min)}°</span>
                      <span className="font-semibold text-ink">{fmt.temp(d.max)}°</span>
                      <Icon
                        name="chevronDown"
                        size={14}
                        className={cn('text-ink-3 transition-transform duration-200', isOpen && 'rotate-180')}
                      />
                    </span>
                  </button>

                  {isOpen && (
                    <dl className="grid grid-cols-2 gap-px bg-line-soft sm:grid-cols-4">
                      {[
                        [t('rainfall', lang), d.mm > 0 ? `${fmt.rain(d.mm)} ${fmt.rainUnit}` : t('noneExpected', lang)],
                        [t('chance', lang), d.prob != null ? `${Math.round(d.prob * 100)}%` : '—'],
                        [t('high', lang), `${fmt.temp(d.max)}${fmt.tempUnit}`],
                        [t('low', lang), `${fmt.temp(d.min)}${fmt.tempUnit}`],
                      ].map(([k, v]) => (
                        <div key={k} className="bg-surface px-5 py-3">
                          <dt className="lbl">{k}</dt>
                          <dd className="tnum mt-1 text-caption font-medium text-ink">{v}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </div>
              )
            })}
          </div>
        </Card>
      </Reveal>

      {/* -------------------------------------------------- confidence + bands */}
      <Reveal delay={90}>
        <div className="grid gap-3 lg:grid-cols-2">
          <Card>
            <CardHead title={t('forecastConfidence', lang)} meta={t('modelSpread', lang)} />
            <CardBody className="space-y-3">
              {(confidence?.models || []).map((m, i) => {
                const max = Math.max(...(confidence.models || []).map((x) => x.mm || 0), 1)
                return (
                  <div key={m.name} className="grid grid-cols-[92px_1fr_64px] items-center gap-3">
                    <span className="truncate text-data text-ink-2">{m.name}</span>
                    <Meter value={m.mm} max={max} delay={i * 90} />
                    <span className="tnum text-right text-data text-ink">
                      {fmt.rain(m.mm)} {fmt.rainUnit}
                    </span>
                  </div>
                )
              })}
              {!confidence && (
                <p className="text-data leading-relaxed text-ink-3">Confidence is unavailable.</p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHead title={t('imdRainfallBands', lang)} meta={t('twentyFourHourTotals', lang)} />
            <CardBody className="space-y-0">
              {RAINFALL_BANDS.map((b) => (
                <div
                  key={b.name}
                  className="flex items-center gap-3 border-b border-line-soft py-2.5 last:border-b-0"
                >
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
