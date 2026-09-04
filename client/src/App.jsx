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
      /* private mode */
    }
    setChosen(true)
    setReopening(false)
  }, [])

  const [lang, setLang] = useState(() => prefs.value.language || 'en')
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
            audience={audience}
            setAudience={changeAudience}
            lang={lang}
            setLang={changeLang}
            onDone={closeGate}
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
              <Route path="/" element={<Today prefs={prefs.value} audience={audience} lang={lang} />} />
              <Route path="/forecast" element={<Forecast prefs={prefs.value} lang={lang} />} />
              <Route path="/alerts" element={<Alerts prefs={prefs.value} lang={lang} />} />
              <Route
                path="/farm"
                element={
                  <Farm
                    prefs={prefs.value}
                    audience={audience}
                    setAudience={changeAudience}
                    lang={lang}
                  />
                }
              />
              <Route path="/chat" element={<Ask lang={lang} prefs={prefs.value} audience={audience} />} />
              <Route
                path="/map"
                element={
                  <Suspense fallback={<RouteFallback />}>
                    <MapView prefs={prefs.value} lang={lang} />
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
