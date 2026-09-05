import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { CROP_DATABASE, getCropProfile, calculateCropLifecycle } from '../lib/cropProfiles'
import { t } from '../lib/i18n'
import { cn } from '../lib/utils'
import Icon from '../ui/Icon'
import { Card, CardHead, CardBody, Meter } from '../ui/Bits'
import Reveal from '../ui/Reveal'

export default function CropPlanner({
  farm,
  updateCrop,
  addCrop,
  lang = 'en',
  location,
}) {
  const navigate = useNavigate()
  const crops = farm?.crops || []

  // Selected crop ID for planning
  const [selectedCropId, setSelectedCropId] = useState(() => crops[0]?.id || null)

  // Ensure selectedCropId is valid
  const activeCrop = crops.find((c) => c.id === selectedCropId) || crops[0] || null

  const cropProfile = useMemo(() => {
    return getCropProfile(activeCrop?.name || 'Wheat')
  }, [activeCrop?.name])

  const lifecycle = useMemo(() => {
    return calculateCropLifecycle(cropProfile, activeCrop?.sownAt)
  }, [cropProfile, activeCrop?.sownAt])

  const isHindi = lang === 'hi'

  const handleSowingPreset = (daysAgo) => {
    if (!activeCrop) return
    const d = new Date()
    d.setDate(d.getDate() - daysAgo)
    const iso = d.toISOString().split('T')[0]
    updateCrop(activeCrop.id, { sownAt: iso })
  }

  const askKrishivaani = (stageLabel, cropName) => {
    const query = isHindi
      ? `मेरी ${cropName || 'फसल'} अभी ${stageLabel} अवस्था में है। वर्तमान मौसम के अनुसार मुझे क्या सावधानी और खाद/सिंचाई करनी चाहिए?`
      : `My ${cropName || 'crop'} is currently in ${stageLabel} stage. Based on current weather, what agronomic actions and precautions should I take?`
    
    // Store prompt in sessionStorage so Ask.jsx can prefill and send
    sessionStorage.setItem('kv_prefill_query', query)
    navigate('/ask')
  }

  if (crops.length === 0) {
    return (
      <Card className="p-8 sm:p-12 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-soft text-accent shadow-sm">
          <Icon name="sprout" size={32} />
        </div>
        <h3 className="mt-4 text-heading-sm font-bold text-ink">
          {isHindi ? 'कोई फसल अभी जोड़ी नहीं गई है' : 'No Crops in Farm Profile Yet'}
        </h3>
        <p className="mx-auto mt-2 max-w-md text-data leading-relaxed text-ink-3">
          {isHindi
            ? 'अपनी फसल का नाम और बुवाई की तारीख जोड़ें ताकि AI फसल विकास के सभी चरणों का पूर्वानुमान लगा सके।'
            : 'Add a crop name and sowing date to generate a day-by-day growth timeline, critical irrigation alerts, and fertilizer schedules.'}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => addCrop({ name: 'Wheat (गेहूँ)', sownAt: new Date().toISOString().split('T')[0] })}
            className="flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-caption font-semibold text-on-accent shadow hover:opacity-95"
          >
            <Icon name="plus" size={15} />
            <span>{isHindi ? 'गेहूँ फसल जोड़ें' : 'Add Wheat (Gehu)'}</span>
          </button>
          <button
            type="button"
            onClick={() => addCrop({ name: 'Mustard (सरसों)', sownAt: new Date().toISOString().split('T')[0] })}
            className="flex items-center gap-2 rounded-xl border border-line bg-surface px-5 py-2.5 text-caption font-semibold text-ink shadow-sm hover:bg-sunk"
          >
            <Icon name="plus" size={15} />
            <span>{isHindi ? 'सरसों फसल जोड़ें' : 'Add Mustard (Sarson)'}</span>
          </button>
          <button
            type="button"
            onClick={() => addCrop({ name: 'Paddy (धान)', sownAt: new Date().toISOString().split('T')[0] })}
            className="flex items-center gap-2 rounded-xl border border-line bg-surface px-5 py-2.5 text-caption font-semibold text-ink shadow-sm hover:bg-sunk"
          >
            <Icon name="plus" size={15} />
            <span>{isHindi ? 'धान फसल जोड़ें' : 'Add Paddy (Rice)'}</span>
          </button>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* --- CROP SELECTOR TABS & QUICK SOWING DATE CONFIG --- */}
      <Card>
        <CardHead
          title={isHindi ? 'फसल चयन एवं बुवाई तिथि' : 'Crop Selection & Sowing Date'}
          meta={
            crops.length > 1
              ? isHindi
                ? `${crops.length} फसलें दर्ज`
                : `${crops.length} active crops`
              : null
          }
          action={
            <button
              type="button"
              onClick={() => addCrop({ name: 'Wheat', sownAt: new Date().toISOString().split('T')[0] })}
              className="lbl inline-flex items-center gap-1.5 text-accent hover:text-accent-2"
            >
              <Icon name="plus" size={13} />
              {isHindi ? 'अन्य फसल जोड़ें' : 'Add Another Crop'}
            </button>
          }
        />
        <CardBody className="space-y-4">
          {/* Multiple Crop Pills */}
          {crops.length > 1 && (
            <div className="flex flex-wrap items-center gap-2 border-b border-line-soft pb-3">
              {crops.map((c) => {
                const isActive = (c.id === (activeCrop?.id || crops[0]?.id))
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedCropId(c.id)}
                    className={cn(
                      'flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-caption font-medium transition-colors',
                      isActive
                        ? 'bg-accent text-on-accent shadow-sm'
                        : 'bg-sunk text-ink-2 hover:bg-line-soft hover:text-ink'
                    )}
                  >
                    <Icon name="sprout" size={14} />
                    <span>{c.name || (isHindi ? 'अनाम फसल' : 'Unnamed Crop')}</span>
                  </button>
                )
              })}
            </div>
          )}

          {/* Active Crop Controls */}
          {activeCrop && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="block text-ink-3">
                  <span className="lbl">{isHindi ? 'फसल का प्रकार' : 'Crop Type / Variety'}</span>
                  <select
                    value={
                      Object.keys(CROP_DATABASE).find((k) =>
                        new RegExp(k, 'i').test(activeCrop.name)
                      ) || 'wheat'
                    }
                    onChange={(e) => {
                      const selected = CROP_DATABASE[e.target.value]
                      if (selected) {
                        updateCrop(activeCrop.id, {
                          name: isHindi ? selected.nameHi : selected.name,
                        })
                      }
                    }}
                    className="mt-1.5 h-10 w-full rounded-lg border border-line bg-sunk px-3 text-caption text-ink outline-none focus:border-accent focus:bg-surface"
                  >
                    {Object.values(CROP_DATABASE).map((p) => (
                      <option key={p.key} value={p.key}>
                        {isHindi ? p.nameHi : p.name} ({p.season} Season · {p.totalDays}d)
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div>
                <label className="block text-ink-3">
                  <span className="lbl">{isHindi ? 'बुवाई की तारीख (Sowing Date)' : 'Sowing Date'}</span>
                  <input
                    type="date"
                    value={activeCrop.sownAt || ''}
                    onChange={(e) => updateCrop(activeCrop.id, { sownAt: e.target.value })}
                    className="mt-1.5 h-10 w-full rounded-lg border border-line bg-sunk px-3 text-caption text-ink outline-none focus:border-accent focus:bg-surface"
                  />
                </label>
              </div>

              <div>
                <span className="lbl block text-ink-3">{isHindi ? 'त्वरित चयन' : 'Quick Sowing Presets'}</span>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleSowingPreset(0)}
                    className="rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs text-ink-2 hover:border-accent hover:text-accent"
                  >
                    {isHindi ? 'आज' : 'Today'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSowingPreset(21)}
                    className="rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs text-ink-2 hover:border-accent hover:text-accent"
                  >
                    {isHindi ? '3 सप्ताह पूर्व (CRI)' : '3 wks ago (CRI)'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSowingPreset(50)}
                    className="rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs text-ink-2 hover:border-accent hover:text-accent"
                  >
                    {isHindi ? '7 सप्ताह पूर्व' : '7 wks ago'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSowingPreset(80)}
                    className="rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs text-ink-2 hover:border-accent hover:text-accent"
                  >
                    {isHindi ? 'फूल अवस्था' : 'Flowering'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {/* --- LIFECYCLE SUMMARY DASHBOARD --- */}
      {lifecycle.hasSownDate ? (
        <Reveal>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-line bg-surface p-4 shadow-sm">
              <span className="lbl text-ink-3">{isHindi ? 'वर्तमान विकास अवस्था' : 'Current Predicted Stage'}</span>
              <div className="mt-1 text-body-lg font-bold text-accent">
                {isHindi ? lifecycle.currentStage?.labelHi : lifecycle.currentStage?.label}
              </div>
              <div className="mt-0.5 text-data text-ink-3">
                {lifecycle.currentStage?.startDay}–{lifecycle.currentStage?.endDay} {isHindi ? 'दिन (DAS)' : 'DAS'}
              </div>
            </div>

            <div className="rounded-xl border border-line bg-surface p-4 shadow-sm">
              <span className="lbl text-ink-3">{isHindi ? 'बुवाई से बीते दिन (DAS)' : 'Days After Sowing'}</span>
              <div className="mt-1 text-heading-sm font-bold text-ink">
                {lifecycle.daysAfterSowing} <span className="text-body-sm font-normal text-ink-3">/ {cropProfile.totalDays} {isHindi ? 'दिन' : 'days'}</span>
              </div>
              <div className="mt-1.5">
                <Meter value={lifecycle.progressPercent} max={100} />
              </div>
            </div>

            <div className="rounded-xl border border-line bg-surface p-4 shadow-sm">
              <span className="lbl text-ink-3">{isHindi ? 'अपेक्षित कटाई अनुमान' : 'Expected Harvest Date'}</span>
              <div className="mt-1 text-body-lg font-semibold text-ink">
                {lifecycle.expectedHarvestDate || '—'}
              </div>
              <div className="mt-0.5 text-data text-ink-3">
                {Math.max(0, cropProfile.totalDays - (lifecycle.daysAfterSowing || 0))} {isHindi ? 'दिन शेष' : 'days remaining'}
              </div>
            </div>

            <div className="rounded-xl border border-line bg-surface p-4 shadow-sm">
              <span className="lbl text-ink-3">{isHindi ? 'सिंचाई प्राथमिकता' : 'Irrigation Window'}</span>
              <div className="mt-1 flex items-center gap-1.5">
                {lifecycle.currentStage?.criticalIrrigation ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-sev-amber/20 px-2.5 py-0.5 text-caption font-bold text-sev-amber">
                    <Icon name="drop" size={13} />
                    {isHindi ? 'अति आवश्यक' : 'CRITICAL'}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-0.5 text-caption font-semibold text-accent">
                    <Icon name="check" size={13} />
                    {isHindi ? 'सामान्य नमी' : 'Normal Moisture'}
                  </span>
                )}
              </div>
              <div className="mt-1 text-caption text-ink-2 truncate">
                {isHindi ? lifecycle.currentStage?.irrigationNeedHi : lifecycle.currentStage?.irrigationNeed}
              </div>
            </div>
          </div>
        </Reveal>
      ) : (
        <div className="rounded-xl border border-sev-amber/30 bg-sev-amber-soft/30 p-4 text-data text-ink-2">
          <div className="flex items-center gap-2 font-medium text-sev-amber">
            <Icon name="alert" size={16} />
            <span>{isHindi ? 'कृपया बुवाई की तिथि चुनें' : 'Please select a sowing date'}</span>
          </div>
          <p className="mt-1 text-caption text-ink-3">
            {isHindi
              ? 'बुवाई की तारीख दर्ज करते ही आपकी फसल के सभी चरणों, सिंचाई समय और खाद की सही तिथियां स्वचालित रूप से तैयार हो जाएंगी।'
              : 'Select your sowing date above to automatically unlock accurate stage dates, fertilizer deadlines, and critical water windows.'}
          </p>
        </div>
      )}

      {/* --- DETAILED STAGE TIMELINE & AGRONOMIC GUIDELINES --- */}
      <Card>
        <CardHead
          title={isHindi ? `${cropProfile.nameHi} विकास क्रम एवं कार्ययोजना` : `${cropProfile.name} Lifecycle Timeline & Plan`}
          meta={isHindi ? `${lifecycle.stagesWithDates.length} प्रमुख चरण` : `${lifecycle.stagesWithDates.length} Growth Stages`}
        />
        <CardBody className="space-y-4">
          <div className="space-y-3">
            {lifecycle.stagesWithDates.map((st, idx) => {
              const isCurrent = st.status === 'active'
              const isPast = st.status === 'completed'

              return (
                <div
                  key={st.key}
                  className={cn(
                    'relative rounded-xl border p-4 sm:p-5 transition-all duration-200',
                    isCurrent
                      ? 'border-accent bg-accent-soft/20 shadow-md ring-1 ring-accent/30'
                      : isPast
                        ? 'border-line/70 bg-sunk/30 opacity-80'
                        : 'border-line bg-surface'
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span
                        className={cn(
                          'grid h-8 w-8 flex-none place-items-center rounded-full text-caption font-bold transition-colors',
                          isCurrent
                            ? 'bg-accent text-on-accent shadow-sm'
                            : isPast
                              ? 'bg-accent/20 text-accent'
                              : 'border border-line bg-surface text-ink-3'
                        )}
                      >
                        {isPast ? <Icon name="check" size={15} /> : idx + 1}
                      </span>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-body-sm font-bold text-ink">
                            {isHindi ? st.labelHi : st.label}
                          </h4>
                          {isCurrent && (
                            <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-on-accent">
                              {isHindi ? 'वर्तमान चरण' : 'CURRENT STAGE'}
                            </span>
                          )}
                          {st.criticalIrrigation && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-sev-amber/20 px-2 py-0.5 text-[11px] font-semibold text-sev-amber">
                              <Icon name="drop" size={11} />
                              {isHindi ? 'क्रांतिक सिंचाई' : 'Critical Water Window'}
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 text-caption font-medium text-ink-3">
                          {st.dateRangeStr}
                        </div>
                      </div>
                    </div>

                    {/* Ask Krishivaani quick action */}
                    <button
                      type="button"
                      onClick={() => askKrishivaani(isHindi ? st.labelHi : st.label, activeCrop?.name)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-accent/40 bg-surface px-3 py-1.5 text-xs font-semibold text-accent hover:bg-accent-soft shadow-sm"
                    >
                      <Icon name="bot" size={13} />
                      <span>{isHindi ? 'कृषिवाणी से सलाह लें' : 'Consult Krishivaani'}</span>
                    </button>
                  </div>

                  {/* Tasks & Agronomic Operations */}
                  <div className="mt-4 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3 border-t border-line-soft pt-3.5">
                    {/* Tasks */}
                    <div className="space-y-1.5">
                      <span className="lbl flex items-center gap-1 text-ink-2 font-semibold">
                        <Icon name="layers" size={13} className="text-accent" />
                        {isHindi ? 'अनुशंसित कृषि कार्य' : 'Key Field Tasks & Fertilizers'}
                      </span>
                      <ul className="space-y-1 text-caption text-ink leading-relaxed">
                        {(isHindi ? st.tasksHi : st.tasks).map((tItem, tIdx) => (
                          <li key={tIdx} className="flex items-start gap-1.5">
                            <span className="text-accent mt-0.5">•</span>
                            <span>{tItem}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Irrigation Details */}
                    <div className="space-y-1.5">
                      <span className="lbl flex items-center gap-1 text-ink-2 font-semibold">
                        <Icon name="drop" size={13} className="text-sev-blue" />
                        {isHindi ? 'सिंचाई निर्देश' : 'Irrigation Protocol'}
                      </span>
                      <p className="text-caption text-ink leading-relaxed">
                        {isHindi ? st.irrigationNeedHi : st.irrigationNeed}
                      </p>
                    </div>

                    {/* Weather & Disease Sensitivity */}
                    <div className="space-y-1.5">
                      <span className="lbl flex items-center gap-1 text-ink-2 font-semibold">
                        <Icon name="alert" size={13} className="text-sev-amber" />
                        {isHindi ? 'मौसम एवं रोग संवेदनशीलता' : 'Weather & Pest Sensitivity'}
                      </span>
                      <p className="text-caption text-ink-2 leading-relaxed">
                        {isHindi ? st.weatherSensitivityHi : st.weatherSensitivity}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
