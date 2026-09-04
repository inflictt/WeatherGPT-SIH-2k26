import { useData } from '../../lib/DataContext'
import { SEVERITY, RISK_TONE } from '../../lib/constants'
import { cn } from '../../lib/utils'
import { Card, CardHead } from '../ui/Card'
import { SeverityChip, Meter } from '../ui/Severity'
import { Skeleton } from '../ui/Bits'

/**
 * §8. The score shows its own arithmetic, and the safety floor is stated
 * in the UI rather than hidden in the engine — that line is the pitch.
 */
export default function RiskPanel() {
  const { risk: RISK, loading, degraded } = useData()

  // Returning null while loading made the card pop in from nothing, and made
  // "still fetching" indistinguishable from "the engine is down" — two facts
  // that need different words.
  if (loading) {
    return (
      <Card className="px-5 py-6" aria-busy="true">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="mt-4 h-9 w-32" />
        <Skeleton className="mt-4 h-14 w-full" />
        <Skeleton className="mt-4 h-3 w-full" />
        <Skeleton className="mt-2 h-3 w-2/3" />
      </Card>
    )
  }

  if (!RISK) {
    return (
      <Card className="px-5 py-6">
        <p className="lbl text-[9.5px]">Risk assessment</p>
        <p className="mt-2 max-w-measure text-[13.5px] leading-relaxed text-ink-2">
          {degraded
            ? 'The risk engine is unreachable, so this day has no score. The forecast and any official warnings above are unaffected — they come from different sources.'
            : 'No risk assessment for this location yet.'}
        </p>
      </Card>
    )
  }
  const tone = RISK_TONE[RISK.overall]
  const s = SEVERITY[tone]
  const maxWeight = Math.max(...RISK.breakdown.map((b) => b.weight))

  return (
    <Card className={cn('border-l-2', s.ring.replace('border-', 'border-l-'))}>
      <CardHead label="Risk assessment" meta={`Score ${RISK.score}/100`} />

      <div className="px-5 pb-4 pt-3">
        <div className="flex items-end gap-4">
          <div className={cn('font-sans text-[40px] font-medium tracking-[-0.02em] leading-none', s.text)}>
            {RISK.overall}
          </div>
          <div className="pb-1.5">
            <SeverityChip tone={tone} size="sm">
              {s.label} conditions
            </SeverityChip>
          </div>
        </div>

        {RISK.flooredBy && (
          <p className="mt-4 rounded-xs border border-line bg-raised/60 px-3 py-2.5 text-[12.5px] leading-relaxed text-ink-2">
            <span className={cn('font-mono text-[10px] uppercase tracking-[0.13em]', s.text)}>
              Safety floor applied
            </span>
            <br />
            An active {RISK.flooredBy.colour} alert sets a minimum of{' '}
            <span className="text-ink">{RISK.flooredBy.minimum}</span>. Computed values can raise
            this level but never lower it.
          </p>
        )}
      </div>

      <ul className="border-t border-line-soft px-5 py-4">
        {RISK.breakdown.map((b, i) => (
          <li key={b.key} className="py-2.5">
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-[13.5px] text-ink">{b.label}</span>
              <span
                className={cn(
                  'font-mono text-[10px] uppercase tracking-[0.13em]',
                  SEVERITY[RISK_TONE[b.band]].text,
                )}
              >
                {b.band}
                <span className="ml-2 tnum text-ink-3">+{b.weight}</span>
              </span>
            </div>
            <div className="mt-2">
              <Meter value={b.weight} max={maxWeight} band={b.band} delay={i * 90} />
            </div>
            <p className="mt-1.5 text-[12px] leading-relaxed text-ink-3">{b.note}</p>
          </li>
        ))}
      </ul>

      <div className="border-t border-line-soft px-5 py-3 font-mono text-[10px] uppercase tracking-[0.11em] text-ink-3">
        {RISK.breakdown.map((b) => b.weight).join(' + ')} = {RISK.score}
      </div>
    </Card>
  )
}
