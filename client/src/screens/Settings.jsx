import { LANGUAGES } from '../lib/constants'
import { useHealth } from '../lib/useHealth'
import { useFarm } from '../lib/useFarm'
import { t } from '../lib/i18n'
import { cn } from '../lib/utils'
import Icon from '../ui/Icon'
import { Card, CardHead, CardBody, Shell, PageHead, Switch, Segmented } from '../ui/Bits'
import Reveal from '../ui/Reveal'
import AccountCard from '../shell/AccountCard'

export default function Settings({ prefs, lang = 'en', setLang, audience, setAudience, picker, onChangeLocation }) {
  const p = prefs.value
  const health = useHealth()
  const { farm, reset, completeness } = useFarm()

  return (
    <Shell className="space-y-4 pb-8">
      <PageHead eyebrow={t('preferencesTitle', lang)} title={t('settings', lang)}>
        {t('preferencesDesc', lang)}
      </PageHead>

      {/* ------------------------------------------------------------ place */}
      <Card>
        <CardHead title={t('locationCardTitle', lang)} meta={t('locationCardMeta', lang)} />
        <CardBody className="flex flex-wrap items-center gap-4">
          <span className="grid h-11 w-11 flex-none place-items-center rounded-lg bg-accent-soft text-accent">
            <Icon name="pin" size={20} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-body-sm font-medium text-ink">{picker.location?.name}</span>
            <span className="block text-data text-ink-3">
              {[picker.location?.district, picker.location?.state].filter(Boolean).join(', ') || '—'}
            </span>
          </span>
          <button type="button" onClick={onChangeLocation} className="btn-ghost">
            {t('changeBtn', lang)}
          </button>
        </CardBody>
      </Card>

      {/* --------------------------------------------------------- language */}
      <Reveal>
        <Card>
          <CardHead title={t('languageCardTitle', lang)} meta={t('languageCardMeta', lang)} />
          <CardBody>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  disabled={!l.ready}
                  onClick={() => setLang(l.code)}
                  className={cn(
                    'flex items-center justify-between gap-3 rounded-lg border p-3.5 text-left transition-colors duration-150',
                    lang === l.code ? 'border-accent bg-accent-soft' : 'border-line hover:border-ink-3',
                    !l.ready && 'cursor-not-allowed opacity-45 hover:border-line',
                  )}
                >
                  <span className="min-w-0">
                    <span className={cn('block text-caption font-medium', lang === l.code ? 'text-accent' : 'text-ink')}>
                      {l.native}
                    </span>
                    <span className="block truncate text-data text-ink-3">{l.blurb || l.label}</span>
                  </span>
                  {!l.ready && <span className="lbl flex-none">Later</span>}
                </button>
              ))}
            </div>
          </CardBody>
        </Card>
      </Reveal>

      {/* ---------------------------------------------------------- audience */}
      <Reveal delay={60}>
        <Card>
          <CardHead title={t('selectedModeTitle', lang)} meta={t('selectedModeMeta', lang)} />
          <CardBody className="flex flex-wrap items-center justify-between gap-4">
            <p className="max-w-measure text-data leading-relaxed text-ink-2">
              <strong>Akashvaani (General View)</strong>: Weather forecasts and NDMA safety alerts.<br />
              <strong>Krishivaani (Farmer View)</strong>: Unlocks Farm Connect, Crop Doctor & Soil Check.
            </p>
            <Segmented
              label="Selected Mode"
              options={[
                { key: 'everyone', label: 'Akashvaani (General)' },
                { key: 'farm', label: 'Krishivaani (Farmer)' },
              ]}
              value={audience}
              onChange={setAudience}
            />
          </CardBody>
        </Card>
      </Reveal>

      {/* ------------------------------------------------------- preferences */}
      <Reveal delay={90}>
        <Card>
          <CardHead title={t('notificationsDisplay', lang)} />
          <CardBody>
            {[
              ['units', t('unitsLabel', lang), t('unitsHint', lang), null],
              ['severeOnly', t('severeOnlyLabel', lang), t('severeOnlyHint', lang), 'switch'],
              ['voiceReplies', t('voiceRepliesLabel', lang), t('voiceRepliesHint', lang), 'switch'],
              ['dataSaver', t('dataSaverLabel', lang), t('dataSaverHint', lang), 'switch'],
            ].map(([key, label, hint, kind]) => (
              <div key={key} className="flex items-center gap-4 border-b border-line-soft py-3.5 last:border-b-0">
                <div className="min-w-0 flex-1">
                  <div className="text-caption text-ink">{label}</div>
                  <div className="mt-0.5 text-data leading-relaxed text-ink-3">{hint}</div>
                </div>
                {kind === 'switch' ? (
                  <Switch on={Boolean(p[key])} label={label} onChange={() => prefs.set(key, !p[key])} />
                ) : (
                  <Segmented
                    label="Units"
                    size="sm"
                    options={[
                      { key: 'metric', label: '°C' },
                      { key: 'imperial', label: '°F' },
                    ]}
                    value={p.units}
                    onChange={(v) => prefs.set('units', v)}
                  />
                )}
              </div>
            ))}
          </CardBody>
        </Card>
      </Reveal>

      {/* ------------------------------------------------------------- farm */}
      <Reveal delay={120}>
        <Card>
          <CardHead title={t('farmDataTitle', lang)} meta={`${completeness}% complete`} />
          <CardBody className="flex flex-wrap items-center justify-between gap-4">
            <p className="max-w-measure text-data leading-relaxed text-ink-2">
              Your farm profile, crops and scan log are stored in this browser.
            </p>
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Delete the farm profile, crops and scan log from this device?')) reset()
              }}
              disabled={!farm.name && farm.crops.length === 0}
              className="btn-ghost disabled:opacity-40"
            >
              {t('clearFarmData', lang)}
            </button>
          </CardBody>
        </Card>
      </Reveal>

      {/* -------------------------------------------------- account & push */}
      <Reveal delay={130}>
        <AccountCard lang={lang} />
      </Reveal>

      {/* ---------------------------------------------------------- sources */}
      <Reveal delay={150}>
        <Card>
          <CardHead title={t('dataSourcesTitle', lang)} meta={health?.data?.status || 'Connected'} />
          <CardBody>
            {[
              ['Open-Meteo', 'Numerical weather prediction (ECMWF, GFS, ICON)'],
              ['NDMA Sachet', 'CAP 1.2 disaster alerts feed'],
              ['IMD Thresholds', 'Official Indian Meteorological Dept rain/wind bands'],
              ['Deterministic Risk Engine', 'Mathematical verification'],
            ].map(([k, v]) => (
              <div key={k} className="flex items-baseline justify-between gap-4 border-b border-line-soft py-2.5 last:border-b-0">
                <span className="text-caption text-ink">{k}</span>
                <span className="text-right text-data text-ink-3">{v}</span>
              </div>
            ))}
          </CardBody>
        </Card>
      </Reveal>
    </Shell>
  )
}
