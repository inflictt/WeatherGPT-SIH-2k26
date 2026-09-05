import { cn } from '../lib/utils'
import Icon from '../ui/Icon'

export default function VoiceAssistantBar({
  voice,
  lang = 'en',
  onSend,
  disabled = false,
  className,
}) {
  const {
    isListening,
    isTranscribing,
    isSpeaking,
    interim,
    hasError,
    errorMessage,
    audioLevel,
    recordSeconds,
    listen,
    stopListening,
    cancelListening,
    stopSpeaking,
    clearError,
  } = voice

  const isHindi = lang === 'hi'
  const isHinglish = lang === 'hinglish'

  const handleStopAndSend = () => {
    stopListening()
  }

  const handleRetry = () => {
    if (disabled) return
    clearError()
    listen((transcript) => {
      if (transcript && transcript.trim()) {
        onSend?.(transcript.trim(), { spoken: true })
      }
    })
  }

  // Dynamic bar height scaled to actual microphone audio level
  const h1 = Math.max(4, Math.round(6 + audioLevel * 20))
  const h2 = Math.max(6, Math.round(10 + audioLevel * 26))
  const h3 = Math.max(4, Math.round(8 + audioLevel * 22))
  const h4 = Math.max(5, Math.round(7 + audioLevel * 24))

  return (
    <div className={cn('space-y-2', className)}>
      {/* ----------------- SPECIFIC ERROR RECOVERY BANNER ----------------- */}
      {hasError && errorMessage && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-sev-amber/40 bg-sev-amber-soft/40 px-3.5 py-2.5 text-data text-ink animate-fade-in shadow-xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sev-amber flex-none">
              <Icon name="alert" size={16} />
            </span>
            <span className="text-caption font-medium truncate">{errorMessage}</span>
          </div>
          <div className="flex items-center gap-2 flex-none">
            <button
              type="button"
              onClick={handleRetry}
              aria-label="Retry voice input"
              className="rounded-lg bg-accent px-3 py-1 text-xs font-semibold text-on-accent hover:opacity-90 active:scale-95 transition-all shadow-xs"
            >
              {isHindi ? 'पुनः प्रयास करें' : 'Retry'}
            </button>
            <button
              type="button"
              onClick={clearError}
              aria-label="Dismiss"
              className="text-xs text-ink-3 hover:text-ink px-1.5 py-1"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* ----------------- ACTIVE REAL-TIME LISTENING & LIVE TRANSCRIPT CARD ----------------- */}
      {(isListening || isTranscribing) && (
        <div className="rounded-2xl border border-accent/60 bg-surface/95 backdrop-blur-md p-3.5 shadow-lg animate-fade-in space-y-2.5 ring-1 ring-accent/20">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {/* Real-time Dynamic Audio Wave Bars reacting to real microphone volume */}
              {isListening ? (
                <span className="flex items-center gap-1 h-6">
                  <span
                    className="w-1 bg-accent rounded-full transition-all duration-75"
                    style={{ height: `${h1}px` }}
                  />
                  <span
                    className="w-1 bg-accent rounded-full transition-all duration-75"
                    style={{ height: `${h2}px` }}
                  />
                  <span
                    className="w-1 bg-accent rounded-full transition-all duration-75"
                    style={{ height: `${h3}px` }}
                  />
                  <span
                    className="w-1 bg-accent rounded-full transition-all duration-75"
                    style={{ height: `${h4}px` }}
                  />
                </span>
              ) : (
                <span className="h-3 w-3 rounded-full bg-accent animate-ping" />
              )}

              <span className="text-caption font-bold text-accent">
                {isTranscribing
                  ? (isHindi
                      ? 'आवाज़ पहचानी जा रही है…'
                      : isHinglish
                        ? 'Aawaz samajh rahe hain…'
                        : 'Transcribing speech…')
                  : (isHindi
                      ? `सुन रहे हैं (${recordSeconds}s)… बोलिए`
                      : isHinglish
                        ? `Sun rahe hain (${recordSeconds}s)… boliye`
                        : `Listening (${recordSeconds}s)… speak now`)}
              </span>
            </div>

            {isListening && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={cancelListening}
                  aria-label="Cancel voice input"
                  className="rounded-xl border border-line bg-surface px-2.5 py-1.5 text-xs font-semibold text-ink-3 hover:text-sev-red hover:border-sev-red/30 transition-all shadow-xs"
                >
                  {isHindi ? 'रद्द करें' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={handleStopAndSend}
                  aria-label="Done speaking"
                  className="tap rounded-xl bg-accent px-3.5 py-1.5 text-xs font-semibold text-on-accent hover:opacity-90 active:scale-95 transition-all shadow-xs flex items-center gap-1.5"
                >
                  <Icon name="check" size={13} />
                  <span>{isHindi ? 'पूरा हुआ [Send]' : 'Done / Send'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Real-time Progressive Transcript Display */}
          <div className="rounded-xl border border-line-soft bg-sunk/80 px-3.5 py-2.5 min-h-[48px] flex items-center">
            {interim ? (
              <p className="text-body-sm font-medium text-ink leading-relaxed break-words">
                "{interim}"
              </p>
            ) : (
              <p className="text-caption italic text-ink-3">
                {isHindi
                  ? 'जैसे: "कल मेरे खेत में बारिश होगी क्या?"'
                  : isHinglish
                    ? 'Jaise: "Kal Gurgaon mein barish hogi kya?"'
                    : 'Example: "Will it rain on my farm tomorrow?"'}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ----------------- SPEAKING TTS STATUS BAR ----------------- */}
      {isSpeaking && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-sev-green/40 bg-sev-green-soft/40 px-4 py-2.5 animate-fade-in shadow-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="grid h-5 w-5 flex-none place-items-center rounded-full bg-sev-green text-on-sev text-xs">
              <Icon name="speaker" size={12} />
            </span>
            <span className="text-caption font-bold text-sev-green truncate">
              {isHindi
                ? '🔊 उत्तर सुनाया जा रहा है…'
                : isHinglish
                  ? '🔊 Uttar sunaya ja raha hai…'
                  : '🔊 Speaking response…'}
            </span>
          </div>

          <button
            type="button"
            onClick={stopSpeaking}
            aria-label="Stop speaking"
            className="flex-none rounded-lg border border-line bg-surface px-3 py-1 text-xs font-semibold text-ink hover:bg-sunk hover:text-sev-red transition-colors"
          >
            {isHindi ? 'रोकें [Stop]' : 'Stop'}
          </button>
        </div>
      )}
    </div>
  )
}
