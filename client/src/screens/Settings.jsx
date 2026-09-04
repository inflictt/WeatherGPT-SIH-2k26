import { LANGUAGES, AUDIENCES } from '../lib/constants'
import { useHealth } from '../lib/useHealth'
import { useFarm } from '../lib/useFarm'
import { cn } from '../lib/utils'
import Icon from '../ui/Icon'
import { Card, CardHead, CardBody, Shell, PageHead, Switch, Segmented } from '../ui/Bits'
import Reveal from '../ui/Reveal'
import AccountCard from '../shell/AccountCard'

/**
 * Settings.
 *
 * One rule: every control here changes something. A toggle that only changes
 * its own appearance teaches people the app lies, so if a preference stops
 * being read anywhere, the control goes rather than being left as decoration.
 */
export default function Settings({ prefs, lang, setLang, audience, setAudience, picker, onChangeLocation }) {
  const p = prefs.value
  const health = useHealth()
  const { farm, reset, completeness } = useFarm()

  return (
    <Shell className="space-y-4 pb-8">
      <PageHead eyebrow="Preferences" title="Settings">
        Language, who you are, and what you want to be interrupted for.
      </PageHead>

      {/* ------------------------------------------------------------ place */}
      <Card>
        <CardHead title="Location" meta="Everything is computed for one place" />
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
            Change
          </button>
        </CardBody>
      </Card>

      {/* --------------------------------------------------------- language */}
      <Reveal>
        <Card>
          <CardHead title="Language" meta="Three shipping · more later" />
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
            <p className="mt-3 text-data leading-relaxed text-ink-3">
              The four unshipped languages are config entries with no strings yet. Adding one is a
              key per entry — but the safety instructions are not machine-translated, so each
              needs a native speaker before it ships.
            </p>
          </CardBody>
        </Card>
      </Reveal>

      {/* ---------------------------------------------------------- audience */}
      <Reveal delay={60}>
        <Card>
          <CardHead title="Who this is for" meta="Changes the advice, never the forecast" />
          <CardBody className="flex flex-wrap items-center justify-between gap-4">
            <p className="max-w-measure text-data leading-relaxed text-ink-2">
              The same figures read differently depending on who is asking. Farm mode turns the
              brief into irrigation, spray windows and harvest timing; everyone else gets travel,
              clothing and warnings.
            </p>
            <Segmented
              label="Who this is for"
              options={AUDIENCES.map((a) => ({ key: a.key, label: a.label }))}
              value={audience}
              onChange={setAudience}
            />
          </CardBody>
        </Card>
      </Reveal>

      {/* ------------------------------------------------------- preferences */}
      <Reveal delay={90}>
        <Card>
          <CardHead title="Notifications & display" />
          <CardBody>
            {[
              ['units', 'Units', 'Metric everywhere, or °F and mph.', null],
              ['severeOnly', 'Severe events only', 'Hide yellow advisories from the alerts list and from push.', 'switch'],
              ['voiceReplies', 'Speak answers aloud', 'Only ever after a spoken question — a typed one stays silent.', 'switch'],
              ['dataSaver', 'Data saver', 'Drops map tiles and turns off entrance animation.', 'switch'],
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
          <CardHead title="Farm data" meta={`${completeness}% complete · this device only`} />
          <CardBody className="flex flex-wrap items-center justify-between gap-4">
            <p className="max-w-measure text-data leading-relaxed text-ink-2">
              Your farm profile, crops and scan log are stored in this browser and never sent
              anywhere. Clearing them cannot be undone.
            </p>
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Delete the farm profile, crops and scan log from this device?')) reset()
              }}
              disabled={!farm.name && farm.crops.length === 0}
              className="btn-ghost disabled:opacity-40"
            >
              Clear farm data
            </button>
          </CardBody>
        </Card>
      </Reveal>

      {/* -------------------------------------------------- account & push */}
      <Reveal delay={130}>
        <AccountCard />
      </Reveal>

      {/* ---------------------------------------------------------- sources */}
      <Reveal delay={150}>
        <Card>
          <CardHead title="Data sources" meta={health?.data?.status || 'Not connected'} />
          <CardBody>
            {[
              ['Open-Meteo', 'Forecast, three models — no key needed'],
              ['NDMA Sachet', 'CAP 1.2 warnings, checked every five minutes'],
              ['IMD thresholds', 'Every rainfall and wind band is a published number'],
              ['Risk engine', 'Deterministic Python — the model never scores'],
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
