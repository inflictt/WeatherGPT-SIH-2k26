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
  const s = SEVERITY[warning.colour]
  const expired = warning.status !== 'active'

  return (
    <Card
      tone={warning.colour}
      className={cn(
        'overflow-hidden',
        expired ? 'border-l-line opacity-60' : s.ring.replace('border-', 'border-l-'),
      )}
    >
      <div className={cn('px-5 pb-4 pt-4', !expired && s.wash)}>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <SeverityChip tone={expired ? 'green' : warning.colour}>
            {expired ? 'Expired' : `${s.label} · ${s.action}`}
          </SeverityChip>
          <span className="font-mono text-[10px] uppercase tracking-[0.13em] text-ink-3">
            {warning.area.description}
          </span>
        </div>

        <h3 className="mt-3 font-display text-[19px] font-semibold tracking-[-0.03em] leading-snug text-ink sm:text-[21px]">
          {warning.event}
        </h3>
        <p className="mt-1.5 max-w-measure text-[13.5px] leading-relaxed text-ink-2">
          {warning.headline}
        </p>
      </div>

      {!compact && (
        <div className="border-t border-line-soft px-5 py-4">
          <div className="lbl mb-2 text-[9.5px]">Official text — unedited</div>
          <blockquote className="border-l-2 border-line pl-3 font-mono text-[12px] leading-relaxed text-ink-2">
            {warning.description}
          </blockquote>
          {warning.instruction && (
            <blockquote className="mt-3 border-l-2 border-line pl-3 font-mono text-[12px] leading-relaxed text-ink-2">
              {warning.instruction}
            </blockquote>
          )}
        </div>
      )}

      {gloss && (
        <div className="border-t border-line-soft px-5 py-4">
          <div className="lbl mb-2 text-[9.5px] text-accent/70">What this means</div>
          <p className="max-w-measure text-[13.5px] leading-relaxed text-ink-2">{gloss}</p>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-line-soft px-5 py-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.11em] text-ink-3">
          {warning.sender}
        </div>
        <div className="font-mono text-[10px] tnum text-ink-3">
          Issued {stamp(warning.sent)} · Until {stamp(warning.expires)}
        </div>
      </div>
    </Card>
  )
}
