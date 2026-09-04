import { useState } from 'react'
import { LANGUAGES, PERSONAS } from '../lib/constants'
import { ago, cn } from '../lib/utils'
import { Card, CardHead } from '../components/ui/Card'
import Reveal from '../components/ui/Reveal'
import { SectionTitle, Switch, Skeleton } from '../components/ui/Bits'
import { useHealth } from '../lib/useHealth'
import { useAuth } from '../lib/useAuth'
import { usePush } from '../lib/usePush'

const STATUS = {
  ok: { text: 'text-sev-green', dot: 'bg-sev-green', label: 'Healthy' },
  degraded: { text: 'text-sev-yellow', dot: 'bg-sev-yellow', label: 'Degraded' },
  down: { text: 'text-sev-red', dot: 'bg-sev-red', label: 'Unavailable' },
  partial: { text: 'text-sev-yellow', dot: 'bg-sev-yellow', label: 'Partial' },
  unknown: { text: 'text-ink-3', dot: 'bg-ink-3', label: 'No data yet' },
  unseeded: { text: 'text-sev-yellow', dot: 'bg-sev-yellow', label: 'Not seeded' },
}

function Row({ label, hint, children }) {
  return (
    <div className="flex items-center gap-4 border-b border-line-soft py-3.5 last:border-b-0">
      <div className="min-w-0 flex-1">
        <div className="text-[14px] text-ink">{label}</div>
        {hint && <div className="mt-0.5 text-[12.5px] leading-relaxed text-ink-3">{hint}</div>}
      </div>
      <div className="flex-none">{children}</div>
    </div>
  )
}

/**
 * Every preference on this screen is read somewhere — see lib/usePreferences.js
 * for the map of which screen consumes which. They used to be local `useState`,
 * which meant the controls moved and nothing happened; a control that visibly
 * does nothing teaches people the app lies.
 */
export default function Settings({ lang, setLang, persona, setPersona, prefs }) {
  const health = useHealth()
  const auth = useAuth()
  const push = usePush(auth.token)
  const p = prefs.value

  return (
    <div className="shell space-y-12 py-10">
      <Reveal>
        <header>
          <h1 className="headline text-heading text-ink">
            Settings
          </h1>
          <p className="mt-4 text-body-lg font-normal leading-relaxed text-ink-2">
            Language, who you are, and what you want to be interrupted for.
          </p>
        </header>
      </Reveal>

      <section>
        <Reveal><SectionTitle>Language</SectionTitle></Reveal>
        <Reveal delay={60}>
          <Card>
            <CardHead label="Interface and voice" meta="Three shipping · more later" />
            <div className="grid gap-2 px-5 pb-5 pt-3 sm:grid-cols-2 lg:grid-cols-3">
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  disabled={!l.ready}
                  onClick={() => setLang(l.code)}
                  className={cn(
                    'flex items-center justify-between gap-3 rounded border px-3.5 py-3 text-left',
                    'transition-colors duration-250 ease-out',
                    lang === l.code
                      ? 'border-accent/45 bg-accent-dim'
                      : 'border-line hover:border-ink-3 hover:bg-raised',
                    !l.ready && 'cursor-not-allowed opacity-40 hover:border-line hover:bg-transparent',
                  )}
                >
                  <span>
                    <span className={cn('block text-[14px]', lang === l.code ? 'text-accent' : 'text-ink')}>
                      {l.native}
                    </span>
                    <span className="block text-[12px] text-ink-3">{l.blurb || l.label}</span>
                  </span>
                  {!l.ready && (
                    <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-ink-3">
                      Later
                    </span>
                  )}
                </button>
              ))}
            </div>
          </Card>
        </Reveal>
      </section>

      <section>
        <Reveal><SectionTitle>You</SectionTitle></Reveal>
        <Reveal delay={60}>
          <Card>
            <CardHead label="Persona" meta="Changes the advice, never the forecast" />
            <div className="grid gap-2 px-5 pb-5 pt-3 sm:grid-cols-2">
              {PERSONAS.map((x) => (
                <button
                  key={x.key}
                  type="button"
                  onClick={() => setPersona(x.key)}
                  className={cn(
                    'rounded border px-3.5 py-3 text-left transition-colors duration-250 ease-out',
                    persona === x.key
                      ? 'border-accent/45 bg-accent-dim'
                      : 'border-line hover:border-ink-3 hover:bg-raised',
                  )}
                >
                  <span className={cn('block text-[14px]', persona === x.key ? 'text-accent' : 'text-ink')}>
                    {x.label}
                  </span>
                  <span className="mt-0.5 block text-[12.5px] leading-relaxed text-ink-3">{x.blurb}</span>
                </button>
              ))}
            </div>
          </Card>
        </Reveal>
      </section>

      <section>
        <Reveal><SectionTitle>Account</SectionTitle></Reveal>
        <Reveal delay={60}>
          <AccountCard auth={auth} push={push} />
        </Reveal>
      </section>

      <section>
        <Reveal><SectionTitle>Notifications &amp; display</SectionTitle></Reveal>
        <Reveal delay={60}>
          <Card>
            <div className="px-5 pb-4 pt-4">
              <Row
                label="Severe events only"
                hint="Orange and red warnings only. Yellow stays in the app and is never pushed."
              >
                <Switch on={p.severeOnly} onChange={() => prefs.toggle('severeOnly')} label="Severe only" />
              </Row>
              <Row
                label="Speak answers aloud"
                hint="A spoken question gets a spoken answer. A typed one never starts talking on its own."
              >
                <Switch on={p.voiceReplies} onChange={() => prefs.toggle('voiceReplies')} label="Voice replies" />
              </Row>
              <Row
                label="Data saver"
                hint="Skips map tiles and reveal animations. Tiles are the largest data cost in the app."
              >
                <Switch on={p.dataSaver} onChange={() => prefs.toggle('dataSaver')} label="Data saver" />
              </Row>
              <Row label="Units" hint="Metric follows IMD conventions: mm, °C, km/h.">
                <div className="flex rounded-md border border-line p-[3px]">
                  {['metric', 'imperial'].map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => prefs.set('units', u)}
                      aria-pressed={p.units === u}
                      className={cn(
                        'rounded px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] transition-colors duration-250',
                        p.units === u ? 'bg-accent text-on-accent' : 'text-ink-3 hover:text-ink-2',
                      )}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </Row>
            </div>
            <div className="border-t border-line-soft px-5 py-3">
              <button
                type="button"
                onClick={prefs.reset}
                className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3 transition-colors duration-200 hover:text-accent"
              >
                Reset to defaults
              </button>
            </div>
          </Card>
        </Reveal>
      </section>

      <section>
        <Reveal><SectionTitle>Data sources</SectionTitle></Reveal>
        <Reveal delay={60}>
          <Card>
            <CardHead
              label="Ingestion status"
              meta={health.live ? '/api/health · live' : health.loading ? 'checking…' : 'sample'}
            />
            <ul className="px-5 pb-5 pt-3">
              {health.loading &&
                [0, 1, 2].map((i) => (
                  <li key={i} className="flex items-center gap-4 border-b border-line-soft py-3.5 last:border-b-0">
                    <Skeleton className="h-1.5 w-1.5 rounded-full" />
                    <Skeleton className="h-3 w-40" />
                  </li>
                ))}

              {!health.loading &&
                health.sources.map((s) => {
                  const st = STATUS[s.status] || STATUS.degraded
                  return (
                    <li key={s.name} className="flex items-center gap-4 border-b border-line-soft py-3 last:border-b-0">
                      <span className={cn('h-1.5 w-1.5 flex-none rounded-full', st.dot)} aria-hidden="true" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13.5px] text-ink">{s.name}</div>
                        <div className="font-mono text-[10px] uppercase tracking-[0.11em] text-ink-3">
                          {s.role}
                          {s.detail ? ` · ${s.detail}` : ''}
                        </div>
                      </div>
                      <div className="flex-none text-right">
                        <div className={cn('font-mono text-[10px] uppercase tracking-[0.12em]', st.text)}>
                          {st.label}
                        </div>
                        <div className="font-mono text-[10px] tnum text-ink-3">{ago(s.issuedAt)}</div>
                      </div>
                    </li>
                  )
                })}
            </ul>

            {!health.live && !health.loading && (
              <p className="border-t border-line-soft px-5 py-3 text-[12.5px] leading-relaxed text-ink-3">
                {health.error
                  ? `Could not reach the API (${health.error}). These are bundled sample values.`
                  : 'No API configured — these are bundled sample values. Set VITE_API_URL to see live source status.'}
              </p>
            )}
          </Card>
        </Reveal>
      </section>
    </div>
  )
}

/* ------------------------------------------------------------- account --- */

/** Each push state needs its own sentence, and some need no button at all. */
const PUSH_COPY = {
  unsupported: ['Not available', 'This browser cannot receive push notifications.'],
  unconfigured: ['Not configured', 'The server has no push keys set — not something you can fix from here.'],
  'signed-out': ['Sign in first', 'A notification has to reach your phone when the app is closed, which needs an account.'],
  denied: ['Blocked', 'Notifications are blocked for this site. Allow them in your browser settings.'],
  ready: ['On', "You'll be told once per warning for the places you saved."],
  idle: ['Off', 'Get told when a severe warning is issued for a place you saved.'],
}

function AccountCard({ auth, push }) {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [pushLabel, pushHint] = PUSH_COPY[push.state] || PUSH_COPY.idle

  const submit = (e) => {
    e.preventDefault()
    if (mode === 'login') auth.login(form.email, form.password)
    else auth.register(form)
  }

  if (auth.signedIn) {
    return (
      <Card>
        <CardHead label="Signed in" meta={auth.user?.email || ''} />
        <div className="px-5 pb-4 pt-4">
          <Row label="Push notifications" hint={pushHint}>
            {push.state === 'ready' ? (
              <button
                type="button"
                onClick={push.unsubscribe}
                className="rounded-full border border-line px-3.5 py-2 text-[12.5px] text-ink-2 transition-colors duration-200 hover:border-ink-3 hover:text-ink"
              >
                Turn off
              </button>
            ) : (
              <button
                type="button"
                onClick={push.subscribe}
                disabled={['unsupported', 'unconfigured', 'denied'].includes(push.state)}
                className="rounded-full bg-accent px-3.5 py-2 text-[12.5px] text-on-accent transition-opacity duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {pushLabel === 'Off' ? 'Turn on' : pushLabel}
              </button>
            )}
          </Row>
          {push.error && (
            <p role="alert" className="pt-2 text-[12.5px] text-sev-orange">{push.error}</p>
          )}
        </div>
        <div className="border-t border-line-soft px-5 py-3">
          <button
            type="button"
            onClick={auth.logout}
            className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3 transition-colors duration-200 hover:text-accent"
          >
            Sign out
          </button>
        </div>
      </Card>
    )
  }

  return (
    <Card>
      <CardHead label={mode === 'login' ? 'Sign in' : 'Create an account'} meta="Optional" />
      <div className="px-5 pb-5 pt-3">
        <p className="mb-4 max-w-measure text-[13px] leading-relaxed text-ink-2">
          You do not need an account to use WeatherGPT — the forecast, warnings
          and risk all work without one. An account adds two things: saved
          locations that follow you to a new phone, and push notifications,
          which have to reach your device when the app is closed.
        </p>

        <form onSubmit={submit} className="flex max-w-sm flex-col gap-2.5">
          {mode === 'register' && (
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Name"
              autoComplete="name"
              className="h-11 rounded border border-line bg-surface px-3 text-[14px] text-ink placeholder:text-ink-3 focus:border-accent/50 focus:outline-none"
            />
          )}
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="Email"
            autoComplete="email"
            className="h-11 rounded border border-line bg-surface px-3 text-[14px] text-ink placeholder:text-ink-3 focus:border-accent/50 focus:outline-none"
          />
          <input
            type="password"
            required
            minLength={8}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="Password — at least 8 characters"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            className="h-11 rounded border border-line bg-surface px-3 text-[14px] text-ink placeholder:text-ink-3 focus:border-accent/50 focus:outline-none"
          />

          {auth.error && (
            <p role="alert" className="text-[12.5px] leading-relaxed text-sev-orange">
              {auth.error}
            </p>
          )}

          <div className="mt-1 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={auth.busy}
              className="rounded-full bg-accent px-4 py-2.5 text-[13px] text-on-accent transition-opacity duration-200 hover:opacity-90 disabled:opacity-50"
            >
              {auth.busy ? 'Working…' : mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login')
                auth.clearError()
              }}
              className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3 transition-colors duration-200 hover:text-accent"
            >
              {mode === 'login' ? 'Create one instead' : 'I have an account'}
            </button>
          </div>
        </form>
      </div>
    </Card>
  )
}
