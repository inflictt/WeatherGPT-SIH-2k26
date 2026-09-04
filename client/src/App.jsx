import { Suspense, lazy, useCallback, useState } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { DataProvider } from './lib/DataContext'
import { useLocationPicker } from './lib/useLocationPicker'
import { usePreferences } from './lib/usePreferences'
import useTheme from './lib/useTheme'
import AppShell from './shell/AppShell'
import LocationGate from './shell/LocationGate'
import ErrorBoundary from './ui/ErrorBoundary'
import { Shell } from './ui/Bits'
import Today from './screens/Today'
import Forecast from './screens/Forecast'
import Alerts from './screens/Alerts'
import Farm from './screens/Farm'
import Ask from './screens/Ask'
import Settings from './screens/Settings'

/**
 * Leaflet is ~46 kB gzipped — more than the rest of the app put together, and
 * this product's users are on slow connections. Splitting it out keeps the
 * Today screen (the one carrying the warning) fast and pays the cost only when
 * someone actually opens the map.
 */
const MapView = lazy(() => import('./screens/MapView'))

function RouteFallback() {
  return (
    <Shell className="py-16 text-center" aria-busy="true">
      <p className="lbl">Loading map…</p>
    </Shell>
  )
}

const GATE_KEY = 'wg-location-chosen'

export default function App() {
  const picker = useLocationPicker()
  const prefs = usePreferences()
  const theme = useTheme()

  // The gate is not a preference — it is a precondition. Everything this
  // product computes is for one place, and there is no honest default, so the
  // app does not start until someone has chosen. `chosen` is stored separately
  // from the location itself so that "never asked" and "asked, picked the
  // sample's home district" stay distinguishable.
  const [chosen, setChosen] = useState(() => {
    try {
      return localStorage.getItem(GATE_KEY) === '1'
    } catch {
      return false
    }
  })
  const [reopening, setReopening] = useState(false)

  const closeGate = useCallback(() => {
    try {
      localStorage.setItem(GATE_KEY, '1')
    } catch {
      /* private mode: the session still works, the gate just returns next time */
    }
    setChosen(true)
    setReopening(false)
  }, [])

  const [lang, setLang] = useState(() => prefs.value.language)
  const [audience, setAudience] = useState(() =>
    prefs.value.persona === 'farmer' ? 'farm' : 'everyone',
  )

  const changeLang = (l) => {
    setLang(l)
    prefs.set('language', l)
  }
  const changeAudience = (a) => {
    setAudience(a)
    prefs.set('persona', a === 'farm' ? 'farmer' : 'general')
  }
  const changeUnits = (u) => prefs.set('units', u)

  const gateOpen = !chosen || reopening

  return (
    <HashRouter>
      <DataProvider
        query={picker.asQuery}
        persona={audience === 'farm' ? 'farmer' : 'general'}
        lang={lang}
      >
        {gateOpen && (
          <LocationGate
            picker={picker}
            onDone={closeGate}
            // Escape only closes it when a place already exists to fall back
            // on. On a first visit there is nothing behind the gate to return
            // to, so it stays put.
            onCancel={chosen ? () => setReopening(false) : undefined}
          />
        )}

        <AppShell
          picker={picker}
          lang={lang}
          setLang={changeLang}
          units={prefs.value.units}
          setUnits={changeUnits}
          audience={audience}
          setAudience={changeAudience}
          theme={theme.resolved}
          toggleTheme={theme.toggle}
          onChangeLocation={() => setReopening(true)}
        >
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<Today prefs={prefs.value} audience={audience} />} />
              <Route path="/forecast" element={<Forecast prefs={prefs.value} />} />
              <Route path="/alerts" element={<Alerts prefs={prefs.value} lang={lang} />} />
              <Route path="/farm" element={<Farm prefs={prefs.value} />} />
              <Route path="/chat" element={<Ask lang={lang} prefs={prefs.value} audience={audience} />} />
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
                    prefs={prefs}
                    lang={lang}
                    setLang={changeLang}
                    audience={audience}
                    setAudience={changeAudience}
                    picker={picker}
                    onChangeLocation={() => setReopening(true)}
                  />
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ErrorBoundary>
        </AppShell>
      </DataProvider>
    </HashRouter>
  )
}
