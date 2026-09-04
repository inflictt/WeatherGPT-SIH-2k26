import AnswerCard from '../answer/AnswerCard'
import { t } from '../../lib/i18n'

function UserMessage({ m }) {
  return (
    <div className="flex justify-end animate-rise">
      <div className="max-w-[85%] sm:max-w-[68%]">
        <div className="rounded-lg rounded-br-xs border border-line bg-raised px-4 py-2.5">
          <p className="text-[14px] leading-relaxed text-ink">{m.text}</p>
        </div>
        {m.gloss && (
          <p className="mt-1.5 pr-1 text-right text-[11.5px] italic text-ink-3">{m.gloss}</p>
        )}
      </div>
    </div>
  )
}

/**
 * The assistant turn is assembled from the structured answer contract (§10),
 * not from prose — which is exactly why it still renders when the language
 * model is unavailable. `AnswerCard` is shared with the Today screen so safety
 * information is never something you only see inside a chat bubble.
 */
function AssistantMessage({ m, lang, onSpeak, speaking }) {
  return (
    <div className="animate-rise">
      <div className="mb-2 flex items-center gap-2">
        <span className="h-1 w-1 rounded-full bg-accent" aria-hidden="true" />
        <span className="lbl text-[9.5px]">WeatherGPT</span>
      </div>
      <AnswerCard m={m} lang={lang} onSpeak={onSpeak} speaking={speaking} />
    </div>
  )
}

/**
 * Something went wrong with *this* turn. Styled as a reply rather than an
 * alert bar so the thread still reads as a conversation, and marked with the
 * severity colour that means "be aware" rather than the one that means
 * "take action" — a failed request is not a hazard.
 */
function SystemMessage({ m }) {
  return (
    <div className="animate-rise">
      <div className="mb-2 flex items-center gap-2">
        <span className="h-1 w-1 rounded-full bg-sev-yellow" aria-hidden="true" />
        <span className="lbl text-[9.5px]">Could not answer</span>
      </div>
      <p
        role="status"
        className="max-w-[92%] rounded-lg rounded-tl-xs border border-line bg-raised px-4 py-3 text-[13px] leading-relaxed text-ink-2 sm:max-w-[78%]"
      >
        {m.text}
      </p>
    </div>
  )
}

export default function Message({ m, lang, onSpeak, speaking }) {
  if (m.role === 'user') return <UserMessage m={m} />
  if (m.role === 'system') return <SystemMessage m={m} />
  return <AssistantMessage m={m} lang={lang} onSpeak={onSpeak} speaking={speaking} />
}

export function Thinking({ lang = 'en' }) {
  return (
    <div className="animate-fade">
      <div className="mb-2 flex items-center gap-2">
        <span className="h-1 w-1 rounded-full bg-accent" aria-hidden="true" />
        <span className="lbl text-[9.5px]">WeatherGPT</span>
      </div>
      <div className="inline-flex items-center gap-3 rounded-lg rounded-tl-xs border border-line bg-surface px-4 py-3">
        <span className="flex gap-1" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <i
              key={i}
              className="h-1.5 w-1.5 animate-blink rounded-full bg-ink-3"
              style={{ animationDelay: `${i * 180}ms` }}
            />
          ))}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">
          {t('thinking', lang)}
        </span>
      </div>
    </div>
  )
}
