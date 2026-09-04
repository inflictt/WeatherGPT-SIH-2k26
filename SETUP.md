# WeatherGPT — setup

**Phases 1–3 need zero API keys and zero paid accounts.**

There are exactly two secrets in the whole system, and you generate both
yourself:

| Secret | What it is | Where it comes from |
|---|---|---|
| `MONGO_URI` | database connection string | a local install, or a free Atlas cluster |
| `JWT_SECRET` | random string for signing logins | `openssl rand -hex 32` |

Everything else — the forecast, the official warnings, the geocoder — is a
public API with no key, no signup and no card. That is a deliberate
architectural choice, not a coincidence, and it is worth saying on stage.

---

## 1. Prerequisites

| Tool | Version | Install |
|---|---|---|
| Node.js | 18.17+ | <https://nodejs.org> (LTS) |
| Python | 3.10+ | <https://python.org> |
| MongoDB | 6+ | local, or skip and use Atlas below |
| Git | any | <https://git-scm.com> |

Check: `node -v && python3 --version && git --version`

---

## 2. Database — pick one, both free

### Option A: local MongoDB (fastest, works offline)

```bash
# macOS
brew tap mongodb/brew && brew install mongodb-community && brew services start mongodb-community

# Ubuntu / Debian / WSL
sudo apt-get install -y mongodb
sudo systemctl start mongodb

# Windows: download MongoDB Community Server and run it as a service
```

Then `MONGO_URI=mongodb://127.0.0.1:27017/weathergpt`

### Option B: MongoDB Atlas free cluster (works from anywhere, needed for deployment)

1. Sign up at <https://www.mongodb.com/cloud/atlas/register> — **no credit card**
2. Create a **Free** cluster (M0), any region; pick one near India for latency
3. **Database Access** → add a user, save the password
4. **Network Access** → add IP `0.0.0.0/0` (fine for a hackathon; tighten later)
5. **Connect → Drivers** → copy the connection string

```
MONGO_URI=mongodb+srv://USER:PASS@cluster0.xxxxx.mongodb.net/weathergpt?retryWrites=true&w=majority
```

**Free cluster limits:** 512 MB storage, 500 connections, 100 ops/sec,
10 GB transfer per 7 days, no backups. Far more than this project needs.

> ⚠️ **It pauses after 30 days of zero connections.** If your cluster looks
> dead the week of the finals, that is why — open Atlas and click Resume.

---

## 3. Backend — `server/`

```bash
cd server
npm install
cp .env.example .env
```

Generate the JWT secret and paste it into `.env`:

```bash
openssl rand -hex 32
# no openssl? →
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Seed the gazetteer and fetch warnings once:

```bash
npm run seed              # 99 curated places, works offline
npm run warnings:once     # fetch → parse → store, then print what it found
npm run dev               # http://localhost:5000
```

`npm run warnings:once` is the Phase 2 acceptance check. It prints real active
warnings for a district with no UI involved.

---

## 4. Risk engine — `ai/`

```bash
cd ai
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Interactive API docs appear at <http://localhost:8000/docs> — free, generated
by FastAPI, and genuinely useful in a demo.

Run the tests:

```bash
pytest -q                # 65 tests
python tests/run.py      # same tests, no pytest needed
```

**No environment file is required.** The engine has no secrets and calls
nothing external. Optional: `AI_PORT`, `AI_HOST`, `AI_CORS_ORIGINS`.

---

## 5. Frontend — `client/`

```bash
cd client
npm install
cp .env.example .env      # optional
npm run dev               # http://localhost:5173
```

| Variable | Effect |
|---|---|
| *(unset)* | UI runs on bundled sample data — useful for demoing the interface alone |
| `VITE_API_URL=http://localhost:5000` | UI talks to the live backend |

The footer says which mode you are in.

---

## 6. Every environment variable

### `server/.env`

| Variable | Required | Default | Notes |
|---|---|---|---|
| `MONGO_URI` | **yes** | `mongodb://127.0.0.1:27017/weathergpt` | §2 |
| `JWT_SECRET` | **yes** | — | ≥ 32 chars, generate it yourself |
| `JWT_EXPIRY` | no | `7d` | |
| `PORT` | no | `5000` | Render sets this for you |
| `CORS_ORIGINS` | no | `http://localhost:5173` | add your deployed frontend |
| `LOG_LEVEL` | no | `info` | `debug` when something is odd |
| `OPEN_METEO_BASE` | no | `https://api.open-meteo.com/v1` | **no key** |
| `ENSEMBLE_MODELS` | no | `ecmwf_ifs025,ncep_gfs_seamless,dwd_icon_seamless` | change if Open-Meteo renames one |
| `FORECAST_TTL_MINUTES` | no | `30` | cache lifetime |
| `SACHET_CAP_FEED` | no | `https://sachet.ndma.gov.in/CapFeed` | **no key** |
| `CAP_FEED_ENABLED` | no | `true` | |
| `CAP_FALLBACK_TO_SAMPLES` | no | `true` | uses `data/sample-alerts.xml` if the feed is down — **set `false` in production** |
| `NOMINATIM_BASE` | no | `https://nominatim.openstreetmap.org` | **no key** |
| `CONTACT_EMAIL` | no | placeholder | **put a real address here** — Nominatim's policy requires it |
| `PYTHON_AI_URL` | no | `http://127.0.0.1:8000` | the Phase 3 service |
| `JOBS_ENABLED` | no | `true` | |
| `CRON_WARNINGS` | no | `*/5 * * * *` | |
| `CRON_EXPIRE` | no | `*/5 * * * *` | |

### `client/.env`

| Variable | Required | Notes |
|---|---|---|
| `VITE_API_URL` | no | unset = sample data |

### `ai/` — none.

---

## 7. The free services, and why each one

| Need | Service | Key? | Limits | Why this one |
|---|---|---|---|---|
| Forecast | [Open-Meteo](https://open-meteo.com) | ❌ none | ~10k calls/day, non-commercial | The only free weather API that returns **several models in one call** — which is what makes the confidence score possible at all |
| Official warnings | [NDMA Sachet CAP feed](https://sachet.ndma.gov.in/CapFeed) | ❌ none | public | Real CAP 1.2 alerts from IMD, CWC and all 36 state authorities |
| Geocoding | [Nominatim](https://nominatim.org) | ❌ none | 1 req/sec, real User-Agent required | Only a fallback — the local gazetteer handles almost everything |
| Full gazetteer | [GeoNames](https://download.geonames.org/export/dump/) | ❌ none | CC BY 4.0 | ~100k Indian places with district and state |
| Database | [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) Free | ❌ none | 512 MB | Geospatial `2dsphere` queries on the free tier |
| Speech (Phase 5) | Web Speech API | ❌ none | browser built-in | Free, instant, supports `hi-IN` |
| Indic AI (Phase 5) | [Bhashini](https://bhashini.gitbook.io/bhashini-apis) | ✅ free key | registration | Government stack — worth naming to judges |

### Getting the full gazetteer (optional, 10 minutes)

The bundled seed has 99 places. For every village in India:

```bash
cd server/data
curl -O https://download.geonames.org/export/dump/IN.zip && unzip IN.zip
curl -O https://download.geonames.org/export/dump/admin1CodesASCII.txt
curl -O https://download.geonames.org/export/dump/admin2Codes.txt
cd ..
node scripts/seedGazetteer.js --geonames data/IN.txt \
  --admin1 data/admin1CodesASCII.txt --admin2 data/admin2Codes.txt \
  --min-population 0
```

This is what makes "my village" work on stage. Judges test it.

---

## 8. Deployment — all free

| Piece | Platform | Card? | Catch |
|---|---|---|---|
| Frontend | [Vercel](https://vercel.com) Hobby | ❌ | none worth mentioning |
| Node API | [Render](https://render.com) Free | ❌ | **spins down after 15 min idle**, ~1 min cold start; 750 h/month |
| Python engine | Render Free (second service) | ❌ | same |
| Database | MongoDB Atlas Free | ❌ | pauses after 30 days idle |

**Render's free tier is the only genuinely free option for a persistent Node
service right now.** Railway gives $1/month of credit (about 5 hours);
Fly.io no longer has a free tier for new users.

### The cold-start problem, and the free fix

A judge opening your link after lunch waits a minute for Render to wake up.
Fix it with a free uptime pinger hitting `/api/health` every 10 minutes:

- [cron-job.org](https://cron-job.org) — free, unlimited jobs
- [UptimeRobot](https://uptimerobot.com) — free, 50 monitors

Set this up **the day before the demo**, not the morning of.

### Deploy settings

**Render — Node API**
```
Root Directory:  server
Build Command:   npm install
Start Command:   npm start
Environment:     MONGO_URI, JWT_SECRET, PYTHON_AI_URL, CORS_ORIGINS, CAP_FALLBACK_TO_SAMPLES=false
```

**Render — Python engine**
```
Root Directory:  ai
Build Command:   pip install -r requirements.txt
Start Command:   uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

**Vercel — frontend**
```
Root Directory:  client
Framework:       Vite
Environment:     VITE_API_URL = https://your-api.onrender.com
```

Then add the Vercel URL to `CORS_ORIGINS` on the API and redeploy.

---

## 9. Phase 4 — the one key you will eventually need

Phase 4 adds a language model for parsing questions and phrasing answers.
Several are free:

| Provider | Free tier | Notes |
|---|---|---|
| [Google AI Studio](https://aistudio.google.com) | generous, no card | Gemini models; best free option today |
| [Groq](https://console.groq.com) | free tier | very fast inference, good for a live demo |
| [OpenRouter](https://openrouter.ai) | models tagged `:free` | one key, many models |
| [Ollama](https://ollama.com) | unlimited | runs on your own laptop; zero network risk on stage |

Remember §10 of the PRD: the model never produces a weather number, so if the
key runs out mid-demo the cards still render. That is the whole point of the
architecture — and it means a free tier running out cannot embarrass you.

---

## 10. Things that will bite you

1. **Nominatim will block you** if you leave the placeholder `CONTACT_EMAIL`.
   Put a real address in. It is in their usage policy.
2. **`CAP_FALLBACK_TO_SAMPLES=true` in production** silently serves fake
   warnings. Set it to `false` before you deploy, and let the health endpoint
   tell you the feed is down instead.
3. **Atlas `0.0.0.0/0`** is fine for a hackathon and wrong for anything real.
4. **Render cold starts** — see §8.
5. **Open-Meteo model names** occasionally change. If the ensemble comes back
   empty, that is the first thing to check; it is one line in `.env`.
6. **Never commit `.env`.** Both `.gitignore` files already exclude it.
   If you push a secret, rotate it — do not just delete the commit.

---

## 11. Where these choices came from

Cross-checked against the two lists you shared:

- **[public-apis](https://github.com/public-apis/public-apis)** — Open-Meteo
  is listed under Weather as `apiKey: No`. Also listed there: 7Timer!,
  wttr.in and Meteosource. Open-Meteo wins because of the multi-model call.
- **[free-for-dev](https://github.com/ripienaar/free-for-dev)** — the source
  for MongoDB Atlas, Render, Vercel, UptimeRobot and cron-job.org. Also worth
  knowing about, if a later phase needs them: **Upstash** (free serverless
  Redis), **Neon** and **Supabase** (free Postgres), **Cloudinary** (free
  image hosting), **Sentry** (free error tracking, 5k events/month).

Two things worth adding beyond those lists:

- **Cloudflare Workers + Cron Triggers** — a free way to run the warning
  poller independently of Render, so ingestion keeps working even while the
  API is spun down.
- **GitHub Actions** — 2,000 free minutes/month. A scheduled workflow can hit
  your health endpoint and act as both a keep-alive and a monitor, with no
  third-party account at all.
