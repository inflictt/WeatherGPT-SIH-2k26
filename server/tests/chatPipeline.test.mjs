import test from 'node:test'
import assert from 'node:assert/strict'

import { answerQuestion, resolveForQuestion, windowFor } from '../src/services/chatPipeline.js'

/**
 * The pipeline is tested with injected dependencies rather than a live stack,
 * because the behaviour that matters here is *ordering and degradation* — which
 * step runs when, and what the product still returns when one of them is gone.
 * None of that needs Mongo, Open-Meteo or the Python service to be up.
 */

const UDAIPUR = {
  name: 'Udaipur', district: 'Udaipur', state: 'Rajasthan',
  lat: 24.5854, lon: 73.7125, zone: 'plains', urbanFloodProne: false,
}
const JAIPUR = { ...UDAIPUR, name: 'Jaipur', district: 'Jaipur', lat: 26.9, lon: 75.8 }

const NOW = new Date('2026-09-04T09:00:00+05:30')

function hourly(from, hours, mm = 5) {
  return Array.from({ length: hours }, (_, i) => ({
    time: new Date(from.getTime() + i * 3600e3).toISOString(),
    precipMm: mm, precipProb: 70, tempC: 27, windKmh: 20, gustKmh: 30, visibilityM: 8000,
  }))
}

function deps(over = {}) {
  return {
    parseNlu: async () => ({
      intent: 'rain_forecast', language: 'en', location: null, location_hint: null,
      window: { day_offset: 0, from_hour: null, to_hour: null, label: 'today' },
      variables: ['precipitation'],
    }),
    resolveLocation: async () => UDAIPUR,
    fetchForecast: async () => ({
      current: { weatherCode: 61, tempC: 27 },
      hourly: hourly(NOW, 48),
      daily: [],
      fetchedAt: NOW,
    }),
    fetchEnsemble: async () => ({ time: [], series: [] }),
    warningsForPoint: async () => [],
    scoreRisk: async () => ({ overall: 'HIGH', score: 74, floored_by: null }),
    scoreUncertainty: async () => ({ level: 'MEDIUM', reasons: [] }),
    composeAnswer: async (ctx) => ({ summary: 'composed', _ctx: ctx, composer: 'deterministic' }),
    ...over,
  }
}

// --------------------------------------------------------------- location ---

test('an explicitly named place beats the previous turn', async () => {
  // "will it rain in Jaipur" must never be answered about the saved village.
  const loc = await resolveForQuestion(
    { location: 'Jaipur' },
    { history: [{ location: UDAIPUR }] },
    deps({ resolveLocation: async () => JAIPUR }),
  )
  assert.equal(loc.name, 'Jaipur')
  assert.equal(loc.resolvedFrom, 'question')
})

test('a follow-up with no place inherits the previous turn', async () => {
  // This is what makes "what about tomorrow evening?" work.
  const loc = await resolveForQuestion(
    { location: null },
    { history: [{ location: UDAIPUR }] },
    deps(),
  )
  assert.equal(loc.name, 'Udaipur')
  assert.equal(loc.resolvedFrom, 'previous-turn')
})

test('a named place that cannot be resolved is a dead end, not a fallback', async () => {
  const loc = await resolveForQuestion(
    { location: 'Nowhereville' },
    { history: [{ location: UDAIPUR }], lat: 24.5, lon: 73.7 },
    deps({ resolveLocation: async () => null }),
  )
  assert.equal(loc, null)
})

test('coordinates are used when nothing else is available', async () => {
  const loc = await resolveForQuestion({ location: null }, { lat: 24.5, lon: 73.7 }, deps())
  assert.equal(loc.resolvedFrom, 'coordinates')
})

// ----------------------------------------------------------------- window ---

test('tomorrow evening selects tomorrow evening', () => {
  const w = windowFor(
    hourly(NOW, 72),
    { day_offset: 1, from_hour: 16, to_hour: 21, label: 'tomorrow evening' },
    NOW,
  )
  assert.equal(w.start.getDate(), 5)
  assert.equal(w.start.getHours(), 16)
  assert.equal(w.end.getHours(), 21)
})

test('a window never looks backwards', () => {
  // Asked at 09:00 about "this morning", answer from now on — not with hours
  // that have already happened.
  const w = windowFor(hourly(NOW, 24), { day_offset: 0, from_hour: 5, to_hour: 11 }, NOW)
  assert.ok(w.start.getTime() >= NOW.getTime())
})

test('rainfall is summed only over the requested window', () => {
  const w = windowFor(hourly(NOW, 48, 10), { day_offset: 0, from_hour: null, to_hour: null }, NOW)
  // 24 hours at 10 mm, not all 48.
  assert.equal(w.forecast.rain_mm, 240)
})

test('an empty window produces nulls rather than zeros', () => {
  const w = windowFor([], { day_offset: 0 }, NOW)
  assert.equal(w.forecast.wind_kmh, null)
  assert.equal(w.forecast.tmax, null)
})

// ------------------------------------------------------------ degradation ---

test('an unresolvable location still returns a well-formed turn', async () => {
  const out = await answerQuestion(
    { text: 'will it rain in Nowhereville', now: NOW },
    deps({
      parseNlu: async () => ({
        intent: 'rain_forecast', language: 'en', location: 'Nowhereville',
        location_hint: null, window: { day_offset: 0, label: 'today' }, variables: [],
      }),
      resolveLocation: async () => null,
    }),
  )
  assert.equal(out.location, null)
  assert.equal(out.unresolved, 'Nowhereville')
  assert.equal(out.forecast, null)
  assert.equal(out.degraded, true)
})

test('the risk engine being down still returns forecast and warnings', async () => {
  const out = await answerQuestion({ text: 'will it rain', q: 'Udaipur', now: NOW }, deps({
    scoreRisk: async () => null,
  }))
  assert.equal(out.risk, null)
  assert.ok(out.forecast)
  assert.equal(out.degraded, true)
})

test('the composer being down still returns the structured context', async () => {
  const out = await answerQuestion({ text: 'will it rain', q: 'Udaipur', now: NOW }, deps({
    composeAnswer: async () => null,
  }))
  assert.equal(out.answer, null)
  assert.ok(out.risk)
  assert.ok(out.forecast)
})

test('the forecast being down does not suppress an active warning', async () => {
  // The whole point of fetching them in parallel: a dead forecast API must not
  // cost the user a warning they need to see.
  const out = await answerQuestion({ text: 'will it rain', q: 'Udaipur', now: NOW }, deps({
    fetchForecast: async () => { throw new Error('upstream down') },
    warningsForPoint: async () => [{
      identifier: 'W1', status: 'active', severity: 'Severe', colour: 'orange',
      event: 'Heavy Rainfall', headline: 'Very heavy rainfall likely.',
      expires: new Date(NOW.getTime() + 6 * 3600e3),
    }],
  }))
  assert.equal(out.forecast, null)
  assert.equal(out.warnings.length, 1)
  assert.equal(out.highestWarning.identifier, 'W1')
})

// --------------------------------------------------------------- warnings ---

test('an expired warning is never returned as active', async () => {
  const out = await answerQuestion({ text: 'any warnings', q: 'Udaipur', now: NOW }, deps({
    warningsForPoint: async () => [
      { identifier: 'OLD', status: 'active', severity: 'Severe', colour: 'orange',
        expires: new Date(NOW.getTime() - 3600e3) },
      { identifier: 'LIVE', status: 'active', severity: 'Moderate', colour: 'yellow',
        expires: new Date(NOW.getTime() + 3600e3) },
    ],
  }))
  assert.deepEqual(out.warnings.map((w) => w.identifier), ['LIVE'])
})

test('official warning text reaches the composer unedited', async () => {
  let seen = null
  const headline = 'Very heavy rainfall very likely at isolated places over Udaipur district.'
  await answerQuestion({ text: 'will it rain', q: 'Udaipur', now: NOW }, deps({
    warningsForPoint: async () => [{
      identifier: 'W1', status: 'active', severity: 'Severe', colour: 'orange',
      event: 'Heavy Rainfall', headline, instruction: 'Avoid low-lying roads.',
      senderName: 'IMD Jaipur', expires: new Date(NOW.getTime() + 6 * 3600e3),
    }],
    composeAnswer: async (ctx) => { seen = ctx; return { summary: 'x' } },
  }))
  assert.equal(seen.warnings[0].headline, headline)
  assert.equal(seen.warnings[0].instruction, 'Avoid low-lying roads.')
})

test('the composer receives the engine risk band, not a recomputed one', async () => {
  // Including the safety floor. Nothing downstream of the risk engine is
  // allowed to move the band.
  let seen = null
  await answerQuestion({ text: 'will it rain', q: 'Udaipur', now: NOW }, deps({
    scoreRisk: async () => ({
      overall: 'HIGH', score: 22, computed_band: 'LOW',
      floored_by: { colour: 'orange', minimum: 'HIGH', raised_from: 'LOW' },
    }),
    composeAnswer: async (ctx) => { seen = ctx; return { summary: 'x' } },
  }))
  assert.equal(seen.risk.overall, 'HIGH')
  assert.equal(seen.risk.floored_by.minimum, 'HIGH')
})

test('the detected language is passed through to the composer', async () => {
  let seen = null
  await answerQuestion({ text: 'kal barish hogi kya', q: 'Udaipur', now: NOW }, deps({
    parseNlu: async () => ({
      intent: 'rain_forecast', language: 'hinglish', location: null, location_hint: 'self',
      window: { day_offset: 1, from_hour: null, to_hour: null, label: 'tomorrow' },
      variables: ['precipitation'],
    }),
    composeAnswer: async (ctx) => { seen = ctx; return { summary: 'x' } },
  }))
  assert.equal(seen.language, 'hinglish')
})
