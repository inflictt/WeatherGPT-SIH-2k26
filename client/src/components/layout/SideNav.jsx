import { NavLink, Link } from 'react-router-dom'
import { NAV } from '../../lib/constants'
import { cn } from '../../lib/utils'
import LangToggle from './LangToggle'
import ThemeToggle from './ThemeToggle'
import LocationPicker from './LocationPicker'

/**
 * The desktop rail, following the reference's left-sidebar shape.
 *
 * Two decisions worth naming. The location picker sits at the *top* of the
 * rail, above navigation, because every screen below it answers "what is the
 * weather **here**" — the place is the subject of the whole app, not a setting
 * buried in one page. And the icons carry text labels rather than relying on
 * glyphs alone: a cloud, a triangle and a map pin are not self-evident, and an
 * icon-only rail makes people hunt.
 *
 * Below `lg` this is not rendered at all; the mobile tab bar takes over, which
 * is the right shape for a thumb.
 */
const ICONS = {
  '/': 'M3 11.5 12 4l9 7.5M6 10v10h12V10',
  '/chat': 'M4 5h16v11H8l-4 4V5Z',
  '/alerts': 'M12 4 2.5 20h19L12 4Zm0 6v5m0 3h.01',
  '/map': 'M9 4 3 6.5v13L9 17l6 3 6-2.5v-13L15 7 9 4Zm0 0v13m6-10v13',
  '/settings':
    'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8-3a8 8 0 0 1-.1 1.2l2 1.6-2 3.4-2.4-1a8 8 0 0 1-2 1.2l-.4 2.6h-4l-.4-2.6a8 8 0 0 1-2-1.2l-2.4 1-2-3.4 2-1.6A8 8 0 0 1 4 12c0-.4 0-.8.1-1.2l-2-1.6 2-3.4 2.4 1a8 8 0 0 1 2-1.2L9 3h4l.4 2.6a8 8 0 0 1 2 1.2l2.4-1 2 3.4-2 1.6c.1.4.1.8.1 1.2Z',
}

export default function SideNav({ lang, setLang, picker, warningCount = 0, resolved, toggleTheme }) {
  return (
    <aside
      className="sticky top-0 hidden h-screen w-[240px] flex-none flex-col glass-panel border-r border-white/10 lg:flex"
      aria-label="Sidebar"
    >
      <div className="flex items-center gap-2.5 px-5 pb-4 pt-6">
        <Link to="/" className="flex min-h-[44px] items-center gap-3" aria-label="WeatherGPT home">
          <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-amber-400 text-slate-950 font-bold text-sm shadow-md shadow-amber-400/30">
            ⚡
          </span>
          <div className="flex flex-col">
            <span className="font-display text-[17px] font-semibold tracking-[-0.02em] text-ink">
              WeatherGPT
            </span>
            <span className="font-mono text-[9px] uppercase tracking-wider text-ink-3">
              Early Warning India
            </span>
          </div>
        </Link>
      </div>

      <div className="px-3 pb-4">
        <LocationPicker picker={picker} />
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 px-3" aria-label="Primary">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                'group relative flex min-h-[44px] items-center gap-3 rounded-lg px-3 py-2.5',
                'text-[13.5px] transition-colors duration-250 ease-out',
                isActive
                  ? 'bg-accent-dim text-ink'
                  : 'text-ink-3 hover:bg-raised hover:text-ink-2',
              )
            }
          >
            {({ isActive }) => (
              <>
                {/* The active marker is a rail, not a fill — it reads at a
                    glance without turning the item into a button. */}
                <span
                  aria-hidden="true"
                  className={cn(
                    'absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-r bg-accent transition-opacity duration-250',
                    isActive ? 'opacity-100' : 'opacity-0',
                  )}
                />
                <svg viewBox="0 0 24 24" className="h-[17px] w-[17px] flex-none" fill="none"
                  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d={ICONS[item.to]} />
                </svg>
                <span className="flex-1">{item.label}</span>

                {/* The count belongs on Alerts and nowhere else. */}
                {item.to === '/alerts' && warningCount > 0 && (
                  <span className="tnum flex-none rounded-full bg-sev-orange/15 px-1.5 py-0.5 font-mono text-[9.5px] text-sev-orange">
                    {warningCount}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="flex items-center justify-between gap-2 border-t border-line-soft px-3 py-3">
        <LangToggle lang={lang} setLang={setLang} />
        <ThemeToggle resolved={resolved} toggle={toggleTheme} />
      </div>
    </aside>
  )
}
