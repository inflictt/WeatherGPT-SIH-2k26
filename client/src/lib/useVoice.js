import { useCallback, useEffect, useRef, useState } from 'react'
import { SPEECH_LOCALE } from './i18n'

/**
 * Speech in and speech out, behind one interface.
 *
 * Web Speech is free, instant, and supports `hi-IN` — which also transcribes
 * Hinglish, because a romanised Hindi question is *spoken* Hindi. Phase 5 can
 * put Bhashini behind this same hook for what the browser lacks; nothing above
 * it changes, which is the point of the shape.
 *
 * Two things this hook refuses to do:
 *
 *   * **Pretend.** If the browser has no SpeechRecognition, `supported` is
 *     false and the caller hides the mic rather than offering a button that
 *     fails on tap.
 *   * **Swallow a permission failure.** `error` distinguishes denied,
 *     unsupported and no-speech, because those need three different sentences
 *     from the interface and "something went wrong" helps nobody.
 */

const Recognition =
  typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null

export const speechSupported = Boolean(Recognition)
export const synthesisSupported =
  typeof window !== 'undefined' && 'speechSynthesis' in window

export function useVoice(lang = 'en') {
  const [listening, setListening] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [interim, setInterim] = useState('')
  const [error, setError] = useState(null)

  const recognitionRef = useRef(null)
  const resolveRef = useRef(null)
  const locale = SPEECH_LOCALE[lang] || SPEECH_LOCALE.en

  // Stop everything on unmount. A recogniser left running keeps the mic
  // indicator lit after navigation, which reads as the app spying.
  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.abort()
      } catch {
        /* already stopped */
      }
      if (synthesisSupported) window.speechSynthesis.cancel()
    }
  }, [])

  const stopListening = useCallback(() => {
    try {
      recognitionRef.current?.stop()
    } catch {
      /* not started */
    }
    setListening(false)
  }, [])

  /**
   * Listen once and resolve with the transcript.
   *
   * Resolves with `null` rather than rejecting when nothing was heard — a
   * silent tap is an ordinary outcome, not an exception.
   */
  const listen = useCallback(() => {
    if (!Recognition) {
      setError('unsupported')
      return Promise.resolve(null)
    }

    setError(null)
    setInterim('')

    return new Promise((resolve) => {
      const recognition = new Recognition()
      recognitionRef.current = recognition
      resolveRef.current = resolve

      recognition.lang = locale
      recognition.interimResults = true
      recognition.continuous = false
      recognition.maxAlternatives = 1

      let finalText = ''

      recognition.onresult = (event) => {
        let live = ''
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const result = event.results[i]
          if (result.isFinal) finalText += result[0].transcript
          else live += result[0].transcript
        }
        setInterim(live)
      }

      recognition.onerror = (event) => {
        // 'aborted' is what a deliberate stop() produces; it is not an error
        // the user should ever be told about.
        if (event.error === 'aborted') return
        setError(
          event.error === 'not-allowed' || event.error === 'service-not-allowed'
            ? 'denied'
            : event.error === 'no-speech'
              ? 'no-speech'
              : 'failed',
        )
      }

      recognition.onend = () => {
        setListening(false)
        setInterim('')
        const text = finalText.trim()
        resolveRef.current?.(text || null)
        resolveRef.current = null
      }

      try {
        recognition.start()
        setListening(true)
      } catch {
        // start() throws if called while already running.
        setListening(false)
        resolve(null)
      }
    })
  }, [locale])

  /**
   * Speak. Prefers `answer.speech` over `answer.summary` — for Hinglish those
   * differ, and it matters: the display form is Latin ("barish") but the
   * Devanagari form ("बारिश") is what `hi-IN` pronounces correctly.
   */
  const speak = useCallback(
    (text) => {
      if (!synthesisSupported || !text) return
      window.speechSynthesis.cancel()

      const utterance = new SpeechSynthesisUtterance(String(text))
      utterance.lang = locale
      utterance.rate = 0.98

      // Pick a matching installed voice where one exists; the default voice
      // reads Devanagari as if it were English otherwise.
      const voices = window.speechSynthesis.getVoices() || []
      const match =
        voices.find((v) => v.lang === locale) ||
        voices.find((v) => v.lang?.startsWith(locale.split('-')[0]))
      if (match) utterance.voice = match

      utterance.onstart = () => setSpeaking(true)
      utterance.onend = () => setSpeaking(false)
      utterance.onerror = () => setSpeaking(false)

      window.speechSynthesis.speak(utterance)
    },
    [locale],
  )

  const stopSpeaking = useCallback(() => {
    if (synthesisSupported) window.speechSynthesis.cancel()
    setSpeaking(false)
  }, [])

  return {
    listen,
    stopListening,
    listening,
    interim,
    speak,
    stopSpeaking,
    speaking,
    error,
    clearError: () => setError(null),
    supported: speechSupported,
    canSpeak: synthesisSupported,
    locale,
  }
}

export default useVoice
