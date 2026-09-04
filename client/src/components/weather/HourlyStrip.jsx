import { useData } from '../../lib/DataContext'
import { hhmm } from '../../lib/utils'
import { Card, CardHead } from '../ui/Card'

/**
 * Twelve hours, precipitation as the primary mark and temperature as a label.
 * Bars are scaled to the largest value in view so the shape of the event reads
 * at a glance rather than needing an axis.
 */
export default function HourlyStrip() {
  const { hourly: HOURLY } = useData()
  const peak = Math.max(...HOURLY.map((h) => h.mm), 1)
  const total = HOURLY.reduce((a, h) => a + h.mm, 0)

  return (
    <Card>
      <CardHead label="Next 12 hours" meta={`${total.toFixed(0)} mm total · peak ${peak} mm/h`} />
      <div className="px-5 pb-5 pt-4">
        <div className="rail-x fade-r items-end gap-3 sm:gap-4">
          {HOURLY.map((h, i) => {
            const height = Math.max(3, (h.mm / peak) * 96)
            const wet = h.mm >= 7.6
            return (
              <div key={h.t} className="flex w-[46px] flex-none flex-col items-center gap-2">
                <span className="font-mono text-[10px] tnum text-ink-2">{h.tempC}°</span>

                <div className="relative flex h-[104px] w-full items-end justify-center">
                  <div
                    className="w-[14px] origin-bottom rounded-t-[2px] transition-[height] duration-700 ease-out"
                    style={{
                      height: `${height}px`,
                      background: wet
                        ? 'linear-gradient(to top, rgb(var(--c-sev-orange) / 0.85), rgb(var(--c-sev-orange) / 0.35))'
                        : 'linear-gradient(to top, rgb(var(--c-accent) / 0.5), rgb(var(--c-accent) / 0.16))',
                      transitionDelay: `${i * 45}ms`,
                    }}
                  />
                </div>

                <span className="font-mono text-[9.5px] tnum text-ink-3">
                  {h.mm > 0 ? h.mm.toFixed(1) : '—'}
                </span>
                <span className="font-mono text-[9.5px] tnum text-ink-3">{hhmm(h.t)}</span>
              </div>
            )
          })}
        </div>
        <p className="mt-4 border-t border-line-soft pt-3 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">
          Bars show millimetres per hour · orange marks heavy intensity
        </p>
      </div>
    </Card>
  )
}
