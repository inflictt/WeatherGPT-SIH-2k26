import { useState } from 'react'
import { useAuth } from '../lib/useAuth'
import { usePush } from '../lib/usePush'
import { cn } from '../lib/utils'
import Icon from '../ui/Icon'
import { Card, CardHead, CardBody, Switch } from '../ui/Bits'

/**
 * Account and push, together — because they are one decision.
 *
 * A notification has to reach a phone when the app is closed, which needs a
 * subscription tied to something durable, which needs an account. Splitting
 * them into two cards made "why can't I turn on alerts?" a puzzle; here the
 * dependency is visible.
 *
 * Every push state gets its own sentence, and several get no button at all —
 * "Off" and "Blocked by the browser" need different words *and* different
 * affordances, because one of them is not something this app can fix.
 */
const PUSH_COPY = {
  unsupported: ['Not available', 'This browser cannot receive push notifications.', false],
  unconfigured: ['Not configured', 'The server has no VAPID keys set — not something you can fix from here.', false],
  'signed-out': ['Sign in first', 'A notification has to reach your phone when the app is closed, which needs an account.', false],
  denied: ['Blocked', 'Notifications are blocked for this site. Allow them in your browser settings, then come back.', false],
  ready: ['On', "You'll be told once per warning for the places you saved.", true],
  idle: ['Off', 'Get told when a severe warning is issued for a place you saved.', true],
}

export default function AccountCard() {
  const auth = useAuth()
  const push = usePush(auth.token)
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ name: '', email: '', password: '' })

  const [pushLabel, pushHint, canToggle] = PUSH_COPY[push.state] || PUSH_COPY.idle
  const pushOn = push.state === 'ready'

  const submit = (e) => {
    e.preventDefault()
    if (mode === 'login') auth.login(form.email, form.password)
    else auth.register(form.name, form.email, form.password)
  }

  if (!auth.available) {
    return (
      <Card>
        <CardHead title="Account & alerts" meta="Needs the API" />
        <CardBody>
          <p className="text-data leading-relaxed text-ink-2">
            Sign-in and push notifications need the Phase 2 server. Set{' '}
            <code className="code">VITE_API_URL</code> to enable them — everything else on this
            screen works without it.
          </p>
        </CardBody>
      </Card>
    )
  }

  return (
    <Card>
      <CardHead
        title="Account & alerts"
        meta={auth.signedIn ? auth.user?.email : 'Not signed in'}
      />
      <CardBody className="space-y-4">
        {/* --- push --- */}
        <div className="flex items-center gap-4">
          <span
            className={cn(
              'grid h-11 w-11 flex-none place-items-center rounded-lg',
              pushOn ? 'bg-accent-soft text-accent' : 'bg-sunk text-ink-3',
            )}
          >
            <Icon name="alert" size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-caption font-medium text-ink">Push notifications · {pushLabel}</div>
            <div className="mt-0.5 text-data leading-relaxed text-ink-3">{pushHint}</div>
          </div>
          <Switch
            on={pushOn}
            disabled={!canToggle}
            label="Push notifications"
            onChange={() => (pushOn ? push.unsubscribe() : push.subscribe())}
          />
        </div>

        {push.error && (
          <p role="alert" className="text-data leading-relaxed text-sev-orange">
            {push.error}
          </p>
        )}

        {/* --- auth --- */}
        {auth.signedIn ? (
          <div className="flex items-center justify-between gap-4 border-t border-line-soft pt-4">
            <p className="text-data text-ink-2">
              Signed in as <span className="font-medium text-ink">{auth.user?.email}</span>.
              Saved locations sync to this account.
            </p>
            <button type="button" onClick={auth.logout} className="btn-ghost flex-none">
              Sign out
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-2.5 border-t border-line-soft pt-4">
            {mode === 'register' && (
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Your name"
                autoComplete="name"
                className={inputCls}
              />
            )}
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="Email"
              autoComplete="email"
              className={inputCls}
            />
            <input
              type="password"
              required
              minLength={8}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              className={inputCls}
            />

            {auth.error && (
              <p role="alert" className="text-data leading-relaxed text-sev-orange">
                {auth.error}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button type="submit" disabled={auth.busy} className="btn disabled:opacity-50">
                {auth.busy ? 'Working…' : mode === 'login' ? 'Sign in' : 'Create account'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode(mode === 'login' ? 'register' : 'login')
                  auth.clearError()
                }}
                className="lbl -my-2 inline-flex min-h-[44px] items-center text-accent hover:text-accent-2"
              >
                {mode === 'login' ? 'Create one instead' : 'I have an account'}
              </button>
            </div>
          </form>
        )}
      </CardBody>
    </Card>
  )
}

const inputCls =
  'h-11 w-full rounded-lg border border-line bg-sunk px-3 text-caption text-ink outline-none transition-colors duration-150 placeholder:text-ink-3 focus:border-accent focus:bg-surface'
