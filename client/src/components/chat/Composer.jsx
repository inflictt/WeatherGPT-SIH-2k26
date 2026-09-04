import { useState } from 'react'
import { cn } from '../../lib/utils'
import { t, SUGGESTIONS } from '../../lib/i18n'
import VoiceButton from './VoiceButton'

/**
 * The input. Types or listens.
 *
 * The mic is only rendered when the browser can actually listen — offering a
 * button that fails on tap is worse than not offering one. When it *is*
 * offered and permission is refused, the failure is named: "blocked, allow it
 * in settings" is actionable, "something went wrong" is not.
 */
export default function Composer({ lang, onSend, busy, voice }) {
  const [value, setValue] = useState('')

  function submit(e) {
    e?.preventDefault()
    const text = value.trim()
    if (!text || busy) return
    setValue('')
    onSend(text, { spoken: false })
  }

  /** Listen once, then send what was heard. */
  async function toggleVoice() {
    if (!voice?.supported) return
    if (voice.listening) return voice.stopListening()

    voice.clearError?.()
    const heard = await voice.listen()
    if (heard) {
      setValue('')
      onSend(heard, { spoken: true })
    }
  }

  const micError =
    voice?.error === 'denied'
      ? t('micDenied', lang)
      : voice?.error === 'unsupported'
        ? t('micUnsupported', lang)
        : voice?.error === 'no-speech'
          ? t('micNoSpeech', lang)
          : null

  return (
    <div className="sticky bottom-0 z-20 border-t border-line bg-ground/90 pb-4 pt-3 backdrop-blur-xl md:pb-3">
      <div className="rail-x mb-3">
        {SUGGESTIONS.map((s) => {
          const text = s[lang] || s.en
          return (
            <button
              key={s.en}
              type="button"
              disabled={busy}
              onClick={() => onSend(text, { spoken: false })}
              className="flex-none rounded-md border border-line px-3 py-1.5 text-[12px] text-ink-3 transition-colors duration-250 ease-out hover:border-ink-3 hover:text-ink disabled:opacity-40"
            >
              {text}
            </button>
          )
        })}
      </div>

      {micError && (
        <p role="alert" className="mb-2 text-[12px] leading-relaxed text-sev-orange">
          {micError}
        </p>
      )}

      <form onSubmit={submit} className="flex items-center gap-2.5">
        <div
          className={cn(
            'flex h-12 flex-1 items-center rounded-lg border bg-void px-4 pl-5',
            'transition-all duration-200 focus-within:border-white/30',
            voice?.listening ? 'border-iris ring-1 ring-iris/40' : 'border-white/10',
          )}
        >
          <input
            value={voice?.listening && voice.interim ? voice.interim : value}
            onChange={(e) => setValue(e.target.value)}
            readOnly={voice?.listening}
            placeholder={
              voice?.listening ? t('listening', lang) : t('placeholder', lang) || 'Ask anything about the weather…'
            }
            aria-label={t('placeholder', lang)}
            className="h-full w-full bg-transparent font-sans text-[15px] text-cloud placeholder:text-ash focus:outline-none"
          />
          {value && !voice?.listening && (
            <button
              type="submit"
              disabled={busy}
              aria-label={t('send', lang)}
              className="ml-2 flex h-8 w-8 flex-none items-center justify-center rounded-full bg-white/20 text-pure transition-colors hover:bg-white/30 disabled:opacity-40"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14m-6-6 6 6-6 6" />
              </svg>
            </button>
          )}
        </div>

        {voice?.supported && (
          <VoiceButton listening={voice.listening} onToggle={toggleVoice} />
        )}
      </form>

      <p className="mt-2.5 text-center font-mono text-[9.5px] uppercase tracking-[0.12em] text-ink-3">
        {t('grounding', lang)}
      </p>
    </div>
  )
}
