import { NavLink } from 'react-router-dom'
import { NAV } from '../lib/constants'
import { cn } from '../lib/utils'
import Icon from '../ui/Icon'
import { Shell } from '../ui/Bits'

const ICONS = {
  '/': 'cloud',
  '/forecast': 'chart',
  '/alerts': 'alert',
  '/farm': 'sprout',
  '/chat': 'message',
}

/**
 * The primary tabs. Desktop only — on a phone these live in the thumb-reachable
 * bar at the bottom, which is a different shape for a different input device
 * rather than the same row squeezed.
 */
export default function TabNav({ warningCount = 0 }) {
  return (
    <div className="hidden border-b border-line bg-surface md:block">
      <Shell>
        <nav className="rail-x flex items-center gap-1" aria-label="Primary">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                cn(
                  'relative flex flex-none items-center gap-2 px-3 py-3.5 text-caption font-medium transition-colors duration-150',
                  isActive ? 'text-ink' : 'text-ink-3 hover:text-ink-2',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon name={ICONS[n.to]} size={16} className={isActive ? 'text-accent' : undefined} />
                  {n.label}
                  {n.to === '/alerts' && warningCount > 0 && (
                    <span className="tnum grid h-[18px] min-w-[18px] place-items-center rounded-full bg-sev-orange px-1 font-mono text-[10px] font-medium text-on-sev">
                      {warningCount}
                    </span>
                  )}
                  <span
                    aria-hidden="true"
                    className={cn(
                      'absolute inset-x-2 -bottom-px h-0.5 origin-left rounded-full bg-accent transition-transform duration-300 ease-out',
                      isActive ? 'scale-x-100' : 'scale-x-0',
                    )}
                  />
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </Shell>
    </div>
  )
}
