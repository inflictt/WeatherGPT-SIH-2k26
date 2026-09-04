import { SEVERITY } from '../../lib/constants'
import { stamp, cn } from '../../lib/utils'
import { Card } from '../ui/Card'
import { SeverityChip } from '../ui/Severity'

/**
 * §7 hard rule: official text is immutable and must be visually separated
 * from anything the model wrote. The two blocks below are labelled and
 * styled differently on purpose — do not merge them in a later phase.
 */
export default function WarningCard({ warning, gloss, compact = false }) {
  const s = SEVERITY[warning.colour] || SEVERITY.orange
  const expired = warning.status !== 'active'

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border glass-panel backdrop-blur-xl shadow-2xl transition-all duration-300',
        expired ? 'border-line/40 opacity-70' : 'border-line hover:border-accent/40',
      )}
    >
      {/* Accent left indicator bar */}
      <div
        className={cn(
          'absolute left-0 top-0 bottom-0 w-1.5',
          expired ? 'bg-ink-3/40' : s.bg,
        )}
      />

      <div className={cn('px-6 pb-5 pt-5 pl-7', !expired && s.wash)}>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <SeverityChip tone={expired ? 'green' : warning.colour} size="sm">
            {expired ? 'Expired' : `${s.label} · ${s.action}`}
          </SeverityChip>
          {warning.area?.description && (
            <span className="glass-pill px-3 py-0.5 rounded-full font-mono text-[10.5px] uppercase tracking-[0.13em] text-ink-2 font-medium">
              📍 {warning.area.description}
            </span>
          )}
        </div>

        <h3 className="mt-3 font-display text-xl sm:text-2xl font-semibold tracking-tight leading-snug text-ink">
          {warning.event}
        </h3>
        <p className="mt-2 max-w-measure text-sm sm:text-[14.5px] leading-relaxed text-ink font-medium">
          {warning.headline}
        </p>
      </div>

      {!compact && (
        <div className="border-t border-line px-6 py-4 pl-7 space-y-3 bg-surface/40">
          <div className="lbl text-[10px] text-ink-3 tracking-wider">Official Advisory Text</div>
          <blockquote className="rounded-xl bg-raised/50 border border-line p-3.5 font-mono text-[12.5px] leading-relaxed text-ink-2 shadow-inner">
            {warning.description}
          </blockquote>
          {warning.instruction && (
            <div className="rounded-xl bg-accent/5 border border-accent/20 p-3.5 font-mono text-[12.5px] leading-relaxed text-ink">
              <span className="text-accent font-bold mr-1.5">⚡ Instruction:</span>
              {warning.instruction}
            </div>
          )}
        </div>
      )}

      {gloss && (
        <div className="border-t border-line px-6 py-4 pl-7 bg-iris/5">
          <div className="lbl mb-1.5 text-[10px] text-iris font-bold">What this means for you</div>
          <p className="max-w-measure text-[13.5px] leading-relaxed text-ink font-medium">{gloss}</p>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-line px-6 py-3 pl-7 bg-surface/60 font-mono text-[11px] text-ink-3">
        <div>{warning.sender || 'WeatherGPT Multi-Model & Live Observer'}</div>
        <div className="tnum">
          Issued {stamp(warning.sent)} {warning.expires ? `· Until ${stamp(warning.expires)}` : ''}
        </div>
      </div>
    </div>
  )
}

