import { useCallback, useEffect, useState } from 'react'

/**
 * User preferences, in one place, persisted, and actually consulted.
 *
 * Every one of these was previously `useState` inside Settings — so the
 * controls moved, looked like they worked, and changed nothing. A control that
 * visibly does nothing is worse than no control: it teaches people the app
 * lies. Each key below names where it is *read*, and if a key ever stops being
 * read, the control should be deleted rather than left as decoration.
 *
 *   language      App → DataProvider (composed answer language) and every t()
 *   persona       App → DataProvider (which advice is composed)
 *   units         Hero, HourlyStrip, DailyList — °C/km/h vs °F/mph
 *   severeOnly    Alerts (filters the list), push subscription minSeverity
 *   voiceReplies  Chat (whether a spoken question gets a spoken answer)
 *   dataSaver     MapView (skips tiles), Reveal (skips motion)
 */

const KEY = 'wg-preferences'

export const DEFAULTS = {
  language: 'en',
  persona: 'farmer',
  units: 'metric',
  severeOnly: true,
  voiceReplies: true,
  dataSaver: false,
}

function read() {
  try {
    const raw = localStorage.getItem(KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    // Merge over defaults so a preference added later does not arrive undefined
    // for everyone who already has a stored blob.
    return { ...DEFAULTS, ...(parsed && typeof parsed === 'object' ? parsed : {}) }
  } catch {
    return { ...DEFAULTS }
  }
}

export function usePreferences() {
  const [value, setValue] = useState(read)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(value))
    } catch {
      /* private mode or quota; the session still honours them in memory */
    }
  }, [value])

  const set = useCallback((key, next) => {
    setValue((prev) => ({ ...prev, [key]: next }))
  }, [])

  const toggle = useCallback((key) => {
    setValue((prev) => ({ ...prev, [key]: !prev[key] }))
  }, [])

  const reset = useCallback(() => setValue({ ...DEFAULTS }), [])

  return { value, set, toggle, reset }
}

/* ------------------------------------------------------------------ units --
 * Metric follows IMD's own conventions, which is why it is the default and why
 * the *thresholds* are never converted — 64.5 mm is a published category
 * boundary, not a display choice. Only what the user reads is converted.
 * ------------------------------------------------------------------------- */

export const toF = (c) => (c == null ? null : Math.round((c * 9) / 5 + 32))
export const toMph = (kmh) => (kmh == null ? null : Math.round(kmh * 0.621371))
export const toInches = (mm) => (mm == null ? null : Number((mm / 25.4).toFixed(2)))
export const toMiles = (km) => (km == null ? null : Number((km * 0.621371).toFixed(1)))

/** `fmt.temp(27)` → "27" or "81", and `fmt.tempUnit` → "°C" or "°F". */
export function formatters(units = 'metric') {
  const imperial = units === 'imperial'
  return {
    imperial,
    temp: (c) => (c == null ? null : imperial ? toF(c) : Math.round(c)),
    tempUnit: imperial ? '°F' : '°C',
    speed: (kmh) => (kmh == null ? null : imperial ? toMph(kmh) : Math.round(kmh)),
    speedUnit: imperial ? 'mph' : 'km/h',
    rain: (mm) => (mm == null ? null : imperial ? toInches(mm) : Number(mm.toFixed(1))),
    rainUnit: imperial ? 'in' : 'mm',
    distance: (km) => (km == null ? null : imperial ? toMiles(km) : km),
    distanceUnit: imperial ? 'mi' : 'km',
  }
}

export default usePreferences
