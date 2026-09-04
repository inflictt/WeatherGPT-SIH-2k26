import { ACTIVE_LANGUAGES } from '../../lib/constants'
import { cn } from '../../lib/utils'

/**
 * English, Hindi and Hinglish are the three shipping modes. Hinglish is not a
 * gimmick: most people type Hindi words on a QWERTY keyboard, and a product
 * that only accepts Devanagari excludes them.
 *
 * There is no sliding indicator, deliberately. The previous one was an absolute
 * span sized to `100/3 %` and moved by `translateX`, which could not work: the
 * buttons are content-width and "EN" is roughly half the width of "Hinglish",
 * so the highlight sat under the wrong label — and, like the switch knob before
 * it, the span had no `left`, so it started from a static position rather than
 * the track's edge.
 *
 * Highlighting the active button itself removes the whole class of bug, needs
 * no measurement, and matches how `Segmented` already behaves.
 */
export default function LangToggle({ lang, setLang }) {
  return (
    <div
      className="flex items-center rounded-lg border border-line bg-surface p-[3px]"
      role="group"
      aria-label="Language"
    >
      {ACTIVE_LANGUAGES.map((l) => (
        <button
          key={l.code}
          type="button"
          onClick={() => setLang(l.code)}
          aria-pressed={lang === l.code}
          title={l.label}
          className={cn(
            'rounded-[6px] px-2.5 py-1.5 text-center text-[12px] leading-none',
            'transition-colors duration-250 ease-out',
            lang === l.code
              ? 'bg-raised text-ink'
              : 'text-ink-3 hover:text-ink-2',
          )}
        >
          {/* "Hinglish" spelled out is 70 px, which a 320 px header cannot
              spare. The short form only appears where the space forces it. */}
          <span className="hidden sm:inline">{l.short}</span>
          <span className="sm:hidden">{l.tiny || l.short}</span>
        </button>
      ))}
    </div>
  )
}
