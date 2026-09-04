/**
 * Domain constants shared across the UI.
 * These mirror §7 and §8 of the PRD — IMD's published categories and the
 * CAP severity ladder — so the interface and the risk engine speak the same
 * language once Phase 3 lands.
 */

/**
 * IMD colour code → how it should look and read.
 *
 * Every class here is a **literal string**, and it has to stay that way.
 * Tailwind's JIT builds the stylesheet by scanning source text for class
 * names; a class assembled at runtime is never generated, so it silently
 * resolves to nothing. `ring.replace('border-', 'border-l-')` did exactly
 * that — three components asked for a coloured hazard stripe and got a
 * transparent one, in a product whose one visual rule is that colour means
 * hazard. Hence `edge`, spelled out, rather than derived.
 */
export const SEVERITY = {
  green: {
    key: 'green',
    label: 'Green',
    action: 'No action needed',
    text: 'text-sev-green',
    bg: 'bg-sev-green',
    ring: 'border-sev-green/45',
    edge: 'border-l-sev-green',
    wash: 'bg-sev-green-w',
  },
  yellow: {
    key: 'yellow',
    label: 'Yellow',
    action: 'Be aware',
    text: 'text-sev-yellow',
    bg: 'bg-sev-yellow',
    ring: 'border-sev-yellow/45',
    edge: 'border-l-sev-yellow',
    wash: 'bg-sev-yellow-w',
  },
  orange: {
    key: 'orange',
    label: 'Orange',
    action: 'Be prepared',
    text: 'text-sev-orange',
    bg: 'bg-sev-orange',
    ring: 'border-sev-orange/45',
    edge: 'border-l-sev-orange',
    wash: 'bg-sev-orange-w',
  },
  red: {
    key: 'red',
    label: 'Red',
    action: 'Take action',
    text: 'text-sev-red',
    bg: 'bg-sev-red',
    ring: 'border-sev-red/45',
    edge: 'border-l-sev-red',
    wash: 'bg-sev-red-w',
  },
}

/** Risk bands, ordered. Index doubles as comparison weight. */
export const RISK_BANDS = ['LOW', 'MODERATE', 'HIGH', 'EXTREME']

/** Risk band → severity colour, so risk and warnings never clash visually. */
export const RISK_TONE = {
  LOW: 'green',
  MODERATE: 'yellow',
  HIGH: 'orange',
  EXTREME: 'red',
}

/** Forecast confidence. Deliberately not colour-coded — it is not a hazard. */
export const CONFIDENCE = {
  HIGH: { label: 'High', bars: 3 },
  MEDIUM: { label: 'Medium', bars: 2 },
  LOW: { label: 'Low', bars: 1 },
}

/** IMD 24-hour rainfall categories (mm). Shown in the UI as the legend. */
export const RAINFALL_BANDS = [
  { name: 'Light–moderate', range: '< 64.5', tone: 'green' },
  { name: 'Heavy', range: '64.5 – 115.5', tone: 'yellow' },
  { name: 'Very heavy', range: '115.6 – 204.4', tone: 'orange' },
  { name: 'Extremely heavy', range: '≥ 204.5', tone: 'red' },
]

/**
 * The primary tabs, in the design's order.
 *
 * `Today` is the brief — what to do — and `Forecast` is the detail behind it.
 * Splitting them is what lets the Today screen open with a sentence instead of
 * a wall of figures, which is the whole point of the redesign.
 *
 * Map and Settings are deliberately *not* tabs. Seven items do not fit one row
 * on a 1024px screen without shrinking the type below the scale, and both are
 * places you visit occasionally rather than move between — so they live as
 * icon buttons in the top bar, and in the "More" sheet on a phone.
 */
export const NAV = [
  { to: '/', label: 'Today', short: 'Today', end: true },
  { to: '/forecast', label: 'Forecast', short: 'Forecast' },
  { to: '/alerts', label: 'Alerts', short: 'Alerts' },
  { to: '/farm', label: 'Farm Connect', short: 'Farm' },
  { to: '/chat', label: "Farmer's Friend", short: 'Ask' },
]

/** Reachable from the top bar and the mobile "More" sheet, never a tab. */
export const SECONDARY_NAV = [
  { to: '/map', label: 'Warning map' },
  { to: '/settings', label: 'Settings' },
]

/**
 * Who the interface is speaking to. The design puts this beside the unit
 * toggle, which is right: it changes what the whole product emphasises, not
 * just the wording of one card.
 *
 *   everyone  weather, warnings, what to wear and whether to travel
 *   farm      the same data read as irrigation, spraying and harvest windows
 */
export const AUDIENCES = [
  { key: 'everyone', label: 'Everyone' },
  { key: 'farm', label: 'Farm' },
]

/** Crop lifecycle stages, in order. Used by the planner and the brief. */
export const CROP_STAGES = [
  { key: 'planning', label: 'Planning' },
  { key: 'preparation', label: 'Soil preparation' },
  { key: 'sowing', label: 'Sowing' },
  { key: 'germination', label: 'Germination' },
  { key: 'vegetative', label: 'Vegetative growth' },
  { key: 'flowering', label: 'Flowering' },
  { key: 'filling', label: 'Grain filling' },
  { key: 'harvest', label: 'Harvest' },
]

export const LANGUAGES = [
  { code: 'en', label: 'English', native: 'English', short: 'EN', ready: true,
    blurb: 'Plain English.' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी', short: 'हिं', ready: true,
    blurb: 'Devanagari, in and out.' },
  // `tiny` is the label used where the header has no room for the full word;
  // see LangToggle. Only Hinglish needs one — EN and हिं are already short.
  { code: 'hinglish', label: 'Hinglish', native: 'Hinglish', short: 'Hinglish', tiny: 'HIN', ready: true,
    blurb: 'Hindi in Latin script — "kal barish hogi kya".' },
  { code: 'mr', label: 'Marathi', native: 'मराठी', short: 'मरा', ready: false },
  { code: 'bn', label: 'Bengali', native: 'বাংলা', short: 'বাং', ready: false },
  { code: 'ta', label: 'Tamil', native: 'தமிழ்', short: 'தமி', ready: false },
]

/** Languages the toggle in the header offers. The rest live in Settings. */
export const ACTIVE_LANGUAGES = LANGUAGES.filter((l) => l.ready)

export const PERSONAS = [
  { key: 'general', label: 'General', blurb: 'Plain answers about your day.' },
  { key: 'farmer', label: 'Farmer', blurb: 'Irrigation, spraying and harvest timing.' },
  { key: 'traveller', label: 'Traveller', blurb: 'Road conditions, visibility and gusts.' },
  { key: 'official', label: 'Local admin', blurb: 'Block-level alerts ranked by severity.' },
]
