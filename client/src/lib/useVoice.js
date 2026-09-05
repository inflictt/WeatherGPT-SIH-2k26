import { useCallback, useEffect, useRef, useState } from 'react'
import { api, LIVE } from './api'

/**
 * Aakrishi Production Voice Engine — Robust Real-Audio Capture & Transcription.
 *
 * Solves the Web Speech API "network" failure in Chrome/Chromium desktop/Brave:
 * 1. User gesture directly opens navigator.mediaDevices.getUserMedia() to satisfy browser security.
 * 2. MediaRecorder records actual audio chunks while Web Audio API (AnalyserNode) measures REAL RMS volume.
 * 3. In parallel, window.SpeechRecognition runs for optional real-time live preview if supported;
 *    if SpeechRecognition emits "network", it is safely silenced because real audio is already capturing!
 * 4. Automatic Silence Detection: Evaluates real audio energy. 2.0s of silence after speech automatically finalizes.
 * 5. Audio blob is sent to /api/ai/voice/transcribe (Gemini multimodal STT) and transcribes in <1 second.
 * 6. The transcript is fed directly into the existing Farmer's Friend chat pipeline.
 */

const Recognition =
  typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null

export const speechSupported =
  typeof window !== 'undefined' &&
  (Boolean(navigator?.mediaDevices?.getUserMedia) || Boolean(Recognition))

export const synthesisSupported = typeof window !== 'undefined' && 'speechSynthesis' in window

export const SPEECH_LOCALES = {
  en: ['en-IN', 'en-US'],
  hi: ['hi-IN'],
  hinglish: ['hi-IN', 'en-IN'],
}

export const VOICE_ERRORS = {
  mic_permission_denied: {
    en: 'Microphone access is blocked. Please allow microphone in browser settings.',
    hi: 'माइक्रोफ़ोन एक्सेस ब्लॉक है। कृपया ब्राउज़र सेटिंग्स में अनुमति दें।',
    hinglish: 'Microphone access blocked hai. Please browser settings mein allow karein.',
  },
  microphone_unavailable: {
    en: 'Microphone is unavailable or in use by another app.',
    hi: 'माइक्रोफ़ोन उपलब्ध नहीं है या किसी अन्य ऐप में उपयोग में है।',
    hinglish: 'Microphone available nahi hai ya busy hai.',
  },
  browser_unsupported: {
    en: "Voice input is not supported in this browser. You can type your query.",
    hi: 'इस ब्राउज़र में वाक् इनपुट समर्थित नहीं है। आप लिखकर पूछ सकते हैं।',
    hinglish: 'Is browser mein voice input support nahi karta. Aap type karke puch sakte hain.',
  },
  no_speech_detected: {
    en: "I couldn't hear anything. Tap the mic and speak clearly.",
    hi: 'कोई आवाज़ सुनाई नहीं दी। माइक दबाकर दोबारा बोलें।',
    hinglish: 'Kuch sunai nahi diya. Mic dabakar dobara boliye.',
  },
  network_error: {
    en: 'Could not transcribe voice. Please try again or type your question.',
    hi: 'आवाज़ पहचानी नहीं जा सकी। कृपया पुनः प्रयास करें या लिखकर पूछें।',
    hinglish: 'Aawaz pehchan nahi paye. Please dobara try karein ya type karein.',
  },
  recognition_timeout: {
    en: 'Voice listening timed out. Tap the mic to try again.',
    hi: 'सुनने का समय समाप्त हुआ। दोबारा पूछने के लिए माइक दबाएं।',
    hinglish: 'Voice listening time out ho gayi. Dobara puchne ke liye mic dabayein.',
  },
  speech_recognition_error: {
    en: 'Voice input stopped. Please try again.',
    hi: 'वाक् पहचान रुक गई। कृपया दोबारा प्रयास करें।',
    hinglish: 'Voice input ruk gaya. Dobara try karein.',
  },
  tts_error: {
    en: 'Voice playback encountered an issue.',
    hi: 'उत्तर सुनाने में समस्या आई।',
    hinglish: 'Voice playback mein error aaya.',
  },
}

export function useVoice(lang = 'en') {
  const [voiceState, setVoiceState] = useState('idle') // 'idle' | 'initializing' | 'listening' | 'transcribing' | 'speaking' | 'error'
  const [interim, setInterim] = useState('')
  const [finalTranscript, setFinalTranscript] = useState('')
  const [errorKey, setErrorKey] = useState(null)
  const [audioLevel, setAudioLevel] = useState(0) // 0.0 to 1.0 real RMS
  const [recordSeconds, setRecordSeconds] = useState(0)

  const recognitionRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const mediaStreamRef = useRef(null)
  const audioContextRef = useRef(null)
  const animFrameRef = useRef(null)
  const recordedChunksRef = useRef([])
  const sessionIdRef = useRef(0)
  const silenceTimerRef = useRef(null)
  const watchdogTimerRef = useRef(null)
  const recordIntervalRef = useRef(null)
  const onTranscriptReadyRef = useRef(null)
  const speechDetectedRef = useRef(false)
  const finalTranscriptRef = useRef('')

  const locales = SPEECH_LOCALES[lang] || SPEECH_LOCALES.en
  const primaryLocale = locales[0]

  // Cleanup on unmount or navigation
  useEffect(() => {
    return () => {
      sessionIdRef.current += 1
      clearTimeout(silenceTimerRef.current)
      clearTimeout(watchdogTimerRef.current)
      clearInterval(recordIntervalRef.current)
      cancelAnimationFrame(animFrameRef.current)

      try {
        recognitionRef.current?.abort()
        recognitionRef.current = null
      } catch {}

      try {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop()
        }
      } catch {}

      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop())
        mediaStreamRef.current = null
      }

      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        try {
          audioContextRef.current.close()
        } catch {}
      }

      if (synthesisSupported) {
        window.speechSynthesis?.cancel()
      }
    }
  }, [])

  // Safely stop TTS playback
  const stopSpeaking = useCallback(() => {
    if (synthesisSupported) {
      window.speechSynthesis?.cancel()
    }
    setVoiceState((s) => (s === 'speaking' ? 'idle' : s))
  }, [])

  // Safely stop active listening / recording
  const stopListening = useCallback(() => {
    clearTimeout(silenceTimerRef.current)
    clearTimeout(watchdogTimerRef.current)
    clearInterval(recordIntervalRef.current)
    cancelAnimationFrame(animFrameRef.current)

    try {
      recognitionRef.current?.stop()
    } catch {}

    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
        return // Let onstop handle the final transcript and state transition
      }
    } catch {}

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop())
      mediaStreamRef.current = null
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close()
      } catch {}
    }

    setAudioLevel(0)
    setVoiceState((s) => (s === 'listening' || s === 'initializing' ? 'idle' : s))
  }, [])

  // Completely cancel listening, discarding recording and any callbacks
  const cancelListening = useCallback(() => {
    sessionIdRef.current += 1
    clearTimeout(silenceTimerRef.current)
    clearTimeout(watchdogTimerRef.current)
    clearInterval(recordIntervalRef.current)
    cancelAnimationFrame(animFrameRef.current)

    try {
      recognitionRef.current?.abort()
      recognitionRef.current = null
    } catch {}

    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }
    } catch {}

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop())
      mediaStreamRef.current = null
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close()
      } catch {}
    }

    setAudioLevel(0)
    setInterim('')
    setVoiceState('idle')
  }, [])

  /**
   * Start real audio capture directly on user gesture
   */
  const listen = useCallback(
    async (onComplete) => {
      stopSpeaking()

      sessionIdRef.current += 1
      const currentSessionId = sessionIdRef.current

      setErrorKey(null)
      setInterim('')
      setFinalTranscript('')
      finalTranscriptRef.current = ''
      setAudioLevel(0)
      setRecordSeconds(0)
      speechDetectedRef.current = false
      onTranscriptReadyRef.current = onComplete

      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        setErrorKey('browser_unsupported')
        setVoiceState('error')
        return
      }

      setVoiceState('initializing')

      let stream = null
      try {
        // Request microphone directly inside user gesture
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        })
      } catch (err) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setErrorKey('mic_permission_denied')
        } else {
          setErrorKey('microphone_unavailable')
        }
        setVoiceState('error')
        return
      }

      if (currentSessionId !== sessionIdRef.current) {
        stream.getTracks().forEach((t) => t.stop())
        return
      }

      mediaStreamRef.current = stream

      // Connect Web Audio API Analyser for real microphone volume
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext
        if (AudioCtx) {
          const audioCtx = new AudioCtx()
          audioContextRef.current = audioCtx
          const source = audioCtx.createMediaStreamSource(stream)
          const analyser = audioCtx.createAnalyser()
          analyser.fftSize = 64
          analyser.smoothingTimeConstant = 0.5
          source.connect(analyser)

          const dataArray = new Uint8Array(analyser.frequencyBinCount)

          const checkVolume = () => {
            if (currentSessionId !== sessionIdRef.current || !mediaStreamRef.current || audioCtx.state === 'closed') {
              setAudioLevel(0)
              return
            }
            analyser.getByteFrequencyData(dataArray)
            let sum = 0
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i]
            }
            const avg = sum / dataArray.length
            const level = Math.min(1, Math.max(0, (avg - 8) / 100))
            setAudioLevel(level)

            // Detect speech presence with sensitive threshold
            if (level > 0.035) {
              speechDetectedRef.current = true
              if (silenceTimerRef.current) {
                clearTimeout(silenceTimerRef.current)
                silenceTimerRef.current = null
              }
            } else if (speechDetectedRef.current) {
              // Once speech has occurred, 2.2s of silence stops recording and finalizes
              if (!silenceTimerRef.current) {
                silenceTimerRef.current = setTimeout(() => {
                  if (currentSessionId === sessionIdRef.current && mediaRecorderRef.current?.state === 'recording') {
                    mediaRecorderRef.current.stop()
                  }
                }, 2200)
              }
            }

            animFrameRef.current = requestAnimationFrame(checkVolume)
          }
          checkVolume()
        }
      } catch (err) {
        console.warn('[Voice] AudioContext analyser init warning:', err)
      }

      // Select supported audio mime type
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : MediaRecorder.isTypeSupported('audio/mp4')
            ? 'audio/mp4'
            : 'audio/wav'

      recordedChunksRef.current = []
      let mediaRecorder
      try {
        mediaRecorder = new MediaRecorder(stream, { mimeType })
        mediaRecorderRef.current = mediaRecorder
      } catch (err) {
        console.error('[Voice] MediaRecorder init failed:', err)
        setErrorKey('speech_recognition_error')
        setVoiceState('error')
        stream.getTracks().forEach((t) => t.stop())
        return
      }

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data)
        }
      }

      mediaRecorder.onstart = () => {
        if (currentSessionId !== sessionIdRef.current) return
        setVoiceState('listening')
        setRecordSeconds(0)

        clearInterval(recordIntervalRef.current)
        recordIntervalRef.current = setInterval(() => {
          setRecordSeconds((s) => s + 1)
        }, 1000)

        // 15-second safety watchdog timeout
        clearTimeout(watchdogTimerRef.current)
        watchdogTimerRef.current = setTimeout(() => {
          if (mediaRecorder.state === 'recording') {
            mediaRecorder.stop()
          }
        }, 15000)
      }

      mediaRecorder.onstop = async () => {
        clearInterval(recordIntervalRef.current)
        cancelAnimationFrame(animFrameRef.current)
        clearTimeout(silenceTimerRef.current)
        silenceTimerRef.current = null
        setAudioLevel(0)

        // Stop stream tracks
        stream.getTracks().forEach((t) => t.stop())
        mediaStreamRef.current = null

        if (currentSessionId !== sessionIdRef.current) return

        const blob = new Blob(recordedChunksRef.current, { type: mimeType })
        // If recording is too tiny (< 1000 bytes) or 0 bytes
        if (blob.size < 1000) {
          setVoiceState('idle')
          setErrorKey('no_speech_detected')
          return
        }

        // Do NOT overwrite interim with static strings.
        // interim/finalTranscript should always reflect actual speech.
        setVoiceState('transcribing')

        try {
          const reader = new FileReader()
          reader.readAsDataURL(blob)
          reader.onloadend = async () => {
            const audioBase64 = reader.result?.split(',')[1]
            if (!audioBase64) {
              if (finalTranscriptRef.current) {
                setVoiceState('idle')
                onTranscriptReadyRef.current?.(finalTranscriptRef.current)
                return
              }
              setVoiceState('idle')
              setErrorKey('network_error')
              return
            }

            const cleanMime = (blob.type || mimeType || 'audio/webm').split(';')[0]
            try {
              const res = await api.transcribeVoice({ audioBase64, mimeType: cleanMime, lang })
              if (currentSessionId !== sessionIdRef.current) return

              const text = res?.transcript?.trim()
              if (text && !/^\[Audio/i.test(text) && !/^SILENCE/i.test(text)) {
                setFinalTranscript(text)
                finalTranscriptRef.current = text
                setInterim(text)
                setVoiceState('idle')
                onTranscriptReadyRef.current?.(text)
              } else if (finalTranscriptRef.current) {
                // Speech recognition captured words in parallel
                setVoiceState('idle')
                onTranscriptReadyRef.current?.(finalTranscriptRef.current)
              } else {
                setVoiceState('idle')
                setErrorKey('no_speech_detected')
              }
            } catch (err) {
              console.warn('[Voice] Transcription API error:', err)
              if (currentSessionId !== sessionIdRef.current) return
              if (finalTranscriptRef.current) {
                // Preserve recognized transcript and send
                setVoiceState('idle')
                onTranscriptReadyRef.current?.(finalTranscriptRef.current)
              } else {
                setVoiceState('error')
                setErrorKey('network_error')
              }
            }
          }
        } catch (err) {
          console.error('[Voice] Blob reader error:', err)
          if (finalTranscriptRef.current) {
            setVoiceState('idle')
            onTranscriptReadyRef.current?.(finalTranscriptRef.current)
          } else {
            setVoiceState('idle')
            setErrorKey('network_error')
          }
        }
      }

      // Optional Parallel Web Speech Recognition for live real-time words stream
      if (Recognition) {
        try {
          if (recognitionRef.current) {
            try {
              recognitionRef.current.abort()
            } catch {}
          }
          const recognition = new Recognition()
          recognitionRef.current = recognition
          recognition.lang = primaryLocale
          recognition.interimResults = true
          recognition.continuous = true

          recognition.onresult = (event) => {
            if (currentSessionId !== sessionIdRef.current) return
            speechDetectedRef.current = true
            let liveText = ''
            for (let i = 0; i < event.results.length; i++) {
              liveText += event.results[i][0]?.transcript || ''
            }
            const trimmed = liveText.trim()
            if (trimmed) {
              setInterim(trimmed)
              setFinalTranscript(trimmed)
              finalTranscriptRef.current = trimmed
            }
          }

          recognition.onerror = () => {
            // Silently ignore browser Web Speech errors (such as network) because
            // real audio capture via MediaRecorder is already active and recording!
          }

          recognition.start()
        } catch {}
      }

      mediaRecorder.start(250)
    },
    [lang, primaryLocale, stopSpeaking]
  )

  /**
   * Speak a text response using high-quality SpeechSynthesis
   */
  const speak = useCallback(
    (text, { onEnd } = {}) => {
      if (!synthesisSupported || !text) return
      window.speechSynthesis?.cancel()

      const cleanedText = String(text)
        .replace(/[*_#`]/g, '')
        .replace(/\(http[s]?:\/\/[^\)]+\)/g, '')
        .replace(/Open-Meteo|NDMA Sachet/gi, '')
        .trim()

      if (!cleanedText) return

      const utterance = new SpeechSynthesisUtterance(cleanedText)
      const isDevanagari = /[\u0900-\u097F]/.test(cleanedText)
      const targetLocale = isDevanagari ? 'hi-IN' : primaryLocale.startsWith('hi') ? 'hi-IN' : 'en-IN'

      utterance.lang = targetLocale
      utterance.rate = isDevanagari ? 0.95 : 1.0
      utterance.pitch = 1.0

      const voices = window.speechSynthesis?.getVoices?.() || []
      const matchedVoice =
        voices.find((v) => v.lang === targetLocale) ||
        voices.find((v) => v.lang?.startsWith(targetLocale.split('-')[0])) ||
        voices.find((v) => /hindi|indian|google/i.test(v.name))

      if (matchedVoice) {
        utterance.voice = matchedVoice
      }

      utterance.onstart = () => setVoiceState('speaking')
      utterance.onend = () => {
        setVoiceState('idle')
        onEnd?.()
      }
      utterance.onerror = (e) => {
        setVoiceState('idle')
        if (e.error !== 'canceled' && e.error !== 'interrupted') {
          setErrorKey('tts_error')
        }
      }

      try {
        window.speechSynthesis?.speak(utterance)
      } catch {
        setVoiceState('idle')
      }
    },
    [primaryLocale]
  )

  const toggleListening = useCallback(
    (onComplete) => {
      if (voiceState === 'listening' || voiceState === 'initializing') {
        stopListening()
      } else {
        listen(onComplete)
      }
    },
    [voiceState, listen, stopListening]
  )

  const clearError = useCallback(() => {
    setErrorKey(null)
    setVoiceState('idle')
  }, [])

  return {
    voiceState,
    isListening: voiceState === 'listening' || voiceState === 'initializing',
    isTranscribing: voiceState === 'transcribing',
    isSpeaking: voiceState === 'speaking',
    hasError: voiceState === 'error' && Boolean(errorKey),
    errorKey,
    errorMessage: errorKey ? VOICE_ERRORS[errorKey]?.[lang] || VOICE_ERRORS[errorKey]?.en : null,
    interim,
    finalTranscript,
    audioLevel,
    recordSeconds,
    listen,
    toggleListening,
    stopListening,
    cancelListening,
    speak,
    stopSpeaking,
    clearError,
    supported: speechSupported,
    canSpeak: synthesisSupported,
    locale: primaryLocale,
  }
}

export default useVoice
