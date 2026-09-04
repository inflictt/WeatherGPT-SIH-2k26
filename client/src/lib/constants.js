/**
 * Domain constants shared across the UI.
 * These mirror §7 and §8 of the PRD — IMD's published categories and the
 * CAP severity ladder — so the interface and the risk engine speak the same
 * language once Phase 3 lands.
 */

/** IMD colour code → how it should look and read. */
export const SEVERITY = {
  green: {
    key: 'green',
    label: 'Green',
    action: 'No action needed',
    text: 'text-sev-green',
    bg: 'bg-sev-green',
    ring: 'border-sev-green/35',
    wash: 'bg-sev-green/[0.07]',
  },
  yellow: {
    key: 'yellow',
    label: 'Yellow',
    action: 'Be aware',
    text: 'text-sev-yellow',
    bg: 'bg-sev-yellow',
    ring: 'border-sev-yellow/35',
    wash: 'bg-sev-yellow/[0.07]',
  },
  orange: {
    key: 'orange',
    label: 'Orange',
    action: 'Be prepared',
    text: 'text-sev-orange',
    bg: 'bg-sev-orange',
    ring: 'border-sev-orange/40',
    wash: 'bg-sev-orange/[0.08]',
  },
  red: {
    key: 'red',
    label: 'Red',
    action: 'Take action',
    text: 'text-sev-red',
    bg: 'bg-sev-red',
    ring: 'border-sev-red/45',
    wash: 'bg-sev-red/[0.09]',
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

export const NAV = [
  { to: '/', label: 'Today', end: true },
  { to: '/chat', label: 'Ask' },
  { to: '/alerts', label: 'Alerts' },
  { to: '/map', label: 'Map' },
  { to: '/dev', label: 'Dev / Telemetry' },
  { to: '/settings', label: 'Settings' },
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
  { key: 'farmer', label: '🌾 Farmer (Agromet)', blurb: 'Irrigation, spraying and harvest timing.' },
  { key: 'marine', label: '⛵ Fishermen / Coast', blurb: 'IMD small-craft warning, wave swell and gale thresholds.' },
  { key: 'traveller', label: '🚗 Traveller / Road', blurb: 'Road conditions, visibility and gusts.' },
  { key: 'official', label: '🏙️ City Admin', blurb: 'Block-level alerts and waterlogging triggers.' },
]
