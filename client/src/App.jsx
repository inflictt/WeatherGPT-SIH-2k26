import { Suspense, lazy, useState } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { DataProvider } from './lib/DataContext'
import { useLocationPicker } from './lib/useLocationPicker'
import { usePreferences } from './lib/usePreferences'
import AppShell from './components/layout/AppShell'
import ErrorBoundary from './components/ui/ErrorBoundary'
import UpdatePrompt from './components/layout/UpdatePrompt'
import Home from './pages/Home'
import Chat from './pages/Chat'
import Alerts from './pages/Alerts'
import Settings from './pages/Settings'

/**
 * Leaflet is ~46 kB gzipped — more than the rest of the app put together, and
 * this product's users are on slow mobile connections. Splitting it out keeps
 * the Today screen (the one that carries the warning) fast, and pays the cost
 * only when someone actually opens the map.
 */
const MapView = lazy(() => import('./pages/MapView'))

function RouteFallback() {
  return (
    <div className="shell py-16 text-center" aria-busy="true">
      <p className="font-mono text-[10px] uppercase tracking-[0.13em] text-ink-3">Loading map…</p>
    </div>
  )
}

/**
 * HashRouter keeps deep links working on static hosting without a rewrite rule.
 *
 * The boundary wraps the routed screen, not the whole app — deliberately. A bug
 * in the map must not take down the warning banner with it, and the banner is
 * the one thing that has to survive every other failure.
 *
 * Everything held here is held because it is a *fetch input*, not screen state:
 * the chosen place, the language, the persona, and the preferences that change
 * what gets rendered. Each has to reach `DataProvider` rather than only the
 * component that draws its control — which is precisely the bug the location
 * picker fixes, and the one the preference store fixes for the Settings
 * toggles.
 */
export default function App() {
  const picker = useLocationPicker()
  const prefs = usePreferences()
  const [lang, setLang] = useState(() => prefs.value.language)
  const [persona, setPersona] = useState(() => prefs.value.persona)

  const changeLang = (l) => {
    setLang(l)
    prefs.set('language', l)
  }
  const changePersona = (p) => {
    setPersona(p)
    prefs.set('persona', p)
  }

  return (
    <HashRouter>
      <DataProvider query={picker.asQuery} persona={persona} lang={lang}>
        <AppShell lang={lang} setLang={changeLang} picker={picker} prefs={prefs.value} setPrefs={prefs.set}>
          <ErrorBoundary>
            <Routes>
              <Route
                path="/"
                element={
                  <Home persona={persona} setPersona={changePersona} prefs={prefs.value} />
                }
              />
              <Route path="/chat" element={<Chat lang={lang} prefs={prefs.value} />} />
              <Route path="/alerts" element={<Alerts lang={lang} prefs={prefs.value} />} />
              <Route
                path="/map"
                element={
                  <Suspense fallback={<RouteFallback />}>
                    <MapView prefs={prefs.value} />
                  </Suspense>
                }
              />
              <Route
                path="/settings"
                element={
                  <Settings
                    lang={lang}
                    setLang={changeLang}
                    persona={persona}
                    setPersona={changePersona}
                    prefs={prefs}
                    picker={picker}
                  />
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ErrorBoundary>
          <UpdatePrompt />
        </AppShell>
      </DataProvider>
    </HashRouter>
  )
}
