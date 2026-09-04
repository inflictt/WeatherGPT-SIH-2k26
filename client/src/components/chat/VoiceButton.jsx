import { cn } from '../../lib/utils'

/**
 * Phase 1 renders the full listening state without touching the microphone.
 * Phase 5 swaps the click handler for Web Speech; nothing visual changes.
 */
export default function VoiceButton({ listening, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={listening}
      aria-label={listening ? 'Stop listening' : 'Ask by voice'}
      className={cn(
        'tap relative flex h-10 w-10 flex-none items-center justify-center rounded-full border',
        'transition-[background-color,border-color,color] duration-250 ease-out',
        listening
          ? 'border-accent/60 bg-accent-dim text-accent'
          : 'border-line bg-surface text-ink-3 hover:border-ink-3 hover:text-ink',
      )}
    >
      {listening && (
        <span className="absolute inset-0 animate-pulse-ring rounded-full bg-accent/25" aria-hidden="true" />
      )}
      <svg viewBox="0 0 24 24" className="relative h-[17px] w-[17px]" fill="none"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="9" y="3" width="6" height="11" rx="3" />
        <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
      </svg>
    </button>
  )
}
