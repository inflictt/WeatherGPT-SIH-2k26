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
            title={`Current location: ${placeName}${subPlace ? `, ${subPlace}` : ''} (Click to change)`}
            className="group flex flex-none items-center gap-2 rounded-lg border border-line bg-sunk/60 px-3 py-1.5 text-left transition-all duration-150 hover:border-accent/40 hover:bg-surface hover:shadow-subtle focus-visible:outline-accent"
          >
            <span className="grid h-6 w-6 flex-none place-items-center rounded-md bg-accent/10 text-accent transition-colors group-hover:bg-accent group-hover:text-on-accent">
              <Icon name="pin" size={13} />
            </span>
            <div className="flex flex-col text-left">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] uppercase font-mono tracking-wider text-ink-3 group-hover:text-accent font-semibold transition-colors">
                  Location
                </span>
                <span className="text-[10px] text-ink-3 font-normal">·</span>
                <span className="text-[10px] text-accent font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  Change
                </span>
              </div>
              <span className="max-w-[200px] truncate text-[12px] font-semibold text-ink leading-tight">
                {placeName}
                {subPlace && (
                  <span className="font-normal text-ink-3 ml-1 text-[11px]">({subPlace})</span>
                )}
              </span>
            </div>
          </button>
        )}
      </Shell>
    </div>
  )
}
