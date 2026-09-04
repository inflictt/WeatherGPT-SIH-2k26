import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, LIVE } from '../lib/api'
import { adaptAnswer } from '../lib/adapters'
import { mockAnswer } from '../lib/mockAnswer'
import { useActiveWarnings, useData } from '../lib/DataContext'
import { useVoice } from '../lib/useVoice'
import { t } from '../lib/i18n'
import { SEVERITY, RISK_TONE } from '../lib/constants'
import { cn } from '../lib/utils'
import Icon from '../ui/Icon'
import { Shell, PageHead, ConfidenceBars, Segmented } from '../ui/Bits'
import { SeverityTile } from '../ui/Severity'

/**
 * Farmer's Friend.
 *
 * The whole pipeline runs server-side in one `POST /api/chat/query`: parse,
 * resolve the location, fetch forecast and warnings in parallel, score risk and
 * confidence, compose. The client's job is to render what comes back and speak
 * it — nothing more, which is what keeps a model from ever being the thing that
 * produces a rainfall figure.
 *
 * With no backend it composes locally from the bundled sample using a port of
 * the same rules, and labels every such answer "sample data". Substituting a
 * sample for a live answer without saying so would be the exact failure this
 * product exists to prevent.
 */
function turn(text, kind) {
  return { id: `s${Date.now()}${Math.random().toString(36).slice(2, 6)}`, role: 'system', kind, text }
}
const failure = (x) => turn(x, 'failure')
const notice = (x) => turn(x, 'notice')

export default function Ask({ lang, prefs, audience }) {
  const [messages, setMessages] = useState([])
  const [busy, setBusy] = useState(false)
  const [draft, setDraft] = useState('')
  const [conversationId, setConversationId] = useState(null)

  const endRef = useRef(null)
  const active = useActiveWarnings()
  const { location, current, daily } = useData()
  const voice = useVoice(lang)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, busy])

  const speak = useCallback(
    (m) => {
      if (voice.speaking) return voice.stopSpeaking()
      // `speech` differs from `summary` for Hinglish: Latin on screen,
      // Devanagari to the voice, so hi-IN pronounces it correctly.
      voice.speak(m.speech || m.summary)
    },
    [voice],
  )

  const send = useCallback(
    async (text, { spoken = false } = {}) => {
      const clean = String(text || '').trim()
      if (!clean || busy) return
      setDraft('')
      setMessages((m) => [
        ...m,
        { id: `u${Date.now()}`, role: 'user', text: clean, at: new Date().toISOString() },
      ])

      if (!LIVE) {
        setBusy(true)
        setTimeout(() => {
          const answer = mockAnswer(clean, { persona: prefs?.persona })
          setMessages((m) => [...m, answer])
          if (spoken && voice.canSpeak && prefs?.voiceReplies !== false) {
            voice.speak(answer.speech || answer.summary)
          }
          setBusy(false)
        }, 620)
        return
      }

      setBusy(true)
      try {
        // Farmer's Friend rather than plain chat: same grounded pipeline,
        // plus farm context and the `composer` flag that says whether a
        // language model touched the words.
        const res = await api.farmerFriend({
          message: clean,
          lang,
          conversationId: conversationId || undefined,
          ...(location?.lat != null
            ? { lat: location.lat, lon: location.lon }
            : location?.name
              ? { q: location.name }
              : {}),
        })
        if (res.conversationId) setConversationId(res.conversationId)
        const answer = { ...adaptAnswer(res), composer: res.composer, agriculture: res.agriculture }

        if (!answer.summary && answer.unresolved) {
          setMessages((m) => [...m, failure(`${t('noLocation', lang)} (“${answer.unresolved}”)`)])
        } else {
          setMessages((m) => [...m, answer])
          // A spoken question gets a spoken answer. A typed one does not start
          // talking unprompted — that is startling, and often in public.
          if (spoken && voice.canSpeak && prefs?.voiceReplies !== false) {
            voice.speak(answer.speech || answer.summary)
          }
        }
      } catch (err) {
        const raw = String(err?.message || '')
        const unreachable = /fetch|network|abort|No API configured/i.test(raw)
        if (unreachable) {
          // Degrade, never blank. Every other screen falls back to the bundled
          // sample and says so; this one used to answer with an apology.
          const answer = mockAnswer(clean, { persona: prefs?.persona })
          setMessages((m) => [...m, notice(t('apiUnreachableSample', lang)), answer])
          if (spoken && voice.canSpeak && prefs?.voiceReplies !== false) {
            voice.speak(answer.speech || answer.summary)
          }
        } else {
          setMessages((m) => [...m, failure(`${t('failed', lang)} (${raw})`)])
        }
      } finally {
        setBusy(false)
      }
    },
    [busy, lang, conversationId, location, voice, prefs],
  )

  const suggestions =
    audience === 'farm'
      ? [
          'Should I irrigate today?',
          'Kal mere gaon mein barish hogi kya?',
          'Is the spray window open tomorrow?',
          'Meri fasal ke patte peele ho rahe hain',
        ]
      : [
          'Will it rain this evening?',
          'Is there a warning for my district?',
          'Is it safe to travel tomorrow?',
          'Kal ka mausam kaisa rahega?',
        ]

  // What the answer is being resolved against, stated up front. "Answering for
  // Udaipur, farmer, metric" is the difference between an answer you can check
  // and one you have to trust.
  const context = [
    location?.name,
    audience === 'farm' ? 'Farm' : 'General',
    active.length ? `${active.length} active warning${active.length > 1 ? 's' : ''}` : 'No active warning',
    current?.tempC != null ? `${Math.round(current.tempC)} °C now` : null,
  ].filter(Boolean)

  return (
    <Shell className="flex min-h-[calc(100vh-200px)] flex-col pb-8">
      <PageHead eyebrow={`Grounded answers · ${location?.name || ''}`} title={t('askTitle', lang)}>
        {t('askBlurb', lang)}
      </PageHead>

      {/* ------------------------------------------------- answering-for row */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 rounded-lg border border-line bg-surface px-3.5 py-2.5">
        <span className="lbl">Answering for</span>
        {context.map((c) => (
          <span key={c} className="rounded-md bg-sunk px-2 py-1 text-data text-ink-2">
            {c}
          </span>
        ))}
        <Link to="/farm" className="lbl ml-auto text-accent hover:text-accent-2">
          Edit farm →
        </Link>
      </div>

      {/* ------------------------------------------------------------ thread */}
      <div className="flex-1 space-y-5 py-6">
        {messages.length === 0 && !busy && (
          <div className="py-10 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-lg bg-accent-soft text-accent">
              <Icon name="message" size={22} />
            </span>
            <p className="mt-3 text-body-sm text-ink-2">{t('emptyThread', lang)}</p>
            <p className="mx-auto mt-1.5 max-w-measure text-data leading-relaxed text-ink-3">
              Type or speak in English, Hindi or Hinglish. Every answer carries its risk band,
              its confidence and the sources the numbers came from.
            </p>
          </div>
        )}

        {messages.map((m) =>
          m.role === 'user' ? (
            <div key={m.id} className="flex justify-end">
              <div className="max-w-[85%] rounded-xl rounded-br-sm border border-line bg-surface px-4 py-3 sm:max-w-[70%]">
                <p className="text-caption leading-relaxed text-ink">{m.text}</p>
              </div>
            </div>
          ) : m.role === 'system' ? (
            <div key={m.id}>
              <div className="mb-2 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-sev-yellow" aria-hidden="true" />
                <span className="lbl">{m.kind === 'notice' ? 'Note' : 'Could not answer'}</span>
              </div>
              <p
                role="status"
                className="max-w-[92%] rounded-xl rounded-tl-sm border border-line bg-sunk px-4 py-3 text-data leading-relaxed text-ink-2 sm:max-w-[78%]"
              >
                {m.text}
              </p>
            </div>
          ) : (
            <AnswerCard key={m.id} m={m} lang={lang} onSpeak={voice.canSpeak ? speak : null} speaking={voice.speaking} />
          ),
        )}

        {busy && (
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
              <span className="lbl">WeatherGPT</span>
            </div>
            <div className="inline-flex items-center gap-3 rounded-xl rounded-tl-sm border border-line bg-surface px-4 py-3">
              <span className="flex gap-1" aria-hidden="true">
                {[0, 1, 2].map((i) => (
                  <i
                    key={i}
                    className="h-1.5 w-1.5 animate-blink rounded-full bg-ink-3"
                    style={{ animationDelay: `${i * 180}ms` }}
                  />
                ))}
              </span>
              <span className="lbl">Grounding against the fetched data</span>
            </div>
          </div>
        )}

        <div ref={endRef} />
      </div>

      {/* --------------------------------------------------------- composer */}
      <div className="sticky bottom-[70px] space-y-2.5 bg-ground pb-2 pt-2 md:bottom-0">
        <div className="rail-x fade-r gap-2">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => send(s)}
              disabled={busy}
              className="flex-none rounded-lg border border-line bg-surface px-3 py-2 text-data text-ink-2 transition-colors duration-150 hover:border-accent hover:text-ink disabled:opacity-40"
            >
              {s}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            send(draft)
          }}
          className="flex items-center gap-2 rounded-xl border border-line bg-surface p-2 transition-colors duration-150 focus-within:border-accent"
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t('composerHint', lang)}
            aria-label="Ask about the weather"
            className="h-10 min-w-0 flex-1 bg-transparent px-2.5 text-caption text-ink outline-none placeholder:text-ink-3"
          />
          {voice.supported && (
            <button
              type="button"
              onClick={voice.listening ? voice.stopListening : () => voice.listen((text) => send(text, { spoken: true }))}
              aria-label={voice.listening ? 'Stop listening' : 'Ask by voice'}
              className={cn(
                'tap grid h-10 w-10 flex-none place-items-center rounded-lg border transition-colors duration-150',
                voice.listening
                  ? 'animate-pulse-ring border-accent bg-accent text-on-accent'
                  : 'border-line bg-sunk text-ink-2 hover:border-accent hover:text-accent',
              )}
            >
              <Icon name="mic" size={17} />
            </button>
          )}
          <button
            type="submit"
            disabled={busy || !draft.trim()}
            aria-label="Send"
            className="tap grid h-10 w-10 flex-none place-items-center rounded-lg bg-accent text-on-accent transition-opacity duration-150 disabled:opacity-40"
          >
            <Icon name="send" size={17} />
          </button>
        </form>

        <p className="lbl text-center">
          Answers are grounded in fetched data · never generated from the model's own knowledge
        </p>
      </div>
    </Shell>
  )
}

/**
 * One grounded answer, rendered in a fixed order: warning, summary, risk and
 * confidence, actions, sources. The order is the argument — the warning is
 * above the answer, always, and the sources are never optional.
 */
function AnswerCard({ m, lang, onSpeak, speaking }) {
  const sev = m.warning ? SEVERITY[m.warning.colour] || SEVERITY.green : null

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
        <span className="lbl">WeatherGPT</span>
      </div>

      <div className="overflow-hidden rounded-xl rounded-tl-sm border border-line bg-surface shadow-card">
        {/* --- the warning, first --- */}
        {m.warning && (
          <div className={cn('flex items-start gap-3 border-b border-line-soft p-4', sev.wash)}>
            <SeverityTile tone={m.warning.colour} size={36} />
            <div className="min-w-0">
              <div className={cn('lbl', sev.text)}>Official warning · unedited</div>
              <p className="mt-1 text-data leading-relaxed text-ink-2">{m.warning.description}</p>
              {m.warning.instruction && (
                <p className="mt-2 border-t border-line-soft pt-2 text-data leading-relaxed text-ink-2">
                  {m.warning.instruction}
                </p>
              )}
              <div className="lbl mt-2">{m.warning.sender}</div>
            </div>
          </div>
        )}

        {/* --- the answer --- */}
        <div className="p-4 sm:p-5">
          <p className="text-body-sm leading-relaxed text-ink">{m.summary}</p>
          {m.gloss && <p className="mt-2 text-data italic leading-relaxed text-ink-3">{m.gloss}</p>}

          <div className="mt-3.5 flex flex-wrap items-center gap-2">
            {/* The answer contract calls it `riskBand`; the tone is derived
                from it rather than sent, so a band the UI does not know about
                still renders (as green) instead of throwing. */}
            {m.riskBand && (
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-label font-medium uppercase',
                  SEVERITY[RISK_TONE[m.riskBand] || 'green'].wash,
                  SEVERITY[RISK_TONE[m.riskBand] || 'green'].text,
                )}
              >
                Risk {m.riskBand}
                {m.riskScore != null && <span className="tnum opacity-70">{m.riskScore}</span>}
              </span>
            )}
            {m.confidence && (
              <span className="inline-flex items-center gap-2 rounded-md bg-sunk px-2.5 py-1.5">
                <ConfidenceBars level={m.confidence} />
                <span className="text-label font-medium uppercase text-ink-2">{m.confidence}</span>
              </span>
            )}
            {m.flooredBy && (
              <span className="lbl rounded-md border border-dashed border-line px-2.5 py-1.5">
                Safety floor · {m.flooredBy}
              </span>
            )}
          </div>

          {/* --- actions --- */}
          {m.actions?.length > 0 && (
            <ul className="mt-4 space-y-2 border-t border-line-soft pt-3.5">
              {m.actions.map((a, i) => (
                <li key={a} className="flex gap-2.5">
                  <Icon name="check" size={15} className="mt-0.5 flex-none text-accent" />
                  <span className="min-w-0">
                    <span className="block text-data leading-relaxed text-ink">{a}</span>
                    {m.actionsGloss?.[i] && (
                      <span className="block text-data italic text-ink-3">{m.actionsGloss[i]}</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* --- provenance --- */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-line-soft bg-sunk px-4 py-2.5">
          <span className="lbl">Sources</span>
          <span className="text-data text-ink-3">
            {(m.sources || []).join(' · ')}
            {m.composer === 'gemini' ? ' · phrased by Gemini' : ' · phrased locally'}
            {m.demo && ' · sample data'}
          </span>
          {onSpeak && (
            <button
              type="button"
              onClick={() => onSpeak(m)}
              aria-label={speaking ? 'Stop reading' : 'Read aloud'}
              className="tap ml-auto grid h-8 w-8 place-items-center rounded-md text-ink-3 transition-colors duration-150 hover:text-accent"
            >
              <Icon name="volume" size={15} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
