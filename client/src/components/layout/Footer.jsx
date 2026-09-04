import { useData } from '../../lib/DataContext'
import { ago, cn } from '../../lib/utils'

const DOT = {
  ok: 'bg-sev-green',
  degraded: 'bg-sev-yellow',
  down: 'bg-sev-red',
}

/**
 * Provenance strip. §6 of the PRD makes source + issue time a hard product
 * requirement, so it lives in the chrome rather than being bolted on later.
 */
export default function Footer() {
  const { sources: SOURCES, mode } = useData()
  return (
    <footer className="mt-20 border-t border-line-soft pb-24 pt-8 md:pb-10">
      <div className="shell">
        <h2 className="lbl mb-4">Sources</h2>
        <ul className="grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
          {SOURCES.map((s) => (
            <li key={s.name} className="flex items-start gap-2.5">
              <span className={cn('mt-[7px] h-1.5 w-1.5 flex-none rounded-full', DOT[s.status])} aria-hidden="true" />
              <div className="min-w-0">
                <div className="truncate text-[13px] text-ink-2">{s.name}</div>
                <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-3">
                  {s.role} · {ago(s.issuedAt)}
                </div>
              </div>
            </li>
          ))}
        </ul>

        <p className="mt-8 max-w-measure text-[12.5px] leading-relaxed text-ink-3">
          WeatherGPT is a decision-support tool. It surfaces official warnings issued by IMD, CWC
          and state authorities — it does not issue them. Always follow instructions from your
          district administration.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
          <span>SIH26068</span>
          <span className="text-line">/</span>
          <span>Phases 1–3</span>
          <span className="text-line">/</span>
          <span>{mode === 'live' ? 'Live data' : 'Demo data'}</span>
        </div>
      </div>
    </footer>
  )
}
