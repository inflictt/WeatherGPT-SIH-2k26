import { NavLink } from 'react-router-dom'
import { NAV } from '../lib/constants'
import { cn } from '../lib/utils'
import Icon from '../ui/Icon'

const ICONS = {
  '/': 'cloud',
  '/forecast': 'chart',
  '/alerts': 'alert',
  '/farm': 'sprout',
  '/chat': 'message',
}

/**
 * The phone tab bar. Five items, thumb-reachable, with the safe-area inset
 * respected so the last row of labels is not under a home indicator.
 *
 * Labels stay on the 11px scale at every width; it is the *tracking* that goes
 * at 320px, where 0.14em across five words is what pushes the row past the
 * bezel.
 */
export default function MobileNav({ warningCount = 0 }) {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur-xl md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="grid grid-cols-5">
        {NAV.map((n) => (
          <li key={n.to}>
            <NavLink
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                cn(
                  'flex min-h-[54px] flex-col items-center justify-center gap-1 py-2 transition-colors duration-150',
                  isActive ? 'text-accent' : 'text-ink-3',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span className="relative">
                    <Icon name={ICONS[n.to]} size={19} />
                    {n.to === '/alerts' && warningCount > 0 && (
                      <span className="absolute -right-2 -top-1.5 grid h-[15px] min-w-[15px] place-items-center rounded-full bg-sev-orange px-[3px] font-mono text-[9px] font-medium text-on-sev">
                        {warningCount}
                      </span>
                    )}
                  </span>
                  <span
                    className={cn(
                      'text-label font-medium uppercase tracking-normal min-[360px]:tracking-[0.1em]',
                      isActive && 'text-accent',
                    )}
                  >
                    {n.short}
                  </span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
