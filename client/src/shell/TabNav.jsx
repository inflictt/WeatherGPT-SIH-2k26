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
 * The primary tabs with active location badge. Desktop only — on a phone these
 * live in the thumb-reachable bar at the bottom.
 */
export default function TabNav({ warningCount = 0, location, onChangeLocation }) {
  const placeName = location?.name || location?.district || 'Select location'
  const subPlace =
    location?.state && location.state !== placeName
      ? location.state
      : location?.district && location.district !== placeName
      ? location.district
      : ''

  return (
    <div className="hidden border-b border-line bg-surface md:block">
      <Shell className="flex items-center justify-between gap-4">
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

        {/* --- Active location indicator --- */}
        {onChangeLocation && (
          <button
            type="button"
            onClick={onChangeLocation}
            title={`Current location: ${placeName} (Click to change)`}
            className="flex flex-none items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-1 text-caption font-medium text-ink shadow-sm transition-all duration-150 hover:border-accent hover:bg-sunk hover:shadow focus-visible:outline-accent"
          >
            <Icon name="pin" size={15} className="text-accent flex-none" />
            <span className="text-[13px] font-medium text-ink tracking-tight">
              {placeName}
            </span>
          </button>
        )}
      </Shell>
    </div>
  )
}
