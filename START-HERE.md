# WeatherGPT — complete setup

SIH26068. Three services, one database, and exactly **one optional** API key.
Everything else is free and needs no signup.

---

## 0. What you actually need

| Thing | Required? | Cost | Where |
|---|---|---|---|
| **MongoDB** | **Yes** — the API will not start without it | Free | Atlas M0, or local `mongod` |
| **JWT secret** | **Yes** — generate it yourself | Free | `openssl rand -hex 32` |
| Contact email | Yes, for Nominatim's policy | Free | your own address |
| Open-Meteo | No key at all | Free | nothing to do |
| NDMA Sachet CAP | No key at all | Free | nothing to do |
| OpenStreetMap tiles | No key at all | Free | nothing to do |
| **LLM key** | **Optional** | Free tier | NVIDIA / Groq / OpenRouter / Ollama |
| **VAPID keys** | Optional, for push | Free | `npx web-push generate-vapid-keys` |

**Only two secrets are mandatory: `MONGO_URI` and `JWT_SECRET`.** Neither costs
anything. Without the LLM key the product still answers correctly — the
composer writes the whole answer and the model only rewrites prose.

---

## 1. MongoDB — the one true blocker

### Option A — Atlas (free forever, works from anywhere)

1. Sign up at **https://cloud.mongodb.com** (no card).
2. Build a Database → **M0 Free** → pick a region near you (Mumbai is `ap-south-1`).
3. **Database Access** → Add New Database User → username + password. Save both.
4. **Network Access** → Add IP → *Allow access from anywhere* (`0.0.0.0/0`).
   Fine for a hackathon; lock it down before anything real.
5. **Connect** → Drivers → Node.js → copy the string. It looks like:

```
mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/weathergpt?retryWrites=true&w=majority
```

Put that in `server/.env` as `MONGO_URI`. Add `/weathergpt` before the `?` —
that names the database.

> If your password has `@ : / ?` or `#` in it, URL-encode them, or Mongo reads
> the string wrong. `@` → `%40`, `#` → `%23`.

### Option B — local (works offline, best for demo day)

```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

Then `MONGO_URI=mongodb://127.0.0.1:27017/weathergpt`.

### Option C — Docker (no install)

`docker compose up` starts Mongo for you. Nothing to configure.

---

## 2. Every environment variable

### `server/.env` — the API

```bash
# ── REQUIRED ───────────────────────────────────────────────────────────────
MONGO_URI=mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/weathergpt
JWT_SECRET=<64 hex chars — openssl rand -hex 32>   # must be >= 32 chars

# ── Server ─────────────────────────────────────────────────────────────────
NODE_ENV=development
PORT=5000
CORS_ORIGINS=http://localhost:5173        # comma-separated; add your Vercel URL

# ── Nominatim requires a real address in the User-Agent. Their policy. ─────
CONTACT_EMAIL=you@example.com

# ── Official warnings — free, no key ──────────────────────────────────────
# MUST be this path. /CapFeed returns an HTML page that parses to zero alerts
# and silently falls through to the bundled samples — the pipeline reports
# success the whole time while showing fabricated warnings.
SACHET_CAP_FEED=https://sachet.ndma.gov.in/cap_public_website/rss/rss_india.xml
CAP_FEED_ENABLED=true
CAP_FALLBACK_TO_SAMPLES=true              # set FALSE in production

# ── Forecast — free, no key, no signup ────────────────────────────────────
OPEN_METEO_BASE=https://api.open-meteo.com/v1
ENSEMBLE_MODELS=ecmwf_ifs025,ncep_gfs_seamless,dwd_icon_seamless
FORECAST_TTL_MINUTES=30

# ── The Python service ────────────────────────────────────────────────────
PYTHON_AI_URL=http://127.0.0.1:8000

# ── Schedules ─────────────────────────────────────────────────────────────
CRON_WARNINGS=*/5 * * * *
CRON_EXPIRE=*/5 * * * *
CRON_ALERTS=2-59/5 * * * *                # offset so it reads fresh warnings
JOBS_ENABLED=true

# ── Push notifications — optional ─────────────────────────────────────────
# npx web-push generate-vapid-keys
# Blank disables push cleanly: the cron is never scheduled and /api/health
# reports it as `unknown` rather than `down`.
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
```

### `ai/.env` — the risk and conversation engines

```bash
# ALL OPTIONAL. With none of this set, the deterministic composer produces the
# entire answer and 200 tests still pass.

LLM_BASE_URL=https://integrate.api.nvidia.com/v1
LLM_MODEL=nvidia/nemotron-3-ultra-550b-a55b
LLM_FALLBACK_MODELS=minimaxai/minimax-m3     # comma-separated, tried in order
LLM_API_KEY=nvapi-...
LLM_ENABLED=true
LLM_TIMEOUT_S=8                              # tight on purpose — see below
LLM_MAX_TOKENS=700

AI_CORS_ORIGINS=http://localhost:5000,http://127.0.0.1:5000
AI_HOST=127.0.0.1
AI_PORT=8000
```

### `client/.env` — the UI

```bash
# Points the UI at the API. Leave BLANK and the whole app runs on bundled
# sample data and says so in its own footer — which is how the shareable
# single-file build works.
VITE_API_URL=http://localhost:5000
```

---

## 3. LLM providers — pick one, or none

Every one of these speaks the OpenAI chat-completions shape, so switching is
two lines in `ai/.env` and no code change.

| Provider | Base URL | Key from | Notes |
|---|---|---|---|
| **NVIDIA NIM** | `https://integrate.api.nvidia.com/v1` | build.nvidia.com → API Keys | Free, 40 rpm, no card. **Recommended.** |
| Groq | `https://api.groq.com/openai/v1` | console.groq.com | Free tier, very fast |
| OpenRouter | `https://openrouter.ai/api/v1` | openrouter.ai | Models tagged `:free` |
| OpenCode Zen | `https://opencode.ai/zen/v1` | opencode.ai/auth | Free tier, no card |
| xAI | `https://api.x.ai/v1` | console.x.ai | Paid. A SuperGrok subscription is **not** API access |
| Ollama | `http://localhost:11434/v1` | none | Fully offline. Zero network risk on stage |

**Which NVIDIA model?** Most of the catalogue returns 404 for a free tier.
Verified working: `nvidia/nemotron-3-ultra-550b-a55b` (best, 0.5–6.6 s) and
`minimaxai/minimax-m3` (0.4 s but rate-limits fast). Probe your own tier with:

```bash
curl -s https://integrate.api.nvidia.com/v1/models \
  -H "Authorization: Bearer $LLM_API_KEY" | python3 -m json.tool | grep '"id"'
```

**Why the 8-second timeout is tight on purpose.** By the time the model is
called, a correct answer already exists. The model only makes the prose nicer.
Eight seconds buys that when it is cheap and abandons it when it is not.
Raising it trades demo latency for adjectives.

---

## 4. Push notifications — optional

```bash
npx web-push generate-vapid-keys
```

Put the pair in `server/.env`. Then in the app: **Settings → Account → create
an account → Turn on push**. Save a location on the Alerts screen; the cron
fans out severe warnings for it, once per warning ever (the unique index on
`userId + identifier` is the guarantee, not application logic).

Push needs HTTPS in production. `localhost` is exempt, so it works in dev.

---

## 5. Running it

### Everything at once

```bash
docker compose up
```

### Or the three services by hand

```bash
# 1 — risk + conversation engines. START THIS FIRST; the API calls it.
cd ai
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000       # OpenAPI docs at /docs

# 2 — API
cd server
npm install
npm run seed          # gazetteer — REQUIRED for village-level lookup
npm run dev

# 3 — UI
cd client
npm install
npm run dev           # http://localhost:5173
```

Order matters only for convenience: each service degrades if the one below is
missing, and says so rather than failing.

### Proving it is live, not sample data

```bash
cd server && npm run warnings:once
```

Prints real active warnings from NDMA. If `usedFallback: true`, your feed URL
is wrong — check `SACHET_CAP_FEED` against §2.

```bash
curl "http://localhost:5000/api/health" | python3 -m json.tool
```

Every source reports its own status and last ingest time.

```bash
curl -X POST http://localhost:5000/api/chat/query \
  -H 'Content-Type: application/json' \
  -d '{"text":"kal mere gaon mein barish hogi kya","q":"Udaipur"}' | python3 -m json.tool
```

A full grounded answer, in Hinglish, with risk and confidence.

---

## 6. Checking it works

```bash
(cd ai && python tests/run.py)      # 200 tests, no pytest needed
(cd server && npm test)             # 46 tests
(cd client && npm run build)
cd ai && python tests/eval_set.py   # 100-question scored evaluation
```

The evaluation is the one to show a judge — it scores intent, language,
location, time window and grounding, and prints what it got wrong.

---

## 7. Deploying

| Piece | Where | Free? |
|---|---|---|
| Client | Vercel — `client/vercel.json` is committed | yes |
| API + AI | Render — `render.yaml` is a blueprint | yes, spins down after 15 min |
| Database | Atlas M0 | yes |

Set on Render: `MONGO_URI`, `JWT_SECRET`, `PYTHON_AI_URL`, `CORS_ORIGINS`,
`CONTACT_EMAIL`, **`CAP_FALLBACK_TO_SAMPLES=false`**.
Set on Vercel: `VITE_API_URL`.

Free Render instances sleep after 15 minutes and take ~1 minute to wake. Hit
both services before a demo.

---

## 8. Things that will bite you

1. **`/CapFeed` is the wrong URL.** It returns HTML, parses to zero alerts, and
   falls through to `data/sample-alerts.xml` while reporting success. Check
   `usedFallback`, not `ok`.
2. **`CAP_FALLBACK_TO_SAMPLES=true` in production** serves fabricated warnings
   with every health check green. Set it false.
3. **Nominatim blocks a placeholder `CONTACT_EMAIL`.** Their usage policy
   requires a real address.
4. **The gazetteer must be seeded** or village lookup falls through to a
   geocoder that will not find "Bhinder".
5. **URL-encode your Mongo password** if it contains `@ : / ? #`.
6. **Never commit `.env`.** Both `.gitignore` files already exclude it. If you
   push a secret, rotate it — deleting the commit is not enough.

---

## 9. Read next

- `SETUP.md` — the long-form version of this file
- `CLAUDE.md` — the invariants. Read before changing anything.
- `PHASES.md` — what is done and what is not
- `docs/PRD.html` — why any of it is shaped this way

## The one rule

The language model is the interface, not the source of truth. Weather numbers
are fetched from a real source and scored by deterministic code *before*
anything is phrased. `ai/app/engines/compose.py` writes the entire answer with
no model involved; `ai/app/llm.py` may only rewrite six prose fields, and
anything it introduces that was not in the fetched data is rejected outright.

Delete `LLM_API_KEY` and the product says the same things, slightly less
fluently. That is the design — and it is the answer to "what stops it
hallucinating a rainfall figure?"
