import { useData } from '../../lib/DataContext'
import { Card, CardHead } from '../ui/Card'
import { ConfidenceBars, Skeleton } from '../ui/Bits'

/**
 * §9. Deliberately uncoloured: confidence is not a hazard, and colouring it
 * would dilute the rule that colour means severity. The model comparison is
 * the evidence, shown rather than asserted.
 */
export default function ConfidencePanel() {
  const { confidence: C, loading } = useData()

  if (loading) {
    return (
      <Card className="px-5 py-6" aria-busy="true">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="mt-4 h-8 w-28" />
        <Skeleton className="mt-4 h-3 w-full" />
        <Skeleton className="mt-2 h-3 w-4/5" />
      </Card>
    )
  }

  if (!C) {
    return (
      <Card className="px-5 py-6">
        <p className="lbl text-[9.5px]">Forecast confidence</p>
        <p className="mt-2 max-w-measure text-[13.5px] leading-relaxed text-ink-2">
          Confidence needs at least two models to disagree about. Only one
          responded, so there is nothing to cross-check — and saying so is more
          useful than showing a number with no basis.
        </p>
      </Card>
    )
  }
  const max = Math.max(...C.models.map((m) => m.mm))

  return (
    <Card>
      <CardHead label="Forecast confidence" meta={`${C.leadHours} h ahead`} />

      <div className="px-5 pb-4 pt-3">
        <div className="flex items-center gap-3">
          <span className="font-sans text-[28px] font-medium tracking-[-0.02em] leading-none text-ink">
            {C.level}
          </span>
          <ConfidenceBars level={C.level} />
        </div>

        <ul className="mt-4 space-y-2">
          {C.reasons.map((r) => (
            <li key={r} className="flex gap-2.5 text-[13px] leading-relaxed text-ink-2">
              <span className="mt-[9px] h-px w-3 flex-none bg-line" aria-hidden="true" />
              <span>{r}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="border-t border-line-soft px-5 py-4">
        <div className="lbl mb-3 text-[9.5px]">24-hour totals by model</div>
        <ul className="space-y-2.5">
          {C.models.map((m, i) => (
            <li key={m.name} className="grid grid-cols-[92px_1fr_52px] items-center gap-3">
              <span className="truncate text-[12.5px] text-ink-2">{m.name}</span>
              <span className="h-[3px] w-full rounded-full bg-line-soft">
                <span
                  className="block h-full rounded-full bg-accent/70 transition-[width] duration-700 ease-out"
                  style={{ width: `${(m.mm / max) * 100}%`, transitionDelay: `${i * 90}ms` }}
                />
              </span>
              <span className="text-right font-mono text-[11.5px] tnum text-ink">{m.mm} mm</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 border-t border-line-soft pt-3 text-[12px] leading-relaxed text-ink-3">
          A forecast is a probability, not a promise. Where models disagree, WeatherGPT says so.
        </p>
      </div>
    </Card>
  )
}
