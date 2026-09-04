import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useActiveWarnings, useData } from '../lib/DataContext'
import TopBar from './TopBar'
import TabNav from './TabNav'
import MobileNav from './MobileNav'
import Footer from './Footer'

/**
 * The chrome. Sticky header (mark, search, controls) over a tab row on
 * desktop; the same header over a thumb-reachable bar at the bottom on a
 * phone. The header is sticky because the location control lives in it, and
 * "which place am I looking at?" is the question you need answerable from
 * anywhere on a long page.
 */
export default function AppShell({ children, ...bar }) {
  const { pathname } = useLocation()
  const warnings = useActiveWarnings()
  const data = useData()
  const location = bar.picker?.location || data?.location

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [pathname])

  return (
    <div className="flex min-h-screen flex-col bg-ground">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[300] focus:rounded-md focus:bg-accent focus:px-3 focus:py-2 focus:text-caption focus:text-on-accent"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-[60]">
        <TopBar {...bar} activeLocation={location} />
        <TabNav warningCount={warnings.length} location={location} onChangeLocation={bar.onChangeLocation} />
      </header>

      {/* keyed so each screen animates in rather than snapping */}
      <main id="main" key={pathname} className="flex-1 animate-fade pb-[76px] md:pb-0">
        {children}
      </main>

      <Footer />
      <MobileNav warningCount={warnings.length} />
    </div>
  )
}
