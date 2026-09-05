import { NavLink } from 'react-router-dom'
import { cn } from '../lib/utils'
import { t } from '../lib/i18n'
import Icon from '../ui/Icon'
import { Shell } from '../ui/Bits'

const ICONS = {
  '/': 'cloud',
  '/forecast': 'chart',
  '/alerts': 'alert',
  '/farm': 'sprout',
  '/tasks': 'calendar',
  '/journal': 'layers',
  '/insights': 'gauge',
  '/chat': 'message',
}

/**
 * Primary navigation tabs with multilingual support.
 */
export default function TabNav({
  warningCount = 0,
  location,
  onChangeLocation,
  audience = 'everyone',
  lang = 'en',
}) {
  const isFarm = audience === 'farm'
  const placeName = location?.name || location?.district || t('changeLocation', lang)

  // Build localized tabs
  const navItems = isFarm
    ? [
        { to: '/', label: t('tabToday', lang), end: true },
        { to: '/farm', label: t('tabFarm', lang) },
        { to: '/tasks', label: t('tabTasks', lang) },
        { to: '/journal', label: t('tabJournal', lang) },
        { to: '/insights', label: t('tabInsights', lang) },
        { to: '/forecast', label: t('tabForecast', lang) },
        { to: '/alerts', label: t('tabAlerts', lang) },
        { to: '/chat', label: t('tabKrishivaani', lang) },
      ]
    : [
        { to: '/', label: t('tabToday', lang), end: true },
        { to: '/forecast', label: t('tabForecast', lang) },
        { to: '/alerts', label: t('tabAlerts', lang) },
        { to: '/chat', label: t('tabAkashvaani', lang) },
      ]

  return (
    <div className="hidden border-b border-line bg-surface md:block">
      <Shell className="flex items-center justify-between gap-4">
        {/* Navigation Tabs */}
        <nav className="rail-x flex items-center gap-1" aria-label="Primary">
          {navItems.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                cn(
                  'relative flex flex-none items-center gap-2 px-3.5 py-3.5 text-caption font-medium transition-colors duration-150',
                  isActive ? 'text-ink font-semibold' : 'text-ink-3 hover:text-ink-2',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon name={ICONS[n.to]} size={16} className={isActive ? 'text-accent' : undefined} />
                  <span>{n.label}</span>
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

        {/* Location Pill */}
        {onChangeLocation && (
          <button
            type="button"
            onClick={onChangeLocation}
            title={`${t('changeLocation', lang)}: ${placeName}`}
            className="flex flex-none items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-1 text-caption font-medium text-ink shadow-sm transition-all duration-150 hover:border-accent hover:bg-sunk hover:shadow focus-visible:outline-accent"
          >
            <Icon name="pin" size={15} className="text-accent flex-none" />
            <span className="max-w-[170px] truncate text-[13px] font-medium text-ink tracking-tight">
              {placeName}
            </span>
          </button>
        )}
      </Shell>
    </div>
  )
}
