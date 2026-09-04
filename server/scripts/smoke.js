#!/usr/bin/env node
/**
 * End-to-end smoke test against a running API.
 *   npm run smoke                     # http://localhost:5000
 *   API=https://… npm run smoke
 */
const BASE = process.env.API || 'http://localhost:5000'
let pass = 0
let fail = 0

async function check(label, path, assert) {
  try {
    const res = await fetch(`${BASE}${path}`)
    const body = await res.json()
    const problem = assert(body, res)
    if (problem) throw new Error(problem)
    console.log(`  ok    ${label}`)
    pass += 1
  } catch (err) {
    console.log(`  FAIL  ${label} — ${err.message}`)
    fail += 1
  }
}

const run = async () => {
  console.log(`\nsmoke test → ${BASE}\n`)

  await check('health', '/api/health', (b) => (b.status ? null : 'no status field'))
  await check('location search', '/api/locations/search?q=udaipur', (b) =>
    b.results?.length ? null : 'no results')
  await check('current weather', '/api/weather/current?q=Udaipur', (b) =>
    b.current?.tempC != null ? null : 'no temperature')
  await check('forecast', '/api/weather/forecast?q=Udaipur&days=3', (b) =>
    b.daily?.length >= 3 ? null : 'fewer than 3 days')
  await check('ensemble spread', '/api/weather/ensemble?q=Udaipur', (b) =>
    b.totals24h?.length >= 2 ? null : 'need at least two models for a spread')
  await check('active warnings', '/api/warnings/active?district=Udaipur', (b) =>
    Array.isArray(b.warnings) ? null : 'warnings is not an array')
  await check('assessment', '/api/assess?q=Udaipur', (b) =>
    b.summary24h ? null : 'no 24h summary')
  await check('assessment carries risk', '/api/assess?q=Udaipur', (b) =>
    b.risk?.overall ? null : `risk engine not reachable (degraded=${b.degraded})`)

  console.log(`\n${pass} passed, ${fail} failed\n`)
  process.exit(fail ? 1 : 0)
}
run()
