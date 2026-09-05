import 'dotenv/config'

const bool = (v, d = false) => (v === undefined ? d : /^(1|true|yes|on)$/i.test(String(v)))
const int = (v, d) => (v === undefined || v === '' ? d : Number.parseInt(v, 10))

/**
 * Every value here has a working default EXCEPT the two secrets, so a fresh
 * clone runs with `MONGO_URI` and `JWT_SECRET` alone. Nothing in Phase 2 or 3
 * requires a paid account or an API key.
 */
export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  // 5050, not 5000. macOS Monterey and later bind port 5000 to the AirPlay
  // Receiver in ControlCentre, so the obvious default fails on every recent
  // Mac with an EADDRINUSE nobody can explain. 7000 is taken by the same
  // process; 5050 is clear.
  port: int(process.env.PORT, 5050),
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),

  // --- required ---
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/weathergpt',
  jwtSecret: process.env.JWT_SECRET || '',
  jwtExpiry: process.env.JWT_EXPIRY || '7d',

  // --- forecast: free, no key, no signup ---
  openMeteoBase: process.env.OPEN_METEO_BASE || 'https://api.open-meteo.com/v1',
  // Models compared for the uncertainty spread. Names come from Open-Meteo's
  // model list; change them here if the API renames one.
  ensembleModels: (process.env.ENSEMBLE_MODELS ||
    'ecmwf_ifs025,ncep_gfs_seamless,dwd_icon_seamless')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  forecastTtlMinutes: int(process.env.FORECAST_TTL_MINUTES, 30),

  // --- official warnings: free, public ---
  // The all-India CAP index. NOT `/CapFeed` — that path serves the portal's
  // HTML app shell, which parses to zero alerts and silently falls through to
  // the bundled samples, so the pipeline looks healthy while showing fake
  // warnings. Verified live 2026-09-04: this URL returns RSS 2.0 with ~99
  // items from IMD, CWC and the state authorities.
  capFeedUrl:
    process.env.SACHET_CAP_FEED ||
    'https://sachet.ndma.gov.in/cap_public_website/rss/rss_india.xml',
  capFeedEnabled: bool(process.env.CAP_FEED_ENABLED, true),
  // When the live feed is unreachable (offline dev, venue wifi), load the
  // bundled sample alerts instead so the pipeline still demonstrates.
  capFallbackToSamples: bool(process.env.CAP_FALLBACK_TO_SAMPLES, true),

  // --- geocoding: free, no key, 1 req/sec, needs a real User-Agent ---
  nominatimBase: process.env.NOMINATIM_BASE || 'https://nominatim.openstreetmap.org',
  contactEmail: process.env.CONTACT_EMAIL || 'weathergpt-sih@example.org',
  get userAgent() {
    return 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 WeatherGPT/2.0'
  },

  // --- push notifications: free, but needs a VAPID keypair ---
  // Generate one with:  npx web-push generate-vapid-keys
  // Absent keys disable the feature cleanly; /api/health reports it.
  vapidPublicKey: process.env.VAPID_PUBLIC_KEY || '',
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY || '',

  // --- Phase 3 service ---
  aiServiceUrl: process.env.PYTHON_AI_URL || 'http://127.0.0.1:8000',

  // --- agriculture models (PRD §7, §8) ---
  // One HuggingFace token covers both image models. Absent, the two image
  // endpoints return a named 503 and the interface says the model is not
  // connected — it never falls back to a plausible-looking class.
  hfToken: process.env.HF_TOKEN || '',

  // --- Gemini (PRD §10) ---
  // Absent, `farmer-friend/chat` still answers: the deterministic composer
  // produces the whole structured response and Gemini only ever rewrites
  // prose. Deleting this key must change how well the product reads, never
  // what it says.
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-3.6-flash',

  // --- schedules ---
  cronWarnings: process.env.CRON_WARNINGS || '*/5 * * * *',
  cronExpire: process.env.CRON_EXPIRE || '*/5 * * * *',
  // Slightly offset from the ingest schedule so a fan-out reads warnings that
  // have just landed rather than racing the run that is storing them.
  cronAlerts: process.env.CRON_ALERTS || '2-59/5 * * * *',
  jobsEnabled: bool(process.env.JOBS_ENABLED, true),
}

export function assertEnv() {
  const missing = []
  if (!env.jwtSecret) missing.push('JWT_SECRET')
  if (!env.mongoUri) missing.push('MONGO_URI')
  if (missing.length) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}.\n` +
        `Copy .env.example to .env and fill them in. See SETUP.md.`,
    )
  }
  if (env.jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters. Generate one with:\n  openssl rand -hex 32')
  }
}
