import { useCallback, useEffect, useState } from 'react'
import { CROP_STAGES } from './constants'

/**
 * The farm profile.
 *
 * Stored on the device, not on a server. Farm coordinates and crop records are
 * sensitive — they identify a household and its livelihood — and nothing here
 * needs a backend to be useful, so the default is local. Signing in to sync is
 * a later, opt-in step rather than the price of using the feature.
 *
 * The profile is deliberately *empty* until someone fills it in. A pre-filled
 * demo farm would make every recommendation on the Today screen look personal
 * when it was not, which is the same class of lie as an invented rainfall
 * figure.
 */
const KEY = 'wg-farm'

const EMPTY = {
  name: '',
  areaHa: '',
  soilType: '',
  soilConfidence: null,
  soilSource: null,
  irrigation: '',
  water: '',
  season: '',
  crops: [],
  observations: [],
}

function read() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : { ...EMPTY }
  } catch {
    return { ...EMPTY }
  }
}

function write(v) {
  try {
    localStorage.setItem(KEY, JSON.stringify(v))
  } catch {
    /* private mode — the session still works in memory */
  }
}

/** How much of the profile is filled in, as a percentage. */
export function completeness(farm) {
  const checks = [
    Boolean(farm.name),
    Boolean(farm.areaHa),
    Boolean(farm.soilType),
    Boolean(farm.irrigation),
    Boolean(farm.water),
    Boolean(farm.season),
    farm.crops.length > 0,
    farm.observations.length > 0,
  ]
  return Math.round((checks.filter(Boolean).length / checks.length) * 100)
}

/** Days between a sowing date and now, or null when the date is unusable. */
export function daysSince(iso) {
  if (!iso) return null
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return null
  return Math.max(0, Math.round((Date.now() - t) / 86400000))
}

/**
 * Crop stage from the sowing date.
 *
 * A rough, published-duration model, and it says so wherever it is shown. It
 * exists because "what should I do this week" is unanswerable without knowing
 * roughly where the crop is, and asking the farmer to re-enter the stage every
 * fortnight is worse than estimating it from a date they already gave.
 */
export function stageFor(crop) {
  const d = daysSince(crop.sownAt)
  if (d == null) return { key: 'planning', label: 'Planning', progress: 0, days: null }
  // Cumulative day thresholds for a ~140-day rabi cereal. Crops with very
  // different calendars need their own table before this is trusted for them.
  const marks = [0, 7, 14, 25, 55, 85, 110, 140]
  let idx = marks.findIndex((m, i) => d < (marks[i + 1] ?? Infinity))
  if (idx < 0) idx = CROP_STAGES.length - 1
  const stage = CROP_STAGES[Math.min(idx, CROP_STAGES.length - 1)]
  return {
    key: stage.key,
    label: stage.label,
    progress: Math.min(1, d / marks[marks.length - 1]),
    days: d,
  }
}

export function useFarm() {
  const [farm, setFarm] = useState(read)

  useEffect(() => {
    write(farm)
  }, [farm])

  const set = useCallback((patch) => setFarm((f) => ({ ...f, ...patch })), [])

  const addCrop = useCallback(
    (crop) =>
      setFarm((f) => ({
        ...f,
        crops: [...f.crops, { id: `c${Date.now()}`, name: '', variety: '', sownAt: '', ...crop }],
      })),
    [],
  )
  const updateCrop = useCallback(
    (id, patch) =>
      setFarm((f) => ({ ...f, crops: f.crops.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
    [],
  )
  const removeCrop = useCallback(
    (id) => setFarm((f) => ({ ...f, crops: f.crops.filter((c) => c.id !== id) })),
    [],
  )

  /** Every scan is logged, successful or not — the log is the audit trail. */
  const logObservation = useCallback(
    (o) =>
      setFarm((f) => ({
        ...f,
        observations: [{ id: `o${Date.now()}`, at: new Date().toISOString(), ...o }, ...f.observations].slice(0, 20),
      })),
    [],
  )

  const reset = useCallback(() => setFarm({ ...EMPTY }), [])

  return {
    farm,
    set,
    addCrop,
    updateCrop,
    removeCrop,
    logObservation,
    reset,
    completeness: completeness(farm),
    hasProfile: Boolean(farm.name || farm.crops.length),
  }
}

export default useFarm
