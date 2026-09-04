import { Link } from 'react-router-dom'
import { useData } from '../lib/DataContext'
import { Shell } from '../ui/Bits'
import { t } from '../lib/i18n'

export default function Footer({ lang = 'en' }) {
  const { mode, degraded } = useData()
  const live = mode === 'live'

  const secondaryNav = [
    { to: '/map', label: t('warningMap', lang) },
    { to: '/settings', label: t('settings', lang) },
  ]

  return (
    <footer className="mt-auto border-t border-line bg-surface pb-[84px] md:pb-0">
      <Shell className="flex flex-wrap items-center gap-x-6 gap-y-3 py-6">
        <span className="flex items-center gap-2">
          <span
            className={live && !degraded ? 'h-1.5 w-1.5 rounded-full bg-sev-green' : 'h-1.5 w-1.5 rounded-full bg-sev-yellow'}
            aria-hidden="true"
          />
          <span className="lbl">
            {live ? (degraded ? 'Live · degraded' : 'Live verified data') : 'Sample / Verified data'}
          </span>
        </span>

        <span className="lbl">IMD · NDMA Sachet · Open-Meteo</span>

        <nav className="ml-auto flex items-center gap-4" aria-label="Secondary">
          {secondaryNav.map((n) => (
            <Link key={n.to} to={n.to} className="lbl -my-2 inline-flex min-h-[44px] items-center transition-colors duration-150 hover:text-ink">
              {n.label}
            </Link>
          ))}
        </nav>
      </Shell>
    </footer>
  )
}
