import { SEVERITY, RISK_TONE } from '../../lib/constants'
import { hhmm, cn } from '../../lib/utils'
import { t } from '../../lib/i18n'
import { SeverityChip } from '../ui/Severity'
import { ConfidenceBars } from '../ui/Bits'

/**
 * One grounded answer, rendered in a fixed order.
 *
 *   Location → Warning → Answer → Risk → Confidence → Actions → Sources
 *
 * The order is the product argument, not a layout preference. A warning
 * outranks the answer, so it renders above it — always, including when the
 * user asked something unrelated. Nothing here is conditional on the language
 * model having worked: every block reads a field, and a missing field hides its
 * own block rather than breaking the card.
 *
 * Official CAP text and the plain-language gloss are two visually separate,
 * separately labelled blocks. They are never merged, and the official one is
 * never summarised (invariant 2).
 */
export default function AnswerCard({ m, lang = 'en', onSpeak, speaking }) {
  const tone = m.riskBand ? RISK_TONE[m.riskBand] : null
  const warning = m.warning
  const colour = warning?.colour || m.officialText?.colour

  return (
    <div className="max-w-[94%] space-y-3 sm:max-w-[80%]">
      {/* 1 — where this answer is about */}
      {m.location && (
        <div className="flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-ash">
          <span className="text-iris">📍</span>
          <span>
            {[m.location.name, m.location.district, m.location.state]
              .filter((v, i, a) => v && v !== 'Selected location' && a.indexOf(v) === i)
              .join(' · ')}
          </span>
        </div>
      )}

      {/* 2 — the warning, above the answer, always */}
      {(warning || m.officialText) && colour && (
        <section
          aria-live="assertive"
          className={cn(
            'rounded-xl border border-l-4 px-4 py-3 shadow-lg',
            SEVERITY[colour].ring,
            SEVERITY[colour].wash,
          )}
        >
          <div className="flex flex-wrap items-center gap-2">
            <SeverityChip tone={colour} size="sm">
              {SEVERITY[colour].label} · {SEVERITY[colour].action}
            </SeverityChip>
            {warning?.expires && (
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-cloud opacity-80">
                until {hhmm(warning.expires)}
              </span>
            )}
          </div>

          {/* Official text — verbatim, in its own labelled block */}
          <p className="mt-2.5 font-mono text-[9.5px] uppercase tracking-[0.13em] text-ash">
            {t('officialWarning', lang)}
          </p>
          <p className="mt-1 text-[13.5px] font-medium leading-relaxed text-pure">
            {m.officialText?.headline || warning?.headline}
          </p>
          {(m.officialText?.instruction || warning?.instruction) && (
            <p className="mt-1.5 text-[13px] leading-relaxed text-cloud">
              {m.officialText?.instruction || warning?.instruction}
            </p>
          )}
          <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.11em] text-ash">
            {m.officialText?.senderName || warning?.sender}
          </p>

          {/* The gloss — separate block, separate label, never a replacement */}
          {m.warningMessage && (
            <div className="mt-3 border-t border-white/10 pt-2.5">
              <p className="font-mono text-[9.5px] uppercase tracking-[0.13em] text-ash">
                {t('whatThisMeans', lang)}
              </p>
              <p className="mt-1 text-[13px] leading-relaxed text-cloud">
                {m.warningMessage}
              </p>
            </div>
          )}
        </section>
      )}

      {/* 3 — the answer */}
      <div className="rounded-xl rounded-tl-xs border border-white/10 bg-[#18191b] px-4 py-3.5 shadow-md">
        <div className="flex items-start justify-between gap-3">
          <p className="font-sans text-[15px] font-normal leading-relaxed text-pure">
            {m.summary}
          </p>
          {onSpeak && m.speech && (
            <button
              type="button"
              onClick={() => onSpeak(m)}
              aria-label={speaking ? t('stopSpeaking', lang) : t('speak', lang)}
              className="mt-0.5 flex-none rounded-full border border-white/15 p-1.5 text-ash transition-colors duration-200 hover:border-white/40 hover:text-pure"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none"
                stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                {speaking ? (
                  <rect x="6" y="6" width="12" height="12" rx="1.5" />
                ) : (
                  <>
                    <path d="M11 5 6 9H3v6h3l5 4V5Z" />
                    <path d="M15.5 8.5a5 5 0 0 1 0 7" />
                  </>
                )}
              </svg>
            </button>
          )}
        </div>

        {m.gloss && m.lang !== 'en' && (
          <p className="mt-2 text-[13px] italic leading-relaxed text-ash">{m.gloss}</p>
        )}

        {/* 4 & 5 — risk and confidence, from the engines */}
        {(m.riskBand || m.confidence) && (
          <div className="mt-3.5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/10 pt-3">
            {m.riskBand && (
              <span className="flex items-center gap-2">
                <span className="lbl text-[9.5px] text-ash">{t('risk', lang)}</span>
                <span className={cn('font-mono text-[11.5px] uppercase font-semibold tracking-[0.12em]', SEVERITY[tone].text)}>
                  {m.riskBand}
                </span>
                {m.riskScore != null && (
                  <span className="tnum font-mono text-[10.5px] text-ash">({m.riskScore}/100)</span>
                )}
              </span>
            )}
            {m.confidence && (
              <span className="flex items-center gap-2">
                <span className="lbl text-[9.5px] text-ash">{t('confidence', lang)}</span>
                <span className="font-mono text-[11.5px] uppercase font-semibold tracking-[0.12em] text-cloud">
                  {m.confidence}
                </span>
                <ConfidenceBars level={m.confidence} />
              </span>
            )}
          </div>
        )}

        {/* The safety floor, said out loud when it fired */}
        {m.flooredBy && (
          <p className="mt-2.5 text-[12.5px] leading-relaxed text-ash">
            {m.riskExplanation}
          </p>
        )}
      </div>

      {/* 6 — what to do */}
      {m.actions?.length > 0 && (
        <ul className="space-y-1.5 pl-1">
          {m.actions.map((a, i) => (
            <li key={a} className="flex gap-2.5 text-[13.5px] leading-relaxed text-cloud">
              <span className="mt-[9px] h-1.5 w-1.5 rounded-full flex-none bg-iris" aria-hidden="true" />
              <span>
                {a}
                {m.actionsGloss?.[i] && m.lang !== 'en' && (
                  <span className="ml-2 text-[12px] italic text-ash">({m.actionsGloss[i]})</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* 7 — provenance */}
      {m.sources?.length > 0 && (
        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ash">
          {t('sources', lang)}: {m.sources.join(' · ')}
          {m.composer === 'deterministic' && ' · Phrased Locally (Zero Hallucination)'}
        </p>
      )}
    </div>
  )
}
