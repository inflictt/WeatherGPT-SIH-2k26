# How to run WeatherGPT

Three ways, shortest first. All three are already built in this zip — you do
not have to compile anything to see the interface.

---

## 1. Just look at it — 5 seconds

Double-click **`open-me/weathergpt.html`**.

The whole frontend in one file. Every screen, both themes, three languages,
the location gate, Farm Connect, Crop Doctor. No install, no server, no key.

It runs on bundled sample data and says so in its own footer. Crop Doctor will
tell you no model is connected — that is correct, not a bug. See
[What runs without keys](#what-runs-without-keys).

---

## 2. The real thing, without installing a database — 5 minutes

```bash
./setup.sh
./run.sh --nodb
```

Then open **http://localhost:5173**.

`--nodb` starts a real MongoDB in a temporary folder and throws it away when
you stop. Everything works — accounts, farm profiles, saved locations — but
nothing survives a restart. That is the right trade for a demo and the wrong
one for anything else.

`setup.sh` installs dependencies, creates both `.env` files, generates a
`JWT_SECRET` on your machine, and builds the frontend. It is safe to re-run
and will not overwrite an existing `.env`.

---

## 3. The real thing, with a database that persists

```bash
brew install mongodb-community
brew services start mongodb-community

./setup.sh
./run.sh
```

On Linux, use your distribution's `mongodb-org` package, or a free
[Atlas](https://cloud.mongodb.com) cluster — paste its connection string into
`MONGO_URI` in `server/.env`.

Seed the place database once so search returns real names:

```bash
cd server && npm run seed
```

---

## What is running

| | Address | What it does |
|---|---|---|
| **web** | http://localhost:5173 | the interface |
| **API** | http://localhost:5050 | forecasts, warnings, farm profiles, chat |
| **engines** | http://localhost:8000/docs | risk, irrigation, crop calendar — browsable |

`http://localhost:5050/api/health` lists every source and says which are
configured. It is the fastest way to see what is and is not switched on.

> **Port 5050, not 5000.** macOS binds 5000 *and* 7000 to the AirPlay Receiver,
> so the obvious default fails on every recent Mac with an `EADDRINUSE` that
> explains nothing. `run.sh --nodb` will also step to the next free port and
> tell you if 5050 is taken.

---

## What runs without keys

Most of it. The parts that need a key say so on screen rather than failing
quietly or — worse — making something up.

| Feature | No key | With the key |
|---|---|---|
| Forecast, 7-day, hourly | ✅ works | — Open-Meteo needs no key, ever |
| Official warnings | ✅ works | — NDMA Sachet is a public feed |
| Risk, confidence, irrigation, farm risk | ✅ works | — all deterministic Python |
| Farmer's Friend chat | ✅ **complete answers** | `GEMINI_API_KEY` — same answer, better words |
| Crop Doctor, Soil Check | ⚠️ says "no model connected" | `HF_TOKEN` — real classification |
| Push notifications | ⚠️ disabled | `VAPID_*` — see below |

### Gemini is optional on purpose

The deterministic composer produces the **entire** structured answer — summary,
risk band, confidence, actions, sources. Gemini only ever rewrites six prose
fields, and a rewrite that introduces a figure, changes a risk band, drops an
action or names a chemical is discarded whole.

So deleting `GEMINI_API_KEY` changes how well the product reads, never what it
says. Every answer's footer tells you which produced it: **phrased locally**
or **phrased by Gemini**.

### The image models never guess

With no `HF_TOKEN`, Crop Doctor and Soil Check say a model is not connected,
show what a real result looks like, and offer no verdict. There is no code path
that invents a class or a confidence — a plausible disease name under a
confidence bar reads as a diagnosis, and that is the one mistake this product
cannot make.

To switch them on, put a free read token from
[huggingface.co/settings/tokens](https://huggingface.co/settings/tokens) into
`HF_TOKEN` in `server/.env`.

### Push notifications

```bash
npx web-push generate-vapid-keys
```

Paste the pair into `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY`.

---

## Checking it works

```bash
cd ai     && .venv/bin/python tests/run.py     # 232 engine tests
cd server && npm test                          # 73, including 11 against a real database
cd client && npm run build                     # the frontend compiles
cd ai     && .venv/bin/python tests/eval_set.py  # 100 questions, scored
```

The evaluation set is the interesting one: it scores intent, language,
location and time parsing across 100 questions in three languages, and checks
that no composed answer contains a number that was not fetched.

---

## Things that will bite you

**Port 5000 is taken on macOS.** AirPlay Receiver. Turn it off in System
Settings → General → AirDrop & Handoff, or leave the port at 5050.

**The first `--nodb` run is slow.** It downloads a MongoDB binary once
(~90 seconds). Every run after that is instant.

**`CAP_FALLBACK_TO_SAMPLES=true` is for local use only.** In production set it
to `false`, or the app serves bundled sample warnings while every health check
stays green — which is the worst possible failure for a warning system.

**`SACHET_CAP_FEED` must end in `/cap_public_website/rss/rss_india.xml`.** The
older `/CapFeed` path returns an HTML page that parses to zero alerts and falls
through to the samples, reporting success the whole way.

**Rotate any key you have pasted anywhere.** Including into a chat window.

---

## Where things live

```
ai/          Python  · risk, confidence, NLU, irrigation, farm risk, crop calendar
server/      Node    · API, MongoDB, CAP ingestion, Gemini, model proxy
client/      React   · the interface
open-me/     the whole frontend as one HTML file
docs/        the PRD, and the design reference
```

`SETUP.md` goes deeper on every environment variable. `PHASES.md` is what
is built and what is not.
