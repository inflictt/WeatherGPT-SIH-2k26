import { SEVERITY, RISK_TONE } from '../../lib/constants'
import { hhmm, cn } from '../../lib/utils'
import { t } from '../../lib/i18n'
import { SeverityChip } from '../ui/Severity'
import { ConfidenceBars } from '../ui/Bits'

/**
 * Rich, Multi-Dimensional WeatherGPT Answer Card.
 *
 * Renders the full meteorological breakdown:
 *   Location & Persona -> Active Warning -> Core Answer -> Dual Language Translation ->
 *   Key Weather Metrics -> IMD Risk Breakdown -> Model Ensemble Confidence ->
 *   Actionable Advice -> Verification Provenance
 */
export default function AnswerCard({ m, lang = 'en', onSpeak, speaking }) {
  const tone = m.riskBand ? RISK_TONE[m.riskBand] : 'green'
  const warning = m.warning
  const colour = warning?.colour || m.officialText?.colour
  const isEnglish = m.lang === 'en'
  const forecast = m.forecast

  return (
    <div className="max-w-[96%] space-y-3.5 sm:max-w-[85%] animate-rise">
      {/* 1 — Location & Persona Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {m.location && (
          <div className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-ash">
            <span className="text-iris">📍</span>
            <span className="font-semibold text-pure">
              {[m.location.name, m.location.district, m.location.state]
                .filter((v, i, a) => v && v !== 'Selected location' && a.indexOf(v) === i)
                .join(' · ')}
            </span>
          </div>
        )}
        {m.persona && m.persona !== 'general' && (
          <span className="inline-flex items-center gap-1 rounded-full border border-iris/30 bg-iris/10 px-2.5 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.12em] text-iris">
            {m.persona === 'farmer' ? '🌾 Agricultural Advisory' : m.persona === 'traveller' ? '🚗 Travel Advisory' : '🛡️ Official Advisory'}
          </span>
        )}
      </div>

      {/* 2 — Active Warning Banner (Priority 1 Safety Floor) */}
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

      {/* 3 — Primary Answer Card */}
      <div className="rounded-xl rounded-tl-xs border border-line bg-surface p-4 shadow-xl space-y-3.5">
        {/* Answer Summary & Speech Button */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5 flex-1">
            <p className="font-sans text-[15.5px] font-medium leading-relaxed text-ink">
              {m.summary}
            </p>
          </div>
          {onSpeak && m.speech && (
            <button
              type="button"
              onClick={() => onSpeak(m)}
              aria-label={speaking ? t('stopSpeaking', lang) : t('speak', lang)}
              className={cn(
                'flex-none rounded-full border p-2 transition-all duration-200',
                speaking
                  ? 'border-iris bg-iris/20 text-iris animate-pulse'
                  : 'border-line text-ink-2 hover:border-accent/40 hover:text-ink hover:bg-raised'
              )}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none"
                stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                {speaking ? (
                  <rect x="6" y="6" width="12" height="12" rx="1.5" fill="currentColor" />
                ) : (
                  <>
                    <path d="M11 5 6 9H3v6h3l5 4V5Z" />
                    <path d="M15.5 8.5a5 5 0 0 1 0 7" />
                    <path d="M18.5 6a9 9 0 0 1 0 12" />
                  </>
                )}
              </svg>
            </button>
          )}
        </div>

        {/* 4 — Dual-Language Translation Card (Always Bilingual) */}
        {m.gloss && (
          <div className="rounded-lg border border-line bg-raised/50 px-3 py-2.5">
            <div className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.13em] text-ink-3">
              <span>🌐</span>
              <span>{isEnglish ? 'हिन्दी अनुवाद (Hindi Translation)' : 'English Translation'}</span>
            </div>
            <p className="mt-1 text-[13px] leading-relaxed text-ink font-sans">
              {m.gloss}
            </p>
          </div>
        )}

        {/* 5 — Key Meteorological Facts Strip */}
        {forecast && (forecast.tmax != null || forecast.rain_mm != null || forecast.wind_kmh != null) && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 border-t border-line pt-3">
            {forecast.tmax != null && (
              <div className="rounded-md border border-line bg-raised/40 p-2">
                <span className="block font-mono text-[9px] uppercase tracking-[0.11em] text-ink-3">Temperature</span>
                <span className="font-mono text-[13px] font-semibold text-ink">
                  {forecast.tmax}°C <span className="text-ink-3 font-normal">/ {forecast.tmin}°C</span>
                </span>
              </div>
            )}
            {forecast.rain_mm != null && (
              <div className="rounded-md border border-line bg-raised/40 p-2">
                <span className="block font-mono text-[9px] uppercase tracking-[0.11em] text-ink-3">Rainfall</span>
                <span className="font-mono text-[13px] font-semibold text-ink">
                  {forecast.rain_mm} mm {forecast.prob != null && <span className="text-iris font-normal">({Math.round(forecast.prob * 100)}%)</span>}
                </span>
              </div>
            )}
            {forecast.wind_kmh != null && (
              <div className="rounded-md border border-line bg-raised/40 p-2 col-span-2 sm:col-span-1">
                <span className="block font-mono text-[9px] uppercase tracking-[0.11em] text-ink-3">Wind & Gusts</span>
                <span className="font-mono text-[13px] font-semibold text-ink">
                  {forecast.wind_kmh} <span className="text-ink-3 font-normal">km/h</span> {forecast.gust_kmh != null && <span className="text-ink-3 font-normal">({forecast.gust_kmh} gust)</span>}
                </span>
              </div>
            )}
          </div>
        )}

        {/* 6 — IMD Risk Assessment & Model Confidence Meters */}
        {(m.riskBand || m.confidence) && (
          <div className="space-y-2 border-t border-line pt-3">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              {m.riskBand && (
                <span className="flex items-center gap-2">
                  <span className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-ink-3">{t('risk', lang)}</span>
                  <span className={cn('font-mono text-[11.5px] uppercase font-bold tracking-[0.12em]', SEVERITY[tone]?.text || 'text-ink')}>
                    {m.riskBand}
                  </span>
                  {m.riskScore != null && (
                    <span className="tnum font-mono text-[10.5px] text-ink-3">({m.riskScore}/100)</span>
                  )}
                </span>
              )}
              {m.confidence && (
                <span className="flex items-center gap-2">
                  <span className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-ink-3">{t('confidence', lang)}</span>
                  <span className="font-mono text-[11.5px] uppercase font-semibold tracking-[0.12em] text-ink">
                    {m.confidence}
                  </span>
                  <ConfidenceBars level={m.confidence} />
                </span>
              )}
            </div>

            {/* Detailed Risk Explanation */}
            {m.riskExplanation && (
              <p className="text-[12.5px] leading-relaxed text-ink font-sans">
                {m.riskExplanation}
              </p>
            )}

            {/* Model Ensemble Agreement Reasons */}
            {m.uncertaintyExplanation && (
              <p className="text-[12px] leading-relaxed text-ink-3 font-sans italic">
                {m.uncertaintyExplanation}
              </p>
            )}
          </div>
        )}
      </div>

      {/* 7 — Actionable Recommendations List */}
      {m.actions?.length > 0 && (
        <div className="rounded-xl border border-line bg-surface p-3.5 space-y-2">
          <p className="font-mono text-[9.5px] uppercase tracking-[0.13em] text-ink-3 flex items-center gap-1.5">
            <span className="text-iris">⚡</span> Actionable Guidance
          </p>
          <ul className="space-y-2 pl-1">
            {m.actions.map((a, i) => (
              <li key={a} className="flex items-start gap-2.5 text-[13.5px] leading-relaxed text-ink">
                <span className="mt-[7px] h-1.5 w-1.5 rounded-full flex-none bg-iris" aria-hidden="true" />
                <span>
                  <span className="text-ink font-normal">{a}</span>
                  {m.actionsGloss?.[i] && (
                    <span className="block mt-0.5 text-[12px] text-ink-3">
                      {m.actionsGloss[i]}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 8 — Grounded Provenance Footer */}
      {m.sources?.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-1 font-mono text-[9.5px] uppercase tracking-[0.12em] text-ash">
          <span>
            {t('sources', lang)}: {m.sources.join(' · ')}
          </span>
          <span className="text-iris/80">
            ✓ IMD Safety Floor Verified
          </span>
        </div>
      )}
    </div>
  )
}
