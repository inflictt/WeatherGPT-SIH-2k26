# WeatherGPT

**Conversational weather intelligence and early warning for India.**
SIH26068 · *From weather forecasts to actionable warnings*

> The language model is the interface, not the source of truth. Weather
> numbers are fetched and scored before anything is phrased.

```
client/   React + Tailwind          Phase 1  ✅
server/   Node + Express + MongoDB  Phase 2  ✅
ai/       Python + FastAPI          Phase 3  ✅
```

**Start here → [SETUP.md](SETUP.md).** Phases 1–3 need no API keys and no paid
accounts; the only two secrets are a database URL and a JWT secret you
generate yourself.

## What works today

- Five screens, light and dark, responsive from 320 px
- Live 7-day forecast from three numerical models
- Official CAP warnings ingested from NDMA Sachet, geo-matched to a district,
  and rendered **above** the answer with their text unedited
- Rule-based risk scoring on IMD's published thresholds, with two safety
  floors that can only ever raise a level
- Forecast confidence derived from genuine model disagreement
- English, Hindi and Hinglish throughout
- Graceful degradation at every layer: no risk engine → cards still render;
  no backend at all → the UI runs on bundled sample data

## Quick start

```bash
# 1. risk engine
cd ai && python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt && uvicorn app.main:app --port 8000

# 2. api  (needs MONGO_URI and JWT_SECRET in server/.env)
cd server && npm install && npm run seed && npm run dev

# 3. ui
cd client && npm install && npm run dev
```

## Tests

```bash
cd ai     && python tests/run.py    # 65 — thresholds, safety floors, confidence
cd server && npm test               # 7  — CAP geometry and severity mapping
```

## The three claims, and where each is enforced

| Claim | Enforced in |
|---|---|
| A warning outranks the answer | `client/src/components/warning/WarningBanner.jsx`, `ai/app/engines/risk.py` |
| Official text is never rewritten | `server/src/services/capParser.js`, `client/.../WarningCard.jsx` |
| A forecast is not a fact | `ai/app/engines/uncertainty.py` |

## Docs

- [SETUP.md](SETUP.md) — every variable, every free service, deployment
- [PHASES.md](PHASES.md) — the seven-phase plan, 1–3 complete
- [docs/PRD.html](docs/PRD.html) — the product spec
- [ai/README.md](ai/README.md) — how the risk engine thinks
- [client/README.md](client/README.md) — the design system
