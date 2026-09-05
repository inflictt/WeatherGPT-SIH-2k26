import { useState } from 'react'
import { useActiveWarnings, useData } from '../lib/DataContext'
import { useFarm, stageFor } from '../lib/useFarm'
import { evaluateFarmIntelligence } from '../lib/farmIntelligence'
import { CROP_STAGES } from '../lib/constants'
import { t } from '../lib/i18n'
import { cn, placeLine } from '../lib/utils'
import Icon from '../ui/Icon'
import { Card, CardHead, CardBody, Shell, PageHead, SubTabs, Meter } from '../ui/Bits'
import Reveal from '../ui/Reveal'
import ImageAnalyser from '../weather/ImageAnalyser'
import FarmConditions from '../weather/FarmConditions'

const SOILS = ['Alluvial', 'Black (regur)', 'Red', 'Laterite', 'Loamy', 'Sandy', 'Clay', 'Silty']
const IRRIGATION = ['Rain-fed', 'Tube well', 'Canal', 'Drip', 'Sprinkler', 'Tank / pond']
const WATER = ['Adequate', 'Limited', 'Scarce']

export default function Farm({ audience = 'farm', setAudience, lang = 'en' }) {
  const [tab, setTab] = useState('intelligence') // intelligence | farm | doctor | soil | planner
  const { farm, set, addCrop, updateCrop, removeCrop, logObservation, completeness } = useFarm()
  const { current, daily, summary24h, hourly, location } = useData()
  const warnings = useActiveWarnings()

  const isGeneral = audience === 'everyone'

  const intelligence = evaluateFarmIntelligence({
    farm,
    current,
    daily,
    summary24h,
    hourly,
    warnings,
    lang,
  })

  const tabs = [
    { key: 'intelligence', label: lang === 'hi' ? 'खेत स्थिति (Intelligence)' : 'Farm Intelligence' },
    { key: 'farm', label: t('subTabMyFarm', lang) },
    { key: 'doctor', label: t('subTabCropDoctor', lang) },
    { key: 'soil', label: t('subTabSoilCheck', lang) },
    { key: 'planner', label: t('subTabPlanner', lang) },
  ]

  return (
    <Shell className="space-y-4 pb-8">
      {isGeneral && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-accent/30 bg-accent-soft p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-accent text-on-accent">
              <Icon name="sprout" size={20} />
            </span>
            <div>
              <h4 className="text-body-sm font-bold text-ink">
                {t('farmerViewNotice', lang)}
              </h4>
            </div>
          </div>
          {setAudience && (
            <button
              type="button"
              onClick={() => setAudience('farm')}
              className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-caption font-bold text-on-accent shadow-sm hover:opacity-95"
            >
              <span>{t('switchToFarmerMode', lang)}</span>
            </button>
          )}
        </div>
      )}

      <PageHead
        eyebrow={placeLine(location)}
        title={t('farmConnectTitle', lang)}
        aside={
          <div className="flex items-center gap-3">
            <span className="lbl">{t('tabFarmShort', lang)}</span>
            <span className="h-1.5 w-24 overflow-hidden rounded-full bg-sunk">
              <span
                className="block h-full origin-left rounded-full bg-accent transition-transform duration-700"
                style={{ transform: `scaleX(${completeness / 100})` }}
              />
            </span>
            <span className="tnum text-data font-medium text-ink">{completeness}%</span>
          </div>
        }
      >
        Continuous farm monitoring, automated weather intelligence, smart photo triggers, and field diagnosis.
      </PageHead>

      <SubTabs tabs={tabs} value={tab} onChange={setTab} />

      {/* ------------------------------------------------------------ FARM INTELLIGENCE DASHBOARD */}
      {tab === 'intelligence' && (
        <div className="pt-1">
          <FarmConditions
            intelligence={intelligence}
            onOpenScan={() => setTab('doctor')}
            lang={lang}
          />
        </div>
      )}

      {/* ------------------------------------------------------------ my farm profile */}
      {tab === 'farm' && (
        <div className="space-y-3 pt-1">
          <Card>
            <CardHead title={t('subTabMyFarm', lang)} meta={farm.name ? 'Saved on this device' : 'Not set up yet'} />
            <CardBody>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Field label={t('farmName', lang)} icon="sprout">
                  <input
                    value={farm.name}
                    onChange={(e) => set({ name: e.target.value })}
                    placeholder="e.g. Kapriwas East"
                    className={inputCls}
                  />
                </Field>
                <Field label={t('areaUnderCrop', lang)} icon="layers">
                  <div className="flex items-center gap-2">
                    <input
                      value={farm.areaHa}
                      onChange={(e) => set({ areaHa: e.target.value })}
                      inputMode="decimal"
                      placeholder="2.4"
                      className={inputCls}
                    />
                    <span className="lbl flex-none">ha</span>
                  </div>
                </Field>
                <Field label={t('soilType', lang)} icon="flask">
                  <select value={farm.soilType} onChange={(e) => set({ soilType: e.target.value, soilSource: 'manual', soilConfidence: null })} className={inputCls}>
                    <option value="">Not set</option>
                    {SOILS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </Field>
                <Field label={t('irrigationSource', lang)} icon="drop">
                  <select value={farm.irrigation} onChange={(e) => set({ irrigation: e.target.value })} className={inputCls}>
                    <option value="">Not set</option>
                    {IRRIGATION.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </Field>
                <Field label={t('waterAvailability', lang)} icon="drop">
                  <select value={farm.water} onChange={(e) => set({ water: e.target.value })} className={inputCls}>
                    <option value="">Not set</option>
                    {WATER.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </Field>
                <Field label={t('seasonLabel', lang)} icon="calendar">
                  <input
                    value={farm.season}
                    onChange={(e) => set({ season: e.target.value })}
                    placeholder="e.g. Rabi 2026"
                    className={inputCls}
                  />
                </Field>
              </div>
            </CardBody>
          </Card>

          {/* ---- crops ---- */}
          <Card>
            <CardHead
              title={t('cropsThisSeason', lang)}
              action={
                <button
                  type="button"
                  onClick={() => addCrop({})}
                  className="lbl inline-flex items-center gap-1.5 text-accent hover:text-accent-2"
                >
                  <Icon name="plus" size={13} />
                  {t('addCrop', lang)}
                </button>
              }
            />
            <CardBody className="space-y-3">
              {farm.crops.length === 0 && (
                <p className="text-data leading-relaxed text-ink-3">
                  No crops yet. Add one to customize your daily brief and lifecycle stages.
                </p>
              )}
              {farm.crops.map((c) => {
                const st = stageFor(c)
                return (
                  <div key={c.id} className="rounded-lg border border-line p-4">
                    <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                      <Field label={t('cropName', lang)}>
                        <input
                          value={c.name}
                          onChange={(e) => updateCrop(c.id, { name: e.target.value })}
                          placeholder="Wheat / Gehu"
                          className={inputCls}
                        />
                      </Field>
                      <Field label={t('sownOn', lang)}>
                        <input
                          type="date"
                          value={c.sownAt || ''}
                          onChange={(e) => updateCrop(c.id, { sownAt: e.target.value })}
                          className={inputCls}
                        />
                      </Field>
                      <button
                        type="button"
                        onClick={() => removeCrop(c.id)}
                        aria-label={`Remove ${c.name || 'crop'}`}
                        className="tap mt-6 grid h-9 w-9 flex-none place-items-center rounded-md text-ink-3 transition-colors hover:text-sev-red"
                      >
                        <Icon name="close" size={15} />
                      </button>
                    </div>

                    {c.sownAt && (
                      <div className="mt-3.5 border-t border-line-soft pt-3">
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="text-data font-medium text-ink">{st.label}</span>
                          <span className="tnum text-data text-ink-3">Day {st.days}</span>
                        </div>
                        <Meter value={st.progress} max={1} className="mt-2" />
                      </div>
                    )}
                  </div>
                )
              })}
            </CardBody>
          </Card>

          {/* ---- observation log ---- */}
          <Card>
            <CardHead title={t('observationLog', lang)} meta={`${farm.observations.length} recorded`} />
            <CardBody className="space-y-2.5">
              {farm.observations.length === 0 && (
                <p className="text-data leading-relaxed text-ink-3">
                  {t('noObservationsYet', lang)}
                </p>
              )}
              {farm.observations.map((o) => (
                <div key={o.id} className="flex items-start gap-3 border-b border-line-soft pb-2.5 last:border-b-0">
                  <span className="grid h-8 w-8 flex-none place-items-center rounded-md bg-sunk text-ink-3">
                    <Icon name={o.mode === 'soil' ? 'flask' : 'leaf'} size={15} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <span className="text-caption font-medium text-ink">{o.prediction}</span>
                      <span className="tnum lbl">{Math.round((o.confidence || 0) * 100)}%</span>
                    </div>
                    <div className="text-data text-ink-3">
                      {new Date(o.at).toLocaleString()} · {o.mode === 'soil' ? t('subTabSoilCheck', lang) : t('subTabCropDoctor', lang)}
                    </div>
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>
        </div>
      )}

      {/* ------------------------------------------------------- crop doctor */}
      {tab === 'doctor' && (
        <div className="space-y-3 pt-1">
          <ImageAnalyser
            mode="leaf"
            crop={farm.crops[0]?.name}
            location={location}
            lang={lang}
            onResult={(r) => {
              logObservation({ mode: 'leaf', prediction: r.prediction, confidence: r.confidence })
            }}
            onViewDashboard={() => setTab('intelligence')}
          />
        </div>
      )}

      {/* --------------------------------------------------------- soil check */}
      {tab === 'soil' && (
        <div className="space-y-3 pt-1">
          <ImageAnalyser
            mode="soil"
            lang={lang}
            onResult={(r) => {
              logObservation({ mode: 'soil', prediction: r.prediction, confidence: r.confidence })
              set({ soilType: r.prediction, soilConfidence: r.confidence, soilSource: 'model' })
            }}
            onViewDashboard={() => setTab('intelligence')}
          />
        </div>
      )}

      {/* ------------------------------------------------------------ planner */}
      {tab === 'planner' && (
        <div className="space-y-3 pt-1">
          {farm.crops.length === 0 ? (
            <Card className="p-10 text-center">
              <span className="mx-auto grid h-11 w-11 place-items-center rounded-lg bg-accent-soft text-accent">
                <Icon name="calendar" size={20} />
              </span>
              <p className="mt-3 text-subheading font-medium text-ink">No crop to plan yet</p>
              <p className="mx-auto mt-1.5 max-w-measure text-data leading-relaxed text-ink-3">
                Add a crop and a sowing date under <strong className="font-medium text-ink">{t('subTabMyFarm', lang)}</strong> to view lifecycle stages.
              </p>
            </Card>
          ) : (
            farm.crops.map((c) => {
              const st = stageFor(c)
              const idx = CROP_STAGES.findIndex((s) => s.key === st.key)
              return (
                <Reveal key={c.id}>
                  <Card>
                    <CardHead
                      title={c.name || 'Crop'}
                      meta={st.days != null ? `Day ${st.days} · ${st.label}` : 'No sowing date'}
                    />
                    <CardBody>
                      <ol className="space-y-0">
                        {CROP_STAGES.map((s, i) => {
                          const done = i < idx
                          const now = i === idx
                          return (
                            <li key={s.key} className="flex gap-3.5">
                              <span className="flex flex-col items-center">
                                <span
                                  className={cn(
                                    'grid h-6 w-6 flex-none place-items-center rounded-full border-2 transition-colors',
                                    now
                                      ? 'border-accent bg-accent text-on-accent'
                                      : done
                                        ? 'border-accent bg-accent-soft text-accent'
                                        : 'border-line bg-surface text-ink-3',
                                  )}
                                >
                                  {done ? <Icon name="check" size={12} /> : <span className="text-[10px] font-mono">{i + 1}</span>}
                                </span>
                                {i < CROP_STAGES.length - 1 && (
                                  <span className={cn('w-0.5 flex-1', done ? 'bg-accent' : 'bg-line')} style={{ minHeight: 22 }} />
                                )}
                              </span>
                              <span className={cn('pb-4', now ? 'text-ink' : done ? 'text-ink-2' : 'text-ink-3')}>
                                <span className="block text-caption font-medium">{s.label}</span>
                              </span>
                            </li>
                          )
                        })}
                      </ol>
                    </CardBody>
                  </Card>
                </Reveal>
              )
            })
          )}
        </div>
      )}
    </Shell>
  )
}

const inputCls =
  'h-10 w-full rounded-lg border border-line bg-sunk px-3 text-caption text-ink outline-none transition-colors duration-150 placeholder:text-ink-3 focus:border-accent focus:bg-surface'

function Field({ label, icon, children }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 flex items-center gap-1.5 text-ink-3">
        {icon ? <Icon name={icon} size={13} /> : null}
        <span className="lbl">{label}</span>
      </span>
      {children}
    </label>
  )
}
