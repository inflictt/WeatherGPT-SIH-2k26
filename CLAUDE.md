# WeatherGPT — working notes for Claude Code

Smart India Hackathon **SIH26068**. Conversational weather intelligence and
early warning for India.

Read this before changing anything. `SETUP.md` is how to run it, `PHASES.md`
is what comes next, `docs/PRD.html` is why.

---

## The one rule

> **The language model is the interface, not the source of truth.**

Weather numbers are fetched from a real source and scored by deterministic
code *before* anything is phrased. If you are ever about to let an LLM
produce a rainfall figure, a wind speed, a warning severity, a source name or
an issue time — stop. That is the failure this whole architecture exists to
prevent.

---

## Layout

```
client/   React 18 + Vite + Tailwind      Phases 1, 4-6  ✅
server/   Node 18 + Express + MongoDB     Phases 2, 4, 6  ✅
ai/       Python 3.10 + FastAPI           Phases 3, 4  ✅
```

Data flows **up**: sources → server → risk engine → client. Never the reverse.

---

## Commands

```bash
# everything at once, including a database
docker compose up

# risk + conversation engines (start this first — the API calls it)
cd ai && source .venv/bin/activate && uvicorn app.main:app --reload --port 8000
cd ai && python tests/run.py          # 179 tests, no pytest needed
cd ai && pytest -q                    # same tests, if pytest is installed
cd ai && python tests/eval_set.py     # 100-question evaluation, scored

# api  (needs MONGO_URI + JWT_SECRET in server/.env)
cd server && npm run dev
cd server && npm test                 # 46 tests
cd server && npm run seed             # gazetteer
cd server && npm run warnings:once    # fetch + parse + store warnings, print result
cd server && npm run smoke            # end-to-end against a running API

# ui
cd client && npm run dev              # http://localhost:5173
cd client && npm run build
```

Run the full check before claiming something works:

```bash
(cd ai && python tests/run.py) && (cd server && npm test) && (cd client && npm run build)
```

And before a demo or a release, the evaluation too — it measures accuracy
rather than asking whether anything broke, and its failure list is the useful
part:

```bash
cd ai && python tests/eval_set.py
```

---

## Invariants — do not break these

These are product requirements, not preferences. Each has a test or a
reviewer who will notice.

1. **A warning renders above the answer.** `WarningBanner` sits before the
   hero on every screen that has one. Never move it below the fold, never
   collapse it behind a toggle.
2. **Official CAP text is immutable.** `headline`, `description` and
   `instruction` are stored and displayed verbatim. Any plain-language gloss
   goes in a *separate, labelled* block. Do not summarise, soften, re-time or
   merge them.
3. **An expired warning is never shown as active.** Check `expires` against
   the clock at read time, not just the stored `status` flag.
4. **Both risk floors only ever raise.** `ai/app/engines/risk.py` —
   `apply_safety_floor` (official warning) and `apply_hazard_floor` (worst
   single hazard). Neither may lower a level. Both are tested per branch.
5. **Missing data produces "I don't know", never an estimate.**
6. **Every answer shows its source and issue time.**
7. **Degrade, never blank.** Risk engine down → cards still render.
   Backend down → the UI falls back to `client/src/lib/sampleData.js` and says
   so in the footer.
8. **The LLM is never load-bearing.** `ai/app/engines/compose.py` produces the
   complete structured answer with no model. `ai/app/llm.py` may rewrite six
   prose fields, and `validate.py` rejects the whole rewrite if it introduces a
   number, source or warning that was not in the input. Deleting `LLM_API_KEY`
   must never change what the product *says*, only how well it reads — there is
   a test for the no-key path.
9. **The feed URL is load-bearing.** `SACHET_CAP_FEED` must point at
   `/cap_public_website/rss/rss_india.xml`. The old `/CapFeed` path returns an
   HTML page that parses to zero alerts and falls through to the bundled
   samples — the pipeline reports success while showing fabricated warnings.
   Check `usedFallback` in the ingest result, not just `ok`.

---

## Conventions

### Client

- **Colour means hazard.** The interface is monochrome; the only saturated
  colours are the four IMD severities (green/yellow/orange/red). Do not
  introduce a decorative colour. `accent` is the inverse of the page — black
  on white, white on black — not a hue.
- All colour lives in `src/index.css` as CSS custom properties, mapped in
  `tailwind.config.js`. Never write a raw hex in a component.
- Three theme states: `:root` (light), `prefers-color-scheme` guarded by
  `:root:not([data-theme="light"])`, and `:root[data-theme="dark"]`.
- Type: `font-display` (Inter Tight, semibold, tight) for headings and
  figures; `font-sans` (Inter) for text; `font-mono` (IBM Plex Mono) for
  labels and any number in a column — pair it with `.tnum`.
- `useData()` from `src/lib/DataContext.jsx` is the only way to get weather
  data. Components never fetch and never import `sampleData` directly.
- `src/lib/adapters.js` is the seam. API shape changes are absorbed there.

### Server

- ESM (`"type": "module"`), `.js` extensions required in imports.
- Every route handler is wrapped in `wrap()` and validated with a zod schema.
- Never `throw` a bare string — use `AppError` helpers from `utils/AppError.js`.
- Upstream calls go through `utils/http.js` (timeout, retry, User-Agent).
- New warning fields go in `models/Warning.js` **and** `services/capParser.js`.

### AI

- `app/engines/` is pure Python with **no framework imports**. Keep it that
  way — it is what makes the logic testable and auditable.
- FastAPI routers are thin: validate, call the engine, return.
- Every threshold in `engines/thresholds.py` must be a published IMD number
  with a comment saying so. Weights are ours and every response says so.
- Add a boundary test on both sides of any new threshold.

---

## Free-tier constraints that shape the code

- **Open-Meteo**: no key, ~10k calls/day. Hence `ForecastCache` with a TTL.
  Do not remove the cache.
- **Nominatim**: 1 req/sec, real User-Agent required. Hence gazetteer-first
  lookup with Nominatim only as fallback. `CONTACT_EMAIL` must be real.
- **MongoDB Atlas free**: 512 MB, pauses after 30 days idle.
- **Render free**: spins down after 15 min idle, ~1 min cold start.
- No paid service may be introduced without saying so explicitly.

---

## Current state

Phases 1–4 complete; 5 and 6 mostly. See `PHASES.md`.

**Not verified, and worth knowing:** there is no MongoDB in this environment, so
the server has never been booted end to end here. Everything database-dependent
— saved locations, push delivery, conversation persistence, gazetteer seeding —
is written and unit-tested but has not been run against a live database. The
CAP parser, the chat pipeline and all five engines are covered by tests that do
not need one.

Languages shipping: **English, Hindi, Hinglish**. Others are config entries
added in Phase 5, not rewrites.

Known gaps, deliberately:

- Bhashini is not wired. `client/src/lib/useVoice.js` is the seam for it —
  Web Speech sits behind that interface and nothing above it would change.
- Marathi, Bengali, Tamil and Telugu are not shipped. Each is a key per entry
  in `client/src/lib/i18n.js` and `ai/app/engines/phrases.py`, not a rewrite.
  If adding one requires touching anything else, something has regressed.
- Push delivery is unobserved (see above).
- The evaluation set of Phase 7 does not exist yet.

---

## When you finish a change

1. Run the full check above.
2. If you touched a threshold or a floor, show the test that covers it.
3. If you touched the warning path, confirm invariants 1–3 by hand.
