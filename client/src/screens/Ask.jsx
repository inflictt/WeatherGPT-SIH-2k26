import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, LIVE } from '../lib/api'
import { adaptAnswer } from '../lib/adapters'
import { mockAnswer } from '../lib/mockAnswer'
import { useActiveWarnings, useData } from '../lib/DataContext'
import { useFarm } from '../lib/useFarm'
import { evaluateFarmIntelligence } from '../lib/farmIntelligence'
import { useVoice } from '../lib/useVoice'
import { t } from '../lib/i18n'
import { SEVERITY, RISK_TONE } from '../lib/constants'
import { cn } from '../lib/utils'
import Icon from '../ui/Icon'
import { Shell, PageHead, ConfidenceBars } from '../ui/Bits'
import { SeverityTile } from '../ui/Severity'
import VoiceAssistantBar from '../weather/VoiceAssistantBar'

function turn(text, kind) {
  return { id: `s${Date.now()}${Math.random().toString(36).slice(2, 6)}`, role: 'system', kind, text }
}
const failure = (x) => turn(x, 'failure')
const notice = (x) => turn(x, 'notice')

const CHAT_STORAGE_KEY = 'wg_chat_messages_v1'

export default function Ask({ lang = 'en', prefs, audience }) {
  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem(CHAT_STORAGE_KEY)
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })
  const [busy, setBusy] = useState(false)
  const [draft, setDraft] = useState('')
  const [conversationId, setConversationId] = useState(() => {
    try {
      return localStorage.getItem('wg_chat_conv_id') || null
    } catch {
      return null
    }
  })

  const [speakingMessageId, setSpeakingMessageId] = useState(null)
  const endRef = useRef(null)
  const active = useActiveWarnings()
  const { location, current, daily, summary24h, hourly } = useData()
  const { farm } = useFarm()
  const voice = useVoice(lang)

  const intelligence = useMemo(() => {
    return evaluateFarmIntelligence({
      farm,
      current,
      daily,
      summary24h,
      hourly,
      warnings: active,
      lang,
    })
  }, [farm, current, daily, summary24h, hourly, active, lang])

  // Persist messages whenever they change
  useEffect(() => {
    try {
      if (messages.length > 0) {
        localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages.slice(-40)))
      }
    } catch {}
  }, [messages])

  useEffect(() => {
    try {
      if (conversationId) localStorage.setItem('wg_chat_conv_id', conversationId)
    } catch {}
  }, [conversationId])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, busy])

  const speak = useCallback(
    (m) => {
      if (voice.isSpeaking && speakingMessageId === m.id) {
        voice.stopSpeaking()
        setSpeakingMessageId(null)
        return
      }
      setSpeakingMessageId(m.id)
      voice.speak(m.speech || m.summary, {
        onEnd: () => setSpeakingMessageId(null),
      })
    },
    [voice, speakingMessageId],
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
          const answer = mockAnswer(clean, {
            persona: prefs?.persona,
            location,
            warnings: active,
            farm,
            intelligence,
          })
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
        const res = await api.farmerFriend({
          message: clean,
          lang,
          audience: audience === 'farm' ? 'farm' : 'general',
          conversationId: conversationId || undefined,
          farmId: farm?.id || undefined,
          ...(location?.lat != null
            ? {
                lat: location.lat,
                lon: location.lon,
                ...(location.name ? { name: location.name } : {}),
                ...(location.district ? { district: location.district } : {}),
                ...(location.state ? { state: location.state } : {}),
              }
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
          if (spoken && voice.canSpeak && prefs?.voiceReplies !== false) {
            voice.speak(answer.speech || answer.summary)
          }
        }
      } catch (err) {
        const raw = String(err?.message || '')
        const unreachable = /fetch|network|abort|No API configured/i.test(raw)
        if (unreachable) {
          const answer = mockAnswer(clean, { persona: prefs?.persona, location, warnings: active })
          setMessages((m) => [...m, notice(t('apiUnreachableSample', lang)), answer])
          if (spoken && voice.canSpeak && prefs?.voiceReplies !== false) {
            voice.speak(answer.speech || answer.summary)
          }
        } else if (err?.status === 429) {
          setMessages((m) => [
            ...m,
            failure(lang === 'hi' ? 'बहुत सारे अनुरोध प्राप्त हुए। कृपया कुछ क्षण बाद पुनः प्रयास करें।' : 'Too many requests. Please wait a moment and try again.'),
          ])
        } else {
          const friendly = /invalid request/i.test(raw)
            ? (lang === 'hi' ? 'कृपया अपना प्रश्न जांचें और पुनः प्रयास करें।' : 'Please verify your question and try again.')
            : raw
          setMessages((m) => [...m, failure(`${t('failed', lang)} (${friendly})`)])
        }
      } finally {
        setBusy(false)
      }
    },
    [busy, lang, conversationId, location, voice, prefs],
  )

  // Auto-send query if navigated from Planner or Crop Doctor
  useEffect(() => {
    try {
      const prefill = sessionStorage.getItem('kv_prefill_query')
      if (prefill) {
        sessionStorage.removeItem('kv_prefill_query')
        send(prefill)
      }
    } catch {}
  }, [send])

  const clearChat = () => {
    setMessages([])
    setConversationId(null)
    try {
      localStorage.removeItem(CHAT_STORAGE_KEY)
      localStorage.removeItem('wg_chat_conv_id')
    } catch {}
  }

  const suggestions =
    audience === 'farm'
      ? lang === 'hi'
        ? [
            'क्या आज सिंचाई करूँ?',
            'कल मेरे गाँव में बारिश होगी क्या?',
            'दवा छिड़कने का सही समय क्या है?',
            'मेरी फसल के पत्ते पीले हो रहे हैं',
          ]
        : lang === 'hinglish'
          ? [
              'Aaj sinchai karni chahiye kya?',
              'Kal mere gaon mein barish hogi kya?',
              'Spray window kab tak open hai?',
              'Meri fasal ke patte peele ho rahe hain',
            ]
          : [
              'Should I irrigate today?',
              'Will it rain in my village tomorrow?',
              'Is the spray window open tomorrow?',
              'My crop leaves are turning yellow',
            ]
      : lang === 'hi'
        ? [
            'आज शाम बारिश होगी?',
            'क्या मेरे ज़िले में मौसम चेतावनी है?',
            'क्या कल यात्रा करना सुरक्षित है?',
            'कल का तापमान कैसा रहेगा?',
          ]
        : lang === 'hinglish'
          ? [
              'Aaj shaam barish hogi kya?',
              'Mere zile mein warning hai kya?',
              'Kal travel karna safe hai kya?',
              'Kal ka mausam kaisa rahega?',
            ]
          : [
              'Will it rain this evening?',
              'Is there a warning for my district?',
              'Is it safe to travel tomorrow?',
              'What is the temperature outlook?',
            ]

  const context = [
    location?.name,
    audience === 'farm' ? (lang === 'hi' ? 'कृषि मोड' : 'Farm') : (lang === 'hi' ? 'सामान्य मोड' : 'General'),
    active.length ? `${active.length} ${t('tabActiveAlerts', lang)}` : (lang === 'hi' ? 'कोई चेतावनी नहीं' : 'No active warning'),
    current?.tempC != null ? `${Math.round(current.tempC)} °C` : null,
  ].filter(Boolean)

  const isFarm = audience === 'farm'
  const title = isFarm ? t('askTitleFarmer', lang) : t('askTitleGeneral', lang)
  const blurb = isFarm ? t('askBlurbFarmer', lang) : t('askBlurbGeneral', lang)

  return (
    <Shell className="flex min-h-[calc(100vh-200px)] flex-col pb-8">
      <PageHead eyebrow={`Aakrishi AI · ${location?.name || ''}`} title={title}>
        {blurb}
      </PageHead>

      {/* ------------------------------------------------- answering-for row */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 rounded-lg border border-line bg-surface px-3.5 py-2.5">
        <span className="lbl">{t('answeringFor', lang)}</span>
        {context.map((c) => (
          <span key={c} className="rounded-md bg-sunk px-2 py-1 text-data text-ink-2">
            {c}
          </span>
        ))}
        <div className="ml-auto flex items-center gap-3">
          {messages.length > 0 && (
            <button
              type="button"
              onClick={clearChat}
              className="lbl text-ink-3 hover:text-sev-red transition-colors"
            >
              {lang === 'hi' ? 'चैट साफ़ करें' : 'Clear Chat'}
            </button>
          )}
          {isFarm && (
            <Link to="/farm" className="lbl text-accent hover:text-accent-2">
              {t('editFarm', lang)}
            </Link>
          )}
        </div>
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
              Type or speak in English, Hindi (हिन्दी) or Hinglish. Every answer is grounded in numerical forecast data.
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
            <AnswerCard
              key={m.id}
              m={m}
              lang={lang}
              audience={audience}
              onSpeak={voice.canSpeak ? speak : null}
              speaking={voice.isSpeaking && speakingMessageId === m.id}
            />
          ),
        )}

        {busy && (
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
              <span className="lbl">{isFarm ? 'Krishivaani' : 'Akashvaani'}</span>
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
              <span className="lbl">{t('thinking', lang)}</span>
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

        <VoiceAssistantBar
          voice={voice}
          lang={lang}
          onSend={(text) => send(text, { spoken: true })}
          disabled={busy}
          className="mb-1"
        />

        <form
          onSubmit={(e) => {
            e.preventDefault()
            send(draft)
          }}
          className="flex items-center gap-2 rounded-xl border border-line bg-surface p-2 transition-colors duration-150 focus-within:border-accent"
        >
          <input
            value={
              voice.isListening || voice.voiceState === 'transcribing'
                ? (voice.interim || draft)
                : draft
            }
            onChange={(e) => setDraft(e.target.value)}
            placeholder={
              voice.isListening
                ? (lang === 'hi' ? 'बोलिए, सुन रहे हैं…' : lang === 'hinglish' ? 'Boliye, sun rahe hain…' : 'Listening… speak now')
                : voice.voiceState === 'transcribing'
                  ? (lang === 'hi' ? 'पहचान रहे हैं…' : lang === 'hinglish' ? 'Voice samajh rahe hain…' : 'Understanding…')
                  : t('composerHint', lang)
            }
            aria-label="Ask about weather or farm"
            className={cn(
              'h-10 min-w-0 flex-1 bg-transparent px-2.5 text-caption outline-none placeholder:text-ink-3',
              voice.isListening ? 'text-accent font-semibold italic' : 'text-ink',
            )}
          />

          {voice.supported && (
            <button
              type="button"
              onClick={() => {
                if (voice.isSpeaking) {
                  voice.stopSpeaking()
                } else if (voice.isListening) {
                  voice.stopListening()
                } else {
                  if (voice.hasError) voice.clearError()
                  voice.listen((spokenText) => {
                    if (spokenText && spokenText.trim()) {
                      setDraft(spokenText.trim())
                      send(spokenText.trim(), { spoken: true })
                    }
                  })
                }
              }}
              aria-label={voice.isListening ? 'Stop listening' : voice.isSpeaking ? 'Stop speaking' : 'Ask by voice'}
              className={cn(
                'relative tap grid h-10 w-10 flex-none place-items-center rounded-xl border transition-all duration-200',
                voice.isListening
                  ? 'border-accent bg-accent text-on-accent shadow-md ring-4 ring-accent/25'
                  : voice.isSpeaking
                    ? 'border-sev-green bg-sev-green text-on-sev shadow-sm'
                    : 'border-line bg-sunk text-ink-2 hover:border-accent hover:text-accent',
              )}
            >
              {voice.isListening && (
                <span className="absolute -inset-1 rounded-xl bg-accent opacity-30 animate-ping" />
              )}
              <Icon name={voice.isSpeaking ? 'speaker' : 'mic'} size={18} />
            </button>
          )}

          <button
            type="submit"
            disabled={busy || !draft.trim()}
            aria-label={t('send', lang)}
            className="tap grid h-10 w-10 flex-none place-items-center rounded-xl bg-accent text-on-accent transition-opacity duration-150 disabled:opacity-40"
          >
            <Icon name="send" size={17} />
          </button>
        </form>

        <p className="lbl text-center">
          {t('grounding', lang)}
        </p>
      </div>
    </Shell>
  )
}

function AnswerCard({ m, lang, audience, onSpeak, speaking }) {
  const sev = m.warning ? SEVERITY[m.warning.colour] || SEVERITY.green : null
  const isWarningQuery = m.intent === 'warning_check' || (m.warning && /active.*warning/i.test(m.summary || ''))
  const isSevereAlert = m.warning && String(m.warning.colour).toLowerCase() === 'red'
  const showOfficialBlock = m.warning && (isWarningQuery || isSevereAlert)
  const assistantName = audience === 'farm'
    ? (lang === 'hi' ? 'कृषिवाणी' : 'Krishivaani')
    : (lang === 'hi' ? 'आकाशवाणी' : 'Akashvaani')

  const hasBadges = Boolean(m.riskBand || m.confidence || (m.warning && !showOfficialBlock))

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
          <span className="lbl">{assistantName}</span>
        </div>
        {m.composer && (
          <span className="rounded bg-sunk px-2 py-0.5 text-[10px] font-mono font-medium uppercase tracking-wider text-ink-3">
            {m.composer === 'gemini' ? '✦ AI Grounded' : 'Engine Verified'}
          </span>
        )}
      </div>

      <div className="overflow-hidden rounded-xl rounded-tl-sm border border-line bg-surface shadow-card">
        {/* --- only show official warning banner when query is warning-related or severe disaster alert --- */}
        {showOfficialBlock && (
          <div className={cn('flex items-start gap-3 border-b border-line-soft p-3.5', sev.wash)}>
            <SeverityTile tone={m.warning.colour} size={28} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <div className={cn('lbl font-semibold', sev.text)}>{t('officialTextUnedited', lang)}</div>
                <span className="lbl text-[10px] text-ink-3">{m.warning.sender}</span>
              </div>
              <p className="mt-1 text-data leading-relaxed text-ink-2">{m.warning.description}</p>
              {m.warning.instruction && (
                <p className="mt-1.5 border-t border-line-soft/50 pt-1.5 text-data font-medium leading-relaxed text-ink-2">
                  {m.warning.instruction}
                </p>
              )}
            </div>
          </div>
        )}

        {/* --- answer --- */}
        <div className="p-4 sm:p-5">
          <p className="text-body-sm leading-relaxed text-ink whitespace-pre-line">{m.summary}</p>
          {m.gloss && <p className="mt-2 text-data italic leading-relaxed text-ink-3">{m.gloss}</p>}

          {hasBadges && (
            <div className="mt-3.5 flex flex-wrap items-center gap-2">
              {m.riskBand && (
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-label font-medium uppercase',
                    SEVERITY[RISK_TONE[m.riskBand] || 'green'].wash,
                    SEVERITY[RISK_TONE[m.riskBand] || 'green'].text,
                  )}
                >
                  {t('tileRisk', lang)} {m.riskBand}
                  {m.riskScore != null && <span className="tnum opacity-70">{m.riskScore}</span>}
                </span>
              )}
              {m.confidence && (
                <span className="inline-flex items-center gap-2 rounded-md bg-sunk px-2.5 py-1.5">
                  <ConfidenceBars level={m.confidence} />
                  <span className="text-label font-medium uppercase text-ink-2">{m.confidence}</span>
                </span>
              )}
              {m.warning && !showOfficialBlock && (
                <span className={cn('rounded-md px-2 py-1 text-[11px] font-medium', sev.wash, sev.text)}>
                  Advisory: {m.warning.colour}
                </span>
              )}
            </div>
          )}

          {/* --- actions --- */}
          {m.actions?.length > 0 && (
            <ul className="mt-4 space-y-2 border-t border-line-soft pt-3.5">
              {m.actions.map((a, i) => (
                <li key={a + i} className="flex gap-2.5">
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

        {/* --- provenance & audio listen --- */}
        {(m.sources?.length > 0 || onSpeak) && (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-line-soft bg-sunk px-4 py-2.5">
            {m.sources?.length > 0 && (
              <>
                <span className="lbl">{t('sources', lang)}</span>
                <span className="text-data text-ink-3">
                  {m.sources.join(' · ')}
                </span>
              </>
            )}
            {onSpeak && (
              <button
                type="button"
                onClick={() => onSpeak(m)}
                aria-label={speaking ? t('stopSpeaking', lang) : t('speak', lang)}
                className={cn(
                  'tap ml-auto flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors duration-150',
                  speaking
                    ? 'bg-accent text-on-accent animate-pulse shadow-xs'
                    : 'bg-surface border border-line text-ink-2 hover:border-accent hover:text-accent shadow-xs'
                )}
              >
                <Icon name={speaking ? 'speaker' : 'volume'} size={14} />
                <span>{speaking ? (lang === 'hi' ? 'रोकें' : 'Stop') : (lang === 'hi' ? 'सुनें' : 'Listen')}</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
