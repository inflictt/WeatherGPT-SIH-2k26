import { NavLink } from 'react-router-dom'
import { cn } from '../lib/utils'
import { t } from '../lib/i18n'
import Icon from '../ui/Icon'

const ICONS = {
  '/': 'cloud',
  '/forecast': 'chart',
  '/alerts': 'alert',
  '/farm': 'sprout',
  '/tasks': 'calendar',
  '/insights': 'gauge',
  '/chat': 'message',
}

/**
 * Mobile bottom bar with dynamic multilingual tabs.
 */
export default function MobileNav({ warningCount = 0, audience = 'everyone', lang = 'en' }) {
  const isFarm = audience === 'farm'
  const navItems = isFarm
    ? [
        { to: '/', short: t('tabToday', lang), end: true },
        { to: '/farm', short: t('tabFarmShort', lang) },
        { to: '/tasks', short: t('tabTasksShort', lang) },
        { to: '/insights', short: t('tabInsightsShort', lang) },
        { to: '/chat', short: t('tabAskShortFarmer', lang) },
      ]
    : [
        { to: '/', short: t('tabToday', lang), end: true },
        { to: '/forecast', short: t('tabForecast', lang) },
        { to: '/alerts', short: t('tabAlerts', lang) },
        { to: '/chat', short: t('tabAskShortGeneral', lang) },
      ]

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur-xl md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className={cn('grid', navItems.length === 4 ? 'grid-cols-4' : 'grid-cols-5')}>
        {navItems.map((n) => (
          <li key={n.to}>
            <NavLink
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                cn(
                  'flex min-h-[54px] flex-col items-center justify-center gap-1 py-2 transition-colors duration-150',
                  isActive ? 'text-accent font-semibold' : 'text-ink-3',
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
                      'text-label font-medium uppercase tracking-normal min-[360px]:tracking-[0.05em]',
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
