/**
 * PHASE 1 MOCK DATA
 * -----------------
 * Every shape here matches the response contracts in §10 and §12 of the PRD,
 * so Phase 2 replaces this module with real fetches and nothing above it moves.
 * Values are realistic for a Rajasthan monsoon evening and sit deliberately in
 * IMD's "very heavy" band so the safety floor is visible in the demo.
 */

const now = new Date()
const iso = (hoursFromNow) => new Date(now.getTime() + hoursFromNow * 3600e3).toISOString()

export const LOCATION = {
  id: 'loc_kapriwas',
  name: 'Kapriwas',
  district: 'Rewari',
  state: 'Haryana',
  lat: 28.2435,
  lon: 76.8453,
  kind: 'village',
}

export const SAVED_LOCATIONS = [
  { id: 'loc_kapriwas', name: 'Kapriwas', district: 'Rewari', state: 'Haryana', tone: 'orange', label: 'Orange' },
  { id: 'loc_rewari', name: 'Rewari', district: 'Rewari', state: 'Haryana', tone: 'orange', label: 'Orange' },
  { id: 'loc_gurugram', name: 'Gurugram', district: 'Gurugram', state: 'Haryana', tone: 'yellow', label: 'Yellow' },
  { id: 'loc_delhi', name: 'Delhi', district: 'New Delhi', state: 'Delhi', tone: 'yellow', label: 'Yellow' },
]


export const CURRENT = {
  observedAt: iso(-0.35),
  tempC: 27,
  feelsLikeC: 31,
  condition: 'Overcast, rain approaching',
  rainProb: 0.78,
  humidity: 84,
  windKmh: 34,
  windDir: 'SW',
  gustKmh: 51,
  visibilityKm: 4.5,
  pressureHpa: 998,
  uv: 2,
  sunrise: '06:16',
  sunset: '18:44',
}

/** 12 hours ahead. mm is per-hour precipitation. */
export const HOURLY = [
  { t: iso(0), tempC: 27, mm: 0.4, prob: 0.42, windKmh: 34, gustKmh: 50 },
  { t: iso(1), tempC: 27, mm: 1.1, prob: 0.51, windKmh: 33, gustKmh: 49 },
  { t: iso(2), tempC: 26, mm: 3.6, prob: 0.66, windKmh: 31, gustKmh: 47 },
  { t: iso(3), tempC: 26, mm: 9.2, prob: 0.78, windKmh: 30, gustKmh: 46 },
  { t: iso(4), tempC: 25, mm: 17.4, prob: 0.86, windKmh: 28, gustKmh: 44 },
  { t: iso(5), tempC: 25, mm: 22.8, prob: 0.91, windKmh: 27, gustKmh: 43 },
  { t: iso(6), tempC: 24, mm: 19.1, prob: 0.88, windKmh: 26, gustKmh: 42 },
  { t: iso(7), tempC: 24, mm: 12.5, prob: 0.8, windKmh: 25, gustKmh: 41 },
  { t: iso(8), tempC: 24, mm: 6.3, prob: 0.7, windKmh: 24, gustKmh: 40 },
  { t: iso(9), tempC: 23, mm: 2.7, prob: 0.58, windKmh: 23, gustKmh: 39 },
  { t: iso(10), tempC: 23, mm: 1.2, prob: 0.44, windKmh: 22, gustKmh: 38 },
  { t: iso(11), tempC: 23, mm: 0.3, prob: 0.3, windKmh: 21, gustKmh: 37 },
]

export const DAILY = [
  { day: 'Today', date: '4 Sep', min: 23, max: 29, mm: 118, prob: 0.78, tone: 'orange', summary: 'Very heavy rain, evening' },
  { day: 'Fri', date: '5 Sep', min: 23, max: 28, mm: 74, prob: 0.71, tone: 'yellow', summary: 'Heavy rain, spells' },
  { day: 'Sat', date: '6 Sep', min: 24, max: 30, mm: 21, prob: 0.48, tone: 'green', summary: 'Scattered showers' },
  { day: 'Sun', date: '7 Sep', min: 24, max: 32, mm: 6, prob: 0.3, tone: 'green', summary: 'Mostly cloudy' },
  { day: 'Mon', date: '8 Sep', min: 25, max: 33, mm: 2, prob: 0.18, tone: 'green', summary: 'Humid, bright spells' },
  { day: 'Tue', date: '9 Sep', min: 25, max: 33, mm: 0, prob: 0.12, tone: 'green', summary: 'Dry' },
  { day: 'Wed', date: '10 Sep', min: 24, max: 32, mm: 11, prob: 0.35, tone: 'green', summary: 'Isolated showers' },
]

export const WARNINGS = [
  {
    identifier: 'NDMA-IMD-2026-09-04-1420',
    sender: 'India Meteorological Department, New Delhi',
    event: 'Thunderstorm with Heavy Rain & Lightning',
    severity: 'Severe',
    colour: 'orange',
    area: { description: 'Rewari, Gurugram, Jhajjar Districts', state: 'Haryana' },
    sent: iso(-2),
    effective: iso(-0.5),
    expires: iso(14),
    headline: 'Active thunderstorm with heavy rainfall and lightning over Rewari and adjoining districts.',
    description:
      'Thunderstorm accompanied with moderate to heavy rain and gusty winds (35–50 kmph) very likely to occur over Rewari, Kapriwas, Bawal, and Gurugram districts during the next 12 hours.',
    instruction:
      'Stay indoors and avoid sheltering under trees or metal structures. Drive cautiously due to waterlogged roads and reduced visibility.',
    sourceUrl: 'https://sachet.ndma.gov.in/',
    status: 'active',
  },
  {
    identifier: 'NDMA-IMD-2026-09-04-1100',
    sender: 'India Meteorological Department, Chandigarh',
    event: 'Gusty Winds & Thunderstorm Alert',
    severity: 'Moderate',
    colour: 'yellow',
    area: { description: 'Southern Haryana Districts', state: 'Haryana' },
    sent: iso(-4),
    effective: iso(-2),
    expires: iso(8),
    headline: 'Thunderstorm and gusty winds alert for southern Haryana.',
    description:
      'Possibility of thunder squalls with localized heavy showers across southern Haryana including Rewari and Mahendragarh.',
    instruction: 'Keep emergency supplies handy and avoid unnecessary travel.',
    sourceUrl: 'https://sachet.ndma.gov.in/',
    status: 'active',
  },
]


/** §8 output shape. Note `flooredBy` — the safety floor made visible. */
export const RISK = {
  overall: 'HIGH',
  score: 74,
  flooredBy: { colour: 'orange', minimum: 'HIGH' },
  hazardFloor: null,
  breakdown: [
    { key: 'rainfall', label: 'Rainfall', band: 'HIGH', weight: 32, note: '118 mm forecast in 24 h — very heavy band' },
    { key: 'flood', label: 'Flooding', band: 'MODERATE', weight: 14, note: '61 mm already fell in the last 72 h' },
    { key: 'travel', label: 'Travel', band: 'HIGH', weight: 16, note: 'Visibility 4.5 km, gusts to 51 km/h' },
    { key: 'wind', label: 'Wind', band: 'MODERATE', weight: 8, note: 'Sustained 34 km/h, below squall threshold' },
    { key: 'heat', label: 'Heat', band: 'LOW', weight: 4, note: 'Max 29 °C, well below heatwave criteria' },
  ],
}

/** §9 output shape. */
export const CONFIDENCE_RESULT = {
  level: 'MEDIUM',
  spread: 0.34,
  leadHours: 9,
  reasons: [
    'All three models agree rain begins between 15:00 and 17:00.',
    'They differ on 24-hour totals by 41 mm (ECMWF 96, GFS 137, ICON 121).',
    'Forecast issued 09:00, nine hours ahead of the event.',
  ],
  models: [
    { name: 'ECMWF IFS', mm: 96 },
    { name: 'GFS', mm: 137 },
    { name: 'ICON', mm: 121 },
  ],
}

export const SOURCES = [
  { name: 'NDMA Sachet — CAP feed', role: 'Official warnings', issuedAt: iso(-4), status: 'ok' },
  { name: 'Open-Meteo — 3 models', role: 'Forecast', issuedAt: iso(-1.2), status: 'ok' },
  { name: 'IMD Mausam', role: 'Observations', issuedAt: iso(-2.4), status: 'degraded' },
  { name: 'Gazetteer', role: 'Location resolution', issuedAt: iso(-720), status: 'ok' },
]

export const RECOMMENDATIONS = [
  'Cover harvested produce before 15:00 — the heaviest spell is forecast for 17:00–20:00.',
  'Skip irrigation today; the soil is already near saturation from the last 72 hours.',
  'Delay non-essential travel through low-lying stretches this evening.',
]

/** Seeded chat thread. Assistant turns carry the structured payload the
 *  real grounded answer will return, so the cards render from data, not JSX. */
export const CHAT_SEED = [
  {
    id: 'm1',
    role: 'user',
    lang: 'hinglish',
    text: 'Kal mere gaon mein barish hogi kya?',
    gloss: 'Will it rain in my village tomorrow?',
    at: iso(-0.12),
  },
  {
    id: 'm2',
    role: 'assistant',
    lang: 'hinglish',
    at: iso(-0.11),
    summary: 'Haan — kal shaam Bhinder mein tez barish ki sambhavna hai, lagbhag 74 mm.',
    gloss: 'Yes — heavy rain is likely in Bhinder tomorrow evening, around 74 mm.',
    warningRef: 'NDMA-IMD-2026-09-04-1102',
    riskBand: 'HIGH',
    confidence: 'MEDIUM',
    actions: ['Kati hui fasal ko dhak dein', 'Aaj sinchai talein'],
    actionsGloss: ['Cover the harvested crop', 'Delay irrigation today'],
    sources: ['NDMA Sachet', 'Open-Meteo'],
  },
]


/** Map placeholder markers, until Leaflet lands in Phase 6. */
export const MAP_MARKERS = [
  { id: 'm-udr', name: 'Udaipur', tone: 'orange', x: 26, y: 54 },
  { id: 'm-rjs', name: 'Rajsamand', tone: 'yellow', x: 34, y: 43 },
  { id: 'm-ctg', name: 'Chittorgarh', tone: 'yellow', x: 43, y: 57 },
  { id: 'm-jpr', name: 'Jaipur', tone: 'yellow', x: 52, y: 24 },
  { id: 'm-kot', name: 'Kota', tone: 'green', x: 58, y: 49 },
  { id: 'm-jdh', name: 'Jodhpur', tone: 'green', x: 18, y: 33 },
]
