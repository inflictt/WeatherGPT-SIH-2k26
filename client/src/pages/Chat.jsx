import { useCallback, useEffect, useRef, useState } from 'react'
import { api, LIVE } from '../lib/api'
import { adaptAnswer } from '../lib/adapters'
import { useActiveWarnings, useData } from '../lib/DataContext'
import { useVoice } from '../lib/useVoice'
import { t } from '../lib/i18n'
import Message, { Thinking } from '../components/chat/Message'
import Composer from '../components/chat/Composer'
import WarningBanner from '../components/warning/WarningBanner'
import { cn } from '../lib/utils'

/**
 * The Ask screen — the real round trip.
 *
 * One `POST /api/chat/query` does the whole pipeline server-side: parse,
 * resolve the location, fetch forecast and warnings in parallel, score risk and
 * confidence, compose. The client's job is to render what comes back and to
 * speak it, nothing more.
 *
 * Without an API configured the screen says so rather than faking a reply. The
 * Phase 1 stub that returned a canned answer is gone: a demo that invents a
 * rainfall figure is precisely the failure this product exists to prevent, and
 * leaving one in the codebase is how it eventually ships.
 */
/**
 * A failed turn is still a turn. It renders in the thread, attached to the
 * question that caused it, rather than as one banner at the bottom — six
 * questions and a single trailing error made five of them look like they had
 * simply been swallowed.
 */
function failure(text) {
  return { id: `e${Date.now()}${Math.random().toString(36).slice(2, 6)}`, role: 'system', text }
}

export default function Chat({ lang, prefs }) {
  const [messages, setMessages] = useState([])
  const [busy, setBusy] = useState(false)
  const [conversationId, setConversationId] = useState(null)

  const endRef = useRef(null)
  const active = useActiveWarnings()
  const { location } = useData()
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

      setMessages((m) => [
        ...m,
        { id: `u${Date.now()}`, role: 'user', lang, text: clean, at: new Date().toISOString() },
      ])

      if (!LIVE) {
        setMessages((m) => [...m, failure(t('noApi', lang))])
        return
      }

      setBusy(true)
      try {
        const res = await api.chat({
          text: clean,
          lang,
          conversationId: conversationId || undefined,
          // Always send the selected place. A question that names no location
          // resolves against this, which is what makes a first turn work.
          ...(location?.lat != null
            ? { lat: location.lat, lon: location.lon, q: location.name }
            : location?.name
              ? { q: location.name }
              : {}),
        })

        if (res.conversationId) setConversationId(res.conversationId)
        const answer = adaptAnswer(res)

        if (!answer.summary && answer.unresolved) {
          setMessages((m) => [
            ...m,
            failure(`${t('noLocation', lang)} (“${answer.unresolved}”)`),
          ])
        } else {
          setMessages((m) => [...m, answer])
          // A spoken question gets a spoken answer. A typed one does not start
          // talking unprompted — that is startling, and often in public.
          if (spoken && voice.canSpeak && prefs?.voiceReplies !== false) {
            voice.speak(answer.speech || answer.summary)
          }
        }
      } catch (err) {
        // "Failed to fetch" means the server is not answering at all, which is
        // a different problem from a request it rejected — and the fix is
        // different too, so the words are.
        const raw = String(err?.message || '')
        const unreachable = /fetch|network|abort/i.test(raw)
        setMessages((m) => [
          ...m,
          failure(unreachable ? t('apiUnreachable', lang) : `${t('failed', lang)} (${raw})`),
        ])
      } finally {
        setBusy(false)
      }
    },
    [busy, lang, conversationId, location, voice, prefs?.voiceReplies],
  )

  return (
    <>
      <WarningBanner warning={active[0]} />

      <div className="shell flex min-h-[calc(100vh-140px)] flex-col">
        <div className="border-b border-line-soft py-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="rounded-md bg-iris/20 border border-iris/40 px-2 py-0.5 font-mono text-[10px] font-bold text-iris uppercase">
                Conversational AI Engine
              </span>
              <span className="rounded-md bg-sev-green/15 border border-sev-green/30 px-2 py-0.5 font-mono text-[10px] font-bold text-sev-green uppercase flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-sev-green" />
                Zero Hallucination Grounded
              </span>
            </div>
            <h1 className="headline text-heading text-ink">
              {t('askTitle', lang)}
            </h1>
            <p className="mt-2 text-body-lg leading-relaxed text-ink-2">
              {t('askBlurb', lang)}
            </p>
          </div>

          {/* Voice Assistant Mode Quick Pill */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => voice?.supported && !voice?.listening && voice.listen().then((text) => text && send(text, { spoken: true }))}
              className={cn(
                'glass-pill px-3.5 py-2 rounded-xl font-mono text-xs font-semibold flex items-center gap-2 transition-all shadow-sm border border-line',
                voice?.listening ? 'border-iris bg-iris/20 text-iris animate-pulse' : 'text-ink hover:bg-raised'
              )}
            >
              <span className="text-base">{voice?.listening ? '🎙️' : '🎤'}</span>
              <span>{voice?.listening ? 'Listening Live…' : 'Tap for Voice Chat'}</span>
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-6 py-6">
          {messages.length === 0 && !busy && (
            <p className="py-10 text-center text-[13.5px] text-ink-3">{t('emptyThread', lang)}</p>
          )}

          {messages.map((m) => (
            <Message
              key={m.id}
              m={m}
              lang={lang}
              onSpeak={voice.canSpeak ? speak : null}
              speaking={voice.speaking}
            />
          ))}

          {busy && <Thinking lang={lang} />}

          <div ref={endRef} />
        </div>

        <Composer lang={lang} onSend={send} busy={busy} voice={voice} />
      </div>
    </>
  )
}
