import { Link, useNavigate } from 'react-router-dom'
import { useActiveWarnings, useData } from '../lib/DataContext'
import { formatters } from '../lib/usePreferences'
import { greeting, statement, briefTiles, irrigation, actions } from '../lib/brief'
import { SEVERITY } from '../lib/constants'
import { t } from '../lib/i18n'
import { cn, placeLine } from '../lib/utils'
import Icon from '../ui/Icon'
import { Card, CardHead, CardBody, Shell, Skeleton, Meter, ConfidenceBars } from '../ui/Bits'
import { SeverityTile } from '../ui/Severity'
import Reveal from '../ui/Reveal'
import SkyCanvas from '../weather/SkyCanvas'

export default function Today({ prefs, audience, lang = 'en' }) {
  const { current, daily, summary24h, risk, confidence, location, loading, mode, error, degraded } = useData()
  const active = useActiveWarnings()
  const fmt = formatters(prefs?.units)
  const navigate = useNavigate()

  const warning = active[0]
  const sev = warning ? SEVERITY[warning.colour] || SEVERITY.green : null
  const st = statement({ current, summary24h, daily, audience, fmt, lang })
  const tiles = briefTiles({ current, summary24h, risk, daily, audience, fmt, lang })
  const irr = irrigation({ current, summary24h, daily, lang })
  const todo = actions({ current, summary24h, daily, audience, lang })

  const mm = summary24h?.rainMm ?? daily?.[0]?.mm ?? 0
  const isNight = (() => {
    const h = new Date().getHours()
    return h >= 19 || h < 6
  })()

  if (loading) {
    return (
      <Shell className="space-y-4 py-8" aria-busy="true">
        <Skeleton className="h-[280px] rounded-xl" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[104px] rounded-xl" />
          ))}
        </div>
      </Shell>
    )
  }

  const sevLabel = sev ? (lang === 'hi' ? t(`sev${sev.label}Label`, lang) : sev.label) : ''
  const sevAction = sev ? (lang === 'hi' ? t(`sev${sev.label}Action`, lang) : sev.action) : ''

  return (
    <Shell className="space-y-4 py-5 sm:py-7">
      {/* ---------------------------------------------------------- warning */}
      {warning && (
        <Link
          to="/alerts"
          className={cn(
            'group flex items-center gap-3 rounded-xl border p-3 transition-colors duration-200 sm:gap-4 sm:p-4',
            sev.ring,
            sev.wash,
          )}
          aria-live="assertive"
        >
          <SeverityTile tone={warning.colour} />
          <span className="min-w-0 flex-1">
            <span className={cn('lbl block', sev.text)}>
              {sevLabel} · {sevAction}
            </span>
            <span className="mt-0.5 block text-caption font-medium leading-snug text-ink">
              {warning.event}
              {warning.area?.description ? ` — ${warning.area.description}` : ''}
            </span>
          </span>
          <span className="lbl hidden flex-none items-center gap-1.5 text-ink-2 transition-colors group-hover:text-ink sm:flex">
            {t('whatThisMeans', lang)}
            <Icon name="chevronRight" size={13} />
          </span>
        </Link>
      )}

      {/* ------------------------------------------------------------- hero */}
      <section className="relative overflow-hidden rounded-xl border border-line bg-surface shadow-card">
        <SkyCanvas
          mmPerHour={mm / 24}
          windKmh={current?.windKmh || 0}
          windDeg={current?.windDeg ?? 90}
          cloudCover={current?.rainProb ?? 0.4}
          night={isNight}
          tone={warning ? warning.colour : 'accent'}
          className="opacity-[0.55]"
        />

        <div className="relative grid gap-6 p-5 sm:p-7 lg:grid-cols-[1.15fr_1fr] lg:gap-10 lg:p-9">
          <div className="min-w-0">
            <span className="lbl">
              {greeting(new Date(), lang)} · {placeLine(location)}
            </span>

            <h1 className="headline mt-3 max-w-[15ch] text-display text-ink">{st.headline}</h1>

            <p className="mt-4 max-w-[46ch] text-body-sm leading-relaxed text-ink-2">{st.sub}</p>

            <div className="mt-6 flex flex-wrap gap-2.5">
              <button type="button" onClick={() => navigate('/chat')} className="btn">
                <Icon name="message" size={16} />
                {audience === 'farm' ? t('askKrishivaani', lang) : t('askAkashvaani', lang)}
              </button>
              <button type="button" onClick={() => navigate('/forecast')} className="btn-ghost">
                {t('fullForecast', lang)}
                <Icon name="chevronRight" size={15} />
              </button>
            </div>
          </div>

          {/* ---- figures ---- */}
          <div className="min-w-0 lg:border-l lg:border-line-soft lg:pl-9">
            <div className="flex items-start gap-4">
              <Icon name={mm > 2 ? 'cloudRain' : isNight ? 'moon' : 'sun'} size={54} className="flex-none text-accent" />
              <div className="min-w-0">
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

            <dl className="mt-6 grid grid-cols-3 gap-2">
              {[
                [t('rainChance', lang), `${Math.round((current?.rainProb ?? 0) * 100)}%`],
                [t('wind', lang), `${fmt.speed(current?.windKmh)} ${fmt.speedUnit}`],
                [t('humidity', lang), `${current?.humidity ?? '—'}%`],
              ].map(([k, v]) => (
                <div key={k} className="rounded-lg bg-sunk px-3 py-2.5">
                  <dt className="lbl">{k}</dt>
                  <dd className="tnum mt-1 text-body-sm font-semibold text-ink">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------- status tiles */}
      <Reveal>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {tiles.map((tile) => (
            <div key={tile.key} className="rounded-xl border border-line bg-surface p-4 shadow-card">
              <div className="flex items-center justify-between gap-2">
                <span className="lbl truncate">{tile.label}</span>
                <span
                  className={cn(
                    'h-2 w-2 flex-none rounded-full',
                    tile.tone ? SEVERITY[tile.tone].bg : 'bg-ink-3',
                  )}
                  aria-hidden="true"
                />
              </div>
              <div className="mt-2.5 truncate text-subheading font-semibold tracking-[-0.02em] text-ink">
                {tile.value}
              </div>
              <div className="mt-1 text-data leading-snug text-ink-3">{tile.note}</div>
            </div>
          ))}
        </div>
      </Reveal>

      {/* ---------------------------------------------- farm: actions + water (Farmer View Only) */}
      {audience === 'farm' && (
        <Reveal delay={60}>
          <div className="grid gap-3 lg:grid-cols-2">
            <Card>
              <CardHead
                title={t('todaysActions', lang)}
                meta={`${todo.length} · ${t('fromTodaysFigures', lang)}`}
              />
              <CardBody className="space-y-3">
                {todo.length === 0 && (
                  <p className="text-data leading-relaxed text-ink-3">
                    {t('noActionsNeeded', lang)}
                  </p>
                )}
                {todo.map((a, i) => (
                  <div key={a.text + i} className="flex gap-3">
                    <span className="tnum grid h-6 w-6 flex-none place-items-center rounded-md bg-accent-soft font-mono text-[11px] font-medium text-accent">
                      {i + 1}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-caption font-medium text-ink">{a.text}</span>
                      <span className="mt-0.5 block text-data text-ink-3">{a.why}</span>
                    </span>
                  </div>
                ))}
              </CardBody>
            </Card>

            <Card>
              <CardHead title={t('irrigationTitle', lang)} meta={t('irrigationMeta', lang)} />
              <CardBody className="space-y-4">
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      'grid h-11 w-11 flex-none place-items-center rounded-lg',
                      irr.tone ? `${SEVERITY[irr.tone].wash} ${SEVERITY[irr.tone].text}` : 'bg-sunk text-ink-3',
                    )}
                  >
                    <Icon name="drop" size={20} />
                  </span>
                  <div className="min-w-0">
                    <div className="text-subheading font-semibold tracking-[-0.02em] text-ink">
                      {irr.recommendation}
                    </div>
                    <div className="lbl">{irr.band}</div>
                  </div>
                </div>

                <p className="text-data leading-relaxed text-ink-2">{irr.reason}</p>

                <div className="space-y-2.5 border-t border-line-soft pt-3.5">
                  <div className="flex items-center gap-2.5">
                    <span className="lbl">{t('irrConfidence', lang)}</span>
                    <ConfidenceBars level={irr.confidence} />
                    <span className="text-data text-ink-2">{irr.confidence}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="lbl">{t('irrUsed', lang)}</span>
                    {irr.inputs.map((inp) => (
                      <span key={inp} className="rounded-md bg-sunk px-2 py-0.5 text-data text-ink-2">
                        {inp}
                      </span>
                    ))}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="lbl">{t('irrNotUsed', lang)}</span>
                    {irr.missing.map((mis) => (
                      <span key={mis} className="rounded-md border border-dashed border-line px-2 py-0.5 text-data text-ink-3">
                        {mis}
                      </span>
                    ))}
                  </div>
                  <p className="text-data leading-relaxed text-ink-3">
                    {t('irrDisclaimer', lang)}
                  </p>
                </div>
              </CardBody>
            </Card>
          </div>
        </Reveal>
      )}

      {/* ----------------------------------------------------- risk snapshot */}
      <Reveal delay={90}>
        <div className="grid gap-3 lg:grid-cols-2">
          <Card>
            <CardHead
              title={audience === 'farm' ? t('tileFarmRisk', lang) : t('compositeRisk', lang)}
              meta={risk?.score != null ? `${t('tileRisk', lang)} ${risk.score}/100` : '—'}
            />
            <CardBody>
              {!risk ? (
                <p className="text-data leading-relaxed text-ink-3">
                  Risk score currently unavailable.
                </p>
              ) : (
                <>
                  <div className="flex items-end gap-4">
                    <span
                      className={cn(
                        'text-heading font-semibold leading-none tracking-[-0.03em]',
                        SEVERITY[risk.tone || 'green'].text,
                      )}
                    >
                      {risk.overall}
                    </span>
                    {risk.floorApplied && (
                      <span className="lbl mb-1">{t('safetyFloorApplied', lang)}</span>
                    )}
                  </div>
                  <div className="mt-4 space-y-3">
                    {(risk.breakdown || []).slice(0, 5).map((b) => (
                      <div key={b.label}>
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="text-data text-ink-2">{b.label}</span>
                          <span className="tnum font-mono text-[11px] text-ink-3">+{b.weight}</span>
                        </div>
                        <Meter
                          value={b.weight}
                          max={40}
                          tone={SEVERITY[b.tone || 'green'].bg}
                          className="mt-1.5"
                        />
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHead title={t('forecastConfidence', lang)} meta={t('modelSpread', lang)} />
            <CardBody>
              {!confidence ? (
                <p className="text-data leading-relaxed text-ink-3">Confidence is unavailable.</p>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <ConfidenceBars level={confidence.level} />
                    <span className="text-subheading font-semibold tracking-[-0.02em] text-ink">
                      {confidence.level}
                    </span>
                    <span className="lbl ml-auto">{confidence.leadHours} {t('hoursAhead', lang)}</span>
                  </div>
                  <ul className="mt-4 space-y-2">
                    {(confidence.reasons || []).map((r) => (
                      <li key={r} className="flex gap-2.5 text-data leading-relaxed text-ink-2">
                        <span className="mt-[9px] h-px w-3 flex-none bg-line" aria-hidden="true" />
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </CardBody>
          </Card>
        </div>
      </Reveal>

      {/* ------------------------------------------------------- farm connect (FARM ONLY) */}
      {audience === 'farm' && (
        <Reveal delay={120}>
          <Link
            to="/farm"
            className="flex items-center gap-4 rounded-xl border border-line bg-surface p-4 shadow-card transition-colors duration-200 hover:border-accent sm:p-5"
          >
            <span className="grid h-11 w-11 flex-none place-items-center rounded-lg bg-accent-soft text-accent">
              <Icon name="sprout" size={21} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="lbl block">{t('farmConnectCardTitle', lang)}</span>
              <span className="mt-0.5 block text-caption font-medium text-ink">
                {t('farmConnectCardSub', lang)}
              </span>
              <span className="mt-0.5 block text-data text-ink-3">
                {t('farmConnectCardDesc', lang)}
              </span>
            </span>
            <Icon name="chevronRight" size={18} className="flex-none text-ink-3" />
          </Link>
        </Reveal>
      )}

      {/* ------------------------------------------------------------- notice */}
      {(mode !== 'live' || degraded) && (
        <p className="rounded-lg border border-line bg-sunk px-4 py-3 text-data leading-relaxed text-ink-2">
          <span className="lbl mr-2">{mode !== 'live' ? 'Sample data' : 'Degraded'}</span>
          {mode !== 'live'
            ? error
              ? `Live API unreachable (${error}) — figures come from bundled sample.`
              : 'Running on bundled sample data.'
            : 'The risk engine is unreachable, so forecast and warnings are shown without a score.'}
        </p>
      )}
    </Shell>
  )
}
