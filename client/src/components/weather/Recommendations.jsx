import { PERSONAS } from '../../lib/constants'
import { useData } from '../../lib/DataContext'
import { cn } from '../../lib/utils'
import { Card, CardHead } from '../ui/Card'
import { Skeleton } from '../ui/Bits'

/**
 * The last mile: what to actually do. Phrased as guidance, never as an order —
 * §5 of the PRD is explicit that we are not an authority.
 *
 * These come from the same composer the Ask screen uses, so they are
 * conditioned on the real numbers *and* on the persona. That matters more than
 * it sounds: the list used to be a fixed array, which meant switching from
 * Farmer to Traveller highlighted a different chip and changed nothing else —
 * a control that visibly does nothing is worse than no control.
 *
 * It also means a calm day never advises covering a harvest, because the
 * engine gates each action on the fetched values rather than on the persona
 * alone.
 */
export default function Recommendations({ persona, setPersona }) {
  const { advice, loading, degraded } = useData()
  const actions = advice?.actions || []

  return (
    <Card>
      <CardHead label="Suggested actions" meta="Guidance, not an official directive" />

      <div className="px-5 pb-4 pt-3">
        <div className="rail-x mb-4" role="group" aria-label="Who this advice is for">
          {PERSONAS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setPersona(p.key)}
              aria-pressed={persona === p.key}
              className={cn(
                'flex-none rounded-md border px-3.5 py-3 font-mono text-[10px] uppercase tracking-[0.12em]',
                'transition-colors duration-250 ease-out',
                persona === p.key
                  ? 'border-accent/45 bg-accent-dim text-accent'
                  : 'border-line text-ink-3 hover:border-ink-3 hover:text-ink-2',
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        {loading && (
          <div className="space-y-3" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="mt-[3px] h-3 w-4" />
                <Skeleton className="h-3 flex-1" />
              </div>
            ))}
          </div>
        )}

        {!loading && actions.length > 0 && (
          <ol className="space-y-3">
            {actions.map((r, i) => (
              <li key={r} className="flex gap-3">
                <span className="mt-[3px] font-mono text-[10px] tnum text-accent/70">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="max-w-measure text-[13.5px] leading-relaxed text-ink-2">
                  {r}
                  {advice?.actionsGloss?.[i] && advice.language !== 'en' && (
                    <span className="ml-2 text-[11.5px] italic text-ink-3">
                      {advice.actionsGloss[i]}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ol>
        )}

        {!loading && actions.length === 0 && (
          <p className="py-3 text-[13px] leading-relaxed text-ink-3">
            {degraded
              ? 'The advice engine is unreachable. The forecast, warnings and risk above are unaffected.'
              : 'Nothing to plan around right now — conditions are ordinary for this location.'}
          </p>
        )}
      </div>
    </Card>
  )
}
