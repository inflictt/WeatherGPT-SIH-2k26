# WeatherGPT — build phases

Seven phases. Each one ends with something demonstrable; nothing is left
half-wired between phases. Order follows §13 of the PRD: the data and safety
floor exist before the conversational layer sits on top of them.

---

## Phase 1 — UI foundation ✅ **done**

The complete interface, running on mock data shaped exactly like the real
API contracts.

- Design system: colour, type, spacing, motion and elevation as tokens
- App shell, desktop nav, mobile tab bar, provenance footer
- Five screens: Today, Ask, Alerts, Map, Settings
- Domain components: warning banner + card, risk panel, confidence panel,
  hourly strip, seven-day list, chat thread, composer with voice state
- Responsive from 320 px, keyboard reachable, reduced-motion aware

**Done when** every screen is navigable, the chat round-trip animates, and
the design direction is settled. No network calls anywhere.

---

## Phase 2 — Data floor ✅ **done**

Replace `src/lib/sampleData.js` with real fetches. Nothing above it changes.

- Express API, MongoDB models, JWT auth
- Open-Meteo client requesting three models in one call
- NDMA Sachet CAP poller: fetch → parse → dedupe on `identifier` → store
- Gazetteer seeded with districts and towns, `2dsphere` indexed
- `node-cron` jobs: refresh warnings (5 min), expire warnings (5 min)
- `/api/health` reporting per-source status and last ingest

**Done when** a script prints the real active warnings for a named district.

---

## Phase 3 — Intelligence layer ✅ **done**

The Python service. This is where the project earns its differentiation.

- FastAPI app with `/risk/score` and `/uncertainty/score`
- IMD thresholds as data, not scattered conditionals
- The safety floor: an active warning sets a minimum risk band
- Confidence from inter-model spread and lead time
- Unit tests on every threshold boundary, including both sides of 64.5,
  115.6 and 204.5 mm

**Done when** risk and confidence on the Today screen come from the engine.

---

## Phase 4 — Conversation ✅ **done**

- `/nlu/parse` — question to `{ intent, location, window, variables }`, with no
  model: a script test plus a romanised-Hindi keyword list. Returns a *relative*
  window; the server owns the clock and the timezone
- Location resolution: gazetteer, fuzzy match, then geocoder. A named place
  always beats conversational history, and an unresolvable name is a dead end
  rather than a silent fallback to somewhere else
- Grounded compose: `compose.py` builds the **entire** structured answer from
  templates with no model involved, which is what makes "killing the LLM key
  still renders an answer" true by construction rather than by hope
- Output validation: `validate.py` rejects any number, source or warning
  reference that did not appear in the input. The LLM may rewrite six prose
  fields and nothing else — it cannot lower a risk band or name a source
- `POST /api/chat/query` runs the eight §5 steps, with warnings fetched
  *alongside* the forecast so a slow forecast cannot cost someone a warning

**Done.** A typed or spoken question in English, Hindi or Hinglish returns a
grounded answer end to end, and every layer degrades on its own.

---

## Phase 5 — More languages and voice 🟡 **mostly done**

English, Hindi and **Hinglish** ship in Phase 1; this phase makes them work
end to end and adds the rest.

Done: `i18n.js` (interface strings as data — a new language is a key per entry,
not a code path), Hinglish detection at parse time, Hinglish output composed in
Hindi and spoken in Devanagari so `hi-IN` pronounces it correctly, Web Speech
in and out with named permission-failure states, and the weather glossary
(`mm`, `km/h`, `°C` are never translated).

Remaining: the Bhashini adapter, and Marathi / Bengali / Tamil / Telugu as
config entries.

- i18n for all interface strings; Devanagari input and output
- Hinglish detection: a romanised-Hindi keyword list separates
  "kal barish hogi kya" from English at parse time
- Hinglish output: compose in Hindi, transliterate to Latin for display, and
  speak the Devanagari form so `hi-IN` pronunciation stays correct
- Web Speech `hi-IN` for speech-to-text and text-to-speech
- Bhashini adapter behind the same interface, for what the browser lacks
- Weather terminology glossary so translation does not mangle `mm` or `alert`
- Then Marathi, Bengali, Tamil, Telugu — config entries, not rewrites

**Done when** a spoken Hindi question returns a spoken Hindi answer, and a
typed Hinglish question returns a Hinglish one.

---

## Phase 6 — Alerts, map and PWA 🟡 **built, delivery unverified**

- Web push subscriptions, per-location and per-severity ✅
- Deduplication: the unique index on (userId, identifier) *is* the guarantee —
  `notifyOnce` claims the row before sending, so two servers cannot both win ✅
- Leaflet map ✅. Warnings without geometry are drawn as dashed district
  circles, because Sachet publishes polygons at a URL that currently 403s and
  a polygon-only map would show almost nothing while appearing to work
- Service worker, offline shell, installable, tile and last-good-data cache ✅

**Remaining:** the delivery path needs a database and a VAPID keypair to
exercise. The code and its validation are tested; an actual notification
arriving on a phone has not been observed.

---

## Phase 7 — Harden and rehearse 🟡 **evaluation done**

- Evaluation set of 100 questions scored for intent, location, time and
  grounding accuracy ✅ — `ai/tests/eval_set.py`, currently 100% on all five
  dimensions including 168/168 compositions carrying no ungrounded number.
  It has already earned its keep: it found the "here"-inside-"there" location
  bug, a Devanagari nukta mismatch that silently dropped half of every Hindi
  question containing तूफ़ान/क़/ज़, and two missing prepositions
- Safety tests: expired warning never shows as active; missing data never
  produces an estimate; the safety floor cannot be bypassed
- Deploy: Vercel, Render, Atlas. Seed a demo district.
- Rehearse the 90-second demo until it is boring

**Done when** the evaluation report is a slide.
