import LocationPicker from './LocationPicker'
import LangToggle from './LangToggle'
import ThemeToggle from './ThemeToggle'

/**
 * The phone header: place switcher, language, theme. Navigation is not here —
 * it lives in the bottom tab bar, where a thumb can reach it.
 *
 * The place switcher gets the whole remaining width because it is the one
 * control someone actually reaches for repeatedly, and because a truncated
 * "Gautam Buddha…" is a worse header than a wide one.
 */
export default function MobileTopBar({ lang, setLang, picker, resolved, toggleTheme }) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-ground/90 backdrop-blur-xl lg:hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 sm:px-5">
        <LocationPicker picker={picker} className="min-w-0 flex-1" />
        <LangToggle lang={lang} setLang={setLang} />
        <ThemeToggle resolved={resolved} toggle={toggleTheme} />
      </div>
    </header>
  )
}
