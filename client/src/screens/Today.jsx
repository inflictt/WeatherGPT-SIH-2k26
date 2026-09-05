import { Link, useNavigate } from 'react-router-dom'
import { useActiveWarnings, useData } from '../lib/DataContext'
import { useFarm, stageFor } from '../lib/useFarm'
import { evaluateFarmIntelligence } from '../lib/farmIntelligence'
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
  const { current, daily, summary24h, hourly, risk, confidence, location, loading, mode, error, degraded } = useData()
  const { farm, fields, tasks, crops } = useFarm()
  const active = useActiveWarnings()
  const fmt = formatters(prefs?.units)
  const navigate = useNavigate()

  const isFarm = audience === 'farm'
  const isHindi = lang === 'hi'

  const intelligence = evaluateFarmIntelligence({
    farm,
    current,
    daily,
    summary24h,
    hourly,
    warnings: active,
    lang,
  })

  const warning = active[0]
  const sev = warning ? SEVERITY[warning.colour] || SEVERITY.green : null
  const st = statement({ current, summary24h, daily, audience, fmt, lang, warning, warnings: active, risk })
  const tiles = briefTiles({ current, summary24h, risk, daily, audience, fmt, lang, warning, warnings: active })
  const irr = irrigation({ current, summary24h, daily, lang, warning, warnings: active })
  const todo = actions({ current, summary24h, daily, audience, lang, warning, warnings: active, risk })

  const mm = summary24h?.rainMm ?? daily?.[0]?.mm ?? 0
  const condStr = (current?.condition || '').toLowerCase()
  const isRainy = /rain|drizzle|shower|thunder|storm|squall|बौछार|बारिश/i.test(condStr)
  const rainProb =
    current?.rainProb != null && current.rainProb > 0
      ? current.rainProb
      : daily?.[0]?.prob != null && daily[0].prob > 0
        ? daily[0].prob
        : mm > 0 || isRainy || (warning && ['orange', 'red'].includes(String(warning.colour).toLowerCase()))
          ? 0.95
          : current?.rainProb ?? 0

  const isNight = (() => {
    const h = new Date().getHours()
    return h >= 19 || h < 6
  })()

  const todayIso = new Date().toISOString().split('T')[0]
  const todayTasks = (intelligence.tasks || tasks).filter(
    (t) => t.dueDate === todayIso && t.status !== 'completed'
  )

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
    <Shell className="space-y-5 py-5 sm:py-7">
      {/* ---------------------------------------------------------- OFFICIAL WARNING */}
      {warning && (
        <Link
          to="/alerts"
          className={cn(
            'group flex items-center gap-3 rounded-2xl border p-3.5 transition-colors duration-200 sm:gap-4 sm:p-4 shadow-sm',
            sev.ring,
            sev.wash,
          )}
          aria-live="assertive"
        >
          <SeverityTile tone={warning.colour} />
          <span className="min-w-0 flex-1">
            <span className={cn('lbl block font-bold', sev.text)}>
              {sevLabel} · {sevAction}
            </span>
            <span className="mt-0.5 block text-caption font-medium leading-snug text-ink">
              {warning.event}
              {warning.area?.description ? ` — ${warning.area.description}` : ''}
            </span>
          </span>
          <span className="lbl hidden flex-none items-center gap-1.5 text-ink-2 transition-colors group-hover:text-ink sm:flex font-semibold">
            {t('whatThisMeans', lang)}
            <Icon name="chevronRight" size={13} />
          </span>
        </Link>
      )}

      {/* ---------------------------------- TODAY'S FARM COMMAND CENTER HERO (FARM VIEW) */}
      {isFarm ? (
        <section className="relative overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
          <SkyCanvas
            mmPerHour={mm / 24}
            windKmh={current?.windKmh || 0}
            windDeg={current?.windDeg ?? 90}
            cloudCover={current?.rainProb ?? 0.4}
            night={isNight}
            tone={warning ? warning.colour : 'accent'}
            className="opacity-[0.45]"
          />

          <div className="relative p-5 sm:p-7 lg:p-8 space-y-6">
            {/* Top Bar: Greeting, Location, Farm Condition Score */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line-soft pb-5">
              <div>
                <span className="lbl text-ink-3 uppercase tracking-wider font-semibold">
                  {greeting(new Date(), lang)} · {placeLine(location)}
                </span>
                <h1 className="headline mt-1.5 text-heading font-bold text-ink">
                  {farm?.name || 'Aakrishi Farm'} Command Center
                </h1>
              </div>

              {/* Farm Health Score Badge */}
              <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface/95 px-4 py-2.5 shadow-sm">
                <div className="text-right">
                  <div className="lbl text-ink-3">{isHindi ? 'खेत स्वास्थ्य सूचकांक' : 'Farm Health Score'}</div>
                  <div className="flex items-center gap-1.5 justify-end mt-0.5">
                    <span className="text-subheading font-extrabold text-accent">
                      {intelligence.overall.score}
                    </span>
                    <span className="text-xs text-ink-3">/ 100</span>
                    <span
                      className={cn(
                        'ml-1 rounded-md px-2 py-0.5 font-mono text-[10px] font-bold uppercase',
                        intelligence.overall.tone === 'green'
                          ? 'bg-sev-green-soft text-sev-green'
                          : intelligence.overall.tone === 'yellow'
                            ? 'bg-sev-amber-soft text-sev-amber'
                            : 'bg-sev-red-soft text-sev-red'
                      )}
                    >
                      {intelligence.overall.label}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Farm Brief Box */}
            <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr] items-center">
              <div className="space-y-3">
                <div className="lbl text-accent font-bold uppercase tracking-wider">
                  {isHindi ? 'आज का फ़ार्म सार (Daily Brief)' : "Today's Farm Brief"}
                </div>
                <p className="text-body-sm font-medium leading-relaxed text-ink">
                  {st.sub || intelligence.overall.headline}
                </p>

                {/* Factors Pill Bar */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="lbl text-ink-3">{isHindi ? 'कारक:' : 'Signals:'}</span>
                  <span className="rounded-lg bg-sunk px-2.5 py-1 text-data font-medium text-ink-2">
                    💧 Water: <strong className="text-ink">{intelligence.overall.factors.water}</strong>
                  </span>
                  <span className="rounded-lg bg-sunk px-2.5 py-1 text-data font-medium text-ink-2">
                    🌦️ Weather: <strong className="text-ink">{intelligence.overall.factors.weather}</strong>
                  </span>
                  <span className="rounded-lg bg-sunk px-2.5 py-1 text-data font-medium text-ink-2">
                    🦠 Disease: <strong className="text-ink">{intelligence.overall.factors.disease}</strong>
                  </span>
                  <span className="rounded-lg bg-sunk px-2.5 py-1 text-data font-medium text-ink-2">
                    🚜 Work: <strong className="text-ink">{intelligence.overall.factors.workability}</strong>
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 pt-2">
                  <button type="button" onClick={() => navigate('/chat')} className="btn">
                    <Icon name="message" size={16} />
                    <span>{t('askKrishivaani', lang)}</span>
                  </button>
                  <button type="button" onClick={() => navigate('/tasks')} className="btn-ghost">
                    <Icon name="check" size={15} />
                    <span>{isHindi ? 'कार्य देखें' : 'View Tasks'}</span>
                  </button>
                </div>
              </div>

              {/* Weather Snapshot Column */}
              <div className="rounded-2xl border border-line-soft bg-sunk/70 p-4 sm:p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <Icon name={mm > 2 ? 'cloudRain' : isNight ? 'moon' : 'sun'} size={38} className="text-accent" />
                    <div>
                      <div className="flex items-baseline">
                        <span className="tnum text-heading font-bold text-ink">{fmt.temp(current?.tempC)}</span>
                        <span className="text-caption font-semibold text-ink-3">{fmt.tempUnit}</span>
                      </div>
                      <div className="text-caption font-medium text-ink">
                        {current?.condition || t('condUnknown', lang)}
                      </div>
                    </div>
                  </div>
                  <span className="rounded-lg bg-surface border border-line px-2.5 py-1 text-xs font-mono font-medium text-ink-2">
                    {Math.round(rainProb * 100)}% Rain Chance
                  </span>
                </div>

                <dl className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-surface border border-line/60 p-2">
                    <dt className="lbl text-[10px] text-ink-3">Rain 24h</dt>
                    <dd className="mt-0.5 text-caption font-bold text-ink">{Math.round(mm)} mm</dd>
                  </div>
                  <div className="rounded-xl bg-surface border border-line/60 p-2">
                    <dt className="lbl text-[10px] text-ink-3">Wind</dt>
                    <dd className="mt-0.5 text-caption font-bold text-ink">{fmt.speed(current?.windKmh)} {fmt.speedUnit}</dd>
                  </div>
                  <div className="rounded-xl bg-surface border border-line/60 p-2">
                    <dt className="lbl text-[10px] text-ink-3">Humidity</dt>
                    <dd className="mt-0.5 text-caption font-bold text-ink">{current?.humidity ?? '—'}%</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </section>
      ) : (
        /* ------------------------------------------------------------- GENERAL HERO */
        <section className="relative overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
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
                  <span>{t('askAkashvaani', lang)}</span>
                </button>
                <button type="button" onClick={() => navigate('/forecast')} className="btn-ghost">
                  {t('fullForecast', lang)}
                  <Icon name="chevronRight" size={15} />
                </button>
              </div>
            </div>

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
                  [t('rainChance', lang), `${Math.round(rainProb * 100)}%`],
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
      )}

      {/* ------------------------------------------- SMART PHOTO CHECK TRIGGER BANNER */}
      {isFarm && intelligence.photoRequest?.recommended && (
        <Reveal>
          <div className="flex items-start justify-between gap-3.5 rounded-2xl border border-accent/40 bg-accent-soft p-4 shadow-sm">
            <div className="flex items-start gap-3.5 min-w-0">
              <span className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-accent text-on-accent">
                <Icon name="camera" size={20} />
              </span>
              <div className="min-w-0">
                <h4 className="text-body-sm font-bold text-ink">{intelligence.photoRequest.title}</h4>
                <p className="mt-0.5 text-data text-ink-2 leading-relaxed">{intelligence.photoRequest.reason}</p>
              </div>
            </div>
            <Link
              to="/farm?tab=doctor"
              className="flex-none rounded-xl bg-accent px-3.5 py-1.5 text-xs font-bold text-on-accent shadow-xs hover:opacity-95 transition-all"
            >
              {isHindi ? 'स्कैन करें' : 'Verify Photo'}
            </Link>
          </div>
        </Reveal>
      )}

      {/* ------------------------------------------------------- STATUS TILES MATRIX */}
      <Reveal>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {tiles.map((tile) => (
            <div key={tile.key} className="rounded-2xl border border-line bg-surface p-4 shadow-card">
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

      {/* --------------------------------- TODAY'S PRIORITIZED ACTIONS & IRRIGATION */}
      {isFarm && (
        <Reveal delay={60}>
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Prioritized Actions */}
            <Card>
              <CardHead
                title={t('todaysActions', lang)}
                meta={`${todo.length} · Prioritized`}
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
                      <span className="block text-caption font-semibold text-ink">{a.text}</span>
                      <span className="mt-0.5 block text-data text-ink-3">{a.why}</span>
                    </span>
                  </div>
                ))}
              </CardBody>
            </Card>

            {/* Irrigation Intelligence */}
            <Card>
              <CardHead title={t('irrigationTitle', lang)} meta={t('irrigationMeta', lang)} />
              <CardBody className="space-y-4">
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      'grid h-11 w-11 flex-none place-items-center rounded-xl',
                      irr.tone ? `${SEVERITY[irr.tone].wash} ${SEVERITY[irr.tone].text}` : 'bg-sunk text-ink-3',
                    )}
                  >
                    <Icon name="drop" size={20} />
                  </span>
                  <div className="min-w-0">
                    <div className="text-subheading font-bold tracking-[-0.02em] text-ink">
                      {irr.recommendation}
                    </div>
                    <div className="lbl">{irr.band}</div>
                  </div>
                </div>

                <p className="text-data leading-relaxed text-ink-2">{irr.reason}</p>

                <div className="space-y-2 border-t border-line-soft pt-3">
                  <div className="flex items-center gap-2.5">
                    <span className="lbl">{t('irrConfidence', lang)}</span>
                    <ConfidenceBars level={irr.confidence} />
                    <span className="text-data font-medium text-ink-2">{irr.confidence}</span>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
        </Reveal>
      )}

      {/* --------------------------------- WEATHER-AWARE TASKS & CROP STATUS SNAPSHOT */}
      {isFarm && (
        <Reveal delay={80}>
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Weather-Aware Tasks Due Today */}
            <Card>
              <CardHead
                title={isHindi ? 'आज के निर्धारित कार्य' : "Tasks Due Today"}
                meta={`${todayTasks.length} ${isHindi ? 'कार्य' : 'scheduled'}`}
              />
              <CardBody className="space-y-3">
                {todayTasks.length === 0 ? (
                  <p className="text-data text-ink-3 py-4 text-center">
                    {isHindi ? 'आज के लिए कोई लंबित कार्य नहीं है।' : 'No pending tasks scheduled for today.'}
                  </p>
                ) : (
                  todayTasks.map((t) => {
                    const hasConflict = t.weatherConflict?.hasConflict
                    return (
                      <div
                        key={t.id}
                        className={cn(
                          'rounded-xl border p-3 space-y-1.5 transition-colors',
                          hasConflict ? 'border-sev-orange/50 bg-sev-orange-soft/25' : 'border-line bg-sunk/60'
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-caption font-bold text-ink">{t.title}</span>
                          <span
                            className={cn(
                              'rounded px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase',
                              hasConflict ? 'bg-sev-orange text-on-sev' : 'bg-surface text-ink-3 border border-line'
                            )}
                          >
                            {hasConflict ? 'Conflict' : t.priority}
                          </span>
                        </div>
                        {hasConflict && (
                          <div className="text-data text-sev-orange font-medium flex items-center gap-1">
                            <Icon name="alert" size={13} />
                            <span>{t.weatherConflict.reason}</span>
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
                <div className="pt-1">
                  <Link to="/tasks" className="lbl text-accent hover:underline flex items-center gap-1">
                    <span>{isHindi ? 'सभी कार्य देखें और नया जोड़ें →' : 'View all tasks & add new →'}</span>
                  </Link>
                </div>
              </CardBody>
            </Card>

            {/* Active Crops Lifecycle Status */}
            <Card>
              <CardHead
                title={isHindi ? 'सक्रिय फ़सल स्थिति' : 'Crop Lifecycle Status'}
                meta={`${crops.length} ${isHindi ? 'फ़सलें' : 'Crops'}`}
              />
              <CardBody className="space-y-3">
                {crops.length === 0 ? (
                  <p className="text-data text-ink-3 py-4 text-center">
                    {isHindi ? 'अभी कोई फसल नहीं जोड़ी गई है।' : 'No crops registered yet.'}
                  </p>
                ) : (
                  crops.map((c) => {
                    const stg = stageFor(c)
                    return (
                      <div key={c.id} className="rounded-xl border border-line bg-sunk/60 p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-caption font-bold text-ink">🌾 {c.name}</span>
                          <span className="rounded bg-accent-soft px-2 py-0.5 font-mono text-[10px] font-bold text-accent">
                            {stg.label} ({Math.round(stg.progress * 100)}%)
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-line">
                          <div
                            className="h-full rounded-full bg-accent transition-all duration-500"
                            style={{ width: `${Math.round(stg.progress * 100)}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-data text-ink-3 text-xs">
                          <span>{stg.days ? `${stg.days} days after sowing` : 'Planning stage'}</span>
                          {stg.expectedHarvestDate && <span>Harvest: {stg.expectedHarvestDate}</span>}
                        </div>
                      </div>
                    )
                  })
                )}
                <div className="pt-1">
                  <Link to="/farm?tab=crops" className="lbl text-accent hover:underline flex items-center gap-1">
                    <span>{isHindi ? 'फ़सल प्रबंधन व चरण देखें →' : 'Manage crops & stages →'}</span>
                  </Link>
                </div>
              </CardBody>
            </Card>
          </div>
        </Reveal>
      )}

      {/* ----------------------------------------------------- RISK SNAPSHOT */}
      <Reveal delay={100}>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHead
              title={isFarm ? t('tileFarmRisk', lang) : t('compositeRisk', lang)}
              meta={risk?.score != null ? `${t('tileRisk', lang)} ${risk.score}/100` : '—'}
            />
            <CardBody>
              {!risk ? (
                <p className="text-data leading-relaxed text-ink-3">Risk score currently unavailable.</p>
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
                        <Meter value={b.weight} max={40} tone={SEVERITY[b.tone || 'green'].bg} className="mt-1.5" />
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

      {/* ------------------------------------------------------------- NOTICE */}
      {(mode !== 'live' || degraded) && (
        <p className="rounded-xl border border-line bg-sunk px-4 py-3 text-data leading-relaxed text-ink-2">
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
