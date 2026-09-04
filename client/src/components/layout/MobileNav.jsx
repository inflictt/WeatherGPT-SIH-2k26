import { NavLink } from 'react-router-dom'
import { NAV } from '../../lib/constants'
import { cn } from '../../lib/utils'

const ICONS = {
  '/': 'M3 11.5 12 4l9 7.5M6 10v10h12V10',
  '/chat': 'M4 5h16v11H8l-4 4V5Z',
  '/alerts': 'M12 4 2.5 20h19L12 4Zm0 6v5m0 3h.01',
  '/map': 'M9 4 3 6.5v13L9 17l6 3 6-2.5v-13L15 7 9 4Zm0 0v13m6-10v13',
  '/settings': 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8-3a8 8 0 0 1-.1 1.2l2 1.6-2 3.4-2.4-1a8 8 0 0 1-2 1.2l-.4 2.6h-4l-.4-2.6a8 8 0 0 1-2-1.2l-2.4 1-2-3.4 2-1.6A8 8 0 0 1 4 12c0-.4 0-.8.1-1.2l-2-1.6 2-3.4 2.4 1a8 8 0 0 1 2-1.2L9 3h4l.4 2.6a8 8 0 0 1 2 1.2l2.4-1 2 3.4-2 1.6c.1.4.1.8.1 1.2Z',
}

export default function MobileNav() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-ground/90 backdrop-blur-xl md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Primary"
    >
      <ul className="grid grid-cols-5">
        {NAV.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-1 py-2.5 transition-colors duration-250',
                  isActive ? 'text-ink' : 'text-ink-3',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span className="relative">
                    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none"
                      stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                      <path d={ICONS[item.to]} />
                    </svg>
                    <span className={cn(
                      'absolute -top-1.5 left-1/2 h-px w-4 -translate-x-1/2 bg-accent transition-opacity duration-300',
                      isActive ? 'opacity-100' : 'opacity-0',
                    )} />
                  </span>
                  <span className="font-mono text-[9px] uppercase tracking-[0.1em]">{item.label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
