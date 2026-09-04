import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import useTheme from '../../lib/useTheme'
import { useActiveWarnings } from '../../lib/DataContext'
import DynamicBackdrop from './DynamicBackdrop'
import SideNav from './SideNav'
import MobileNav from './MobileNav'
import TopHeader from './TopHeader'
import Footer from './Footer'

export default function AppShell({ children, lang, setLang, picker, prefs, setPrefs }) {
  const { resolved, toggle: toggleTheme } = useTheme()
  const { pathname } = useLocation()
  const warnings = useActiveWarnings()

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [pathname])

  return (
    <div className="relative flex min-h-screen">
      {/* Immersive Dynamic Weather Atmospheric Wallpaper */}
      <DynamicBackdrop />

      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded focus:bg-accent focus:px-3 focus:py-2 focus:text-[13px] focus:text-on-accent"
      >
        Skip to content
      </a>

      <SideNav
        lang={lang}
        setLang={setLang}
        picker={picker}
        warningCount={warnings.length}
        resolved={resolved}
        toggleTheme={toggleTheme}
      />

      <div className="flex min-w-0 flex-1 flex-col pb-16 lg:pb-0">
        <TopHeader
          lang={lang}
          setLang={setLang}
          picker={picker}
          resolved={resolved}
          toggleTheme={toggleTheme}
          prefs={prefs}
          setPrefs={setPrefs}
        />

        {/* Route view with fade animation */}
        <main id="main" key={pathname} className="flex-1 animate-fade">
          {children}
        </main>

        <Footer />
      </div>

      <MobileNav />
    </div>
  )
}
