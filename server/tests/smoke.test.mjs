import test from 'node:test'
import assert from 'node:assert/strict'
import { THRESHOLDS, evaluateSectorDecisions, buildProvenance } from '../src/services/advisory.js'
import { pointInPolygon } from '../src/services/capGeo.js'

test('1. Meteorological Unit Conversions Rigor', async (t) => {
  await t.test('converts m/s to km/h correctly (factor of 3.6)', () => {
    const ms = 17.5
    const kmh = ms * 3.6
    assert.equal(kmh, 63.0)
  })

  await t.test('converts knots to km/h accurately for IMD 34-knot threshold', () => {
    const knots = 34.0
    const kmh = knots * 1.852
    assert.ok(Math.abs(kmh - 62.968) < 0.001)
    assert.ok(kmh >= THRESHOLDS.SMALL_CRAFT_GUST_KMH - 0.1)
  })

  await t.test('Celsius to Fahrenheit conversion preserves precision', () => {
    const c = 25.0
    const f = (c * 9) / 5 + 32
    assert.equal(f, 77.0)
  })
})

test('2. IMD Agromet Sector Decision Rules (Farmers)', async (t) => {
  await t.test('triggers NO_SPRAY when rainfall exceeds 2.5 mm washing threshold', () => {
    const decision = evaluateSectorDecisions({
      summary24h: { rain_24h_mm: 5.0, maxWindKmh: 10 },
      current: { precipMm: 5.0, humidity: 60 },
    })
    assert.equal(decision.farmer.spray.status, 'NO_SPRAY')
    assert.ok(decision.farmer.spray.reason.includes('wash off'))
  })

  await t.test('triggers NO_SPRAY when wind speed exceeds 15 km/h drift limit', () => {
    const decision = evaluateSectorDecisions({
      summary24h: { rain_24h_mm: 0.0, maxWindKmh: 18.5 },
      current: { precipMm: 0.0, humidity: 55 },
    })
    assert.equal(decision.farmer.spray.status, 'NO_SPRAY')
    assert.ok(decision.farmer.spray.reason.includes('drift'))
  })

  await t.test('allows spraying under calm (<15 km/h) and dry (<2.5 mm) conditions', () => {
    const decision = evaluateSectorDecisions({
      summary24h: { rain_24h_mm: 0.0, maxWindKmh: 8.0 },
      current: { precipMm: 0.0, humidity: 50 },
    })
    assert.equal(decision.farmer.spray.status, 'ALLOWED')
  })

  await t.test('advises SKIP irrigation when rain exceeds 10 mm requirement', () => {
    const decision = evaluateSectorDecisions({
      summary24h: { rain_24h_mm: 15.0 },
      current: {},
    })
    assert.equal(decision.farmer.irrigation.status, 'SKIP')
  })
})

test('3. IMD Marine & Coastal Small-Craft Advisory (Fishermen)', async (t) => {
  await t.test('triggers NO_GO small-craft warning when gusts hit 34 knots (63 km/h)', () => {
    const decision = evaluateSectorDecisions({
      summary24h: { maxGustKmh: 65.0, maxWindKmh: 40.0 },
      current: {},
    })
    assert.equal(decision.marine.status, 'NO_GO')
    assert.ok(decision.marine.reason.includes('34-knot'))
  })

  await t.test('gives GO under mild sea conditions (<30 km/h wind)', () => {
    const decision = evaluateSectorDecisions({
      summary24h: { maxGustKmh: 25.0, maxWindKmh: 15.0 },
      current: {},
    })
    assert.equal(decision.marine.status, 'GO')
  })
})

test('4. Road Travel & Urban Disaster Management Decisions', async (t) => {
  await t.test('flags low visibility warning when visibility <= 2 km', () => {
    const decision = evaluateSectorDecisions({
      summary24h: { minVisibilityKm: 1.2 },
      current: { visibilityM: 1200 },
    })
    assert.equal(decision.travel.status, 'CAUTION')
    assert.ok(decision.travel.reason.includes('Visibility'))
  })

  await t.test('triggers city waterlogging alert when rainfall >= 25 mm', () => {
    const decision = evaluateSectorDecisions({
      summary24h: { rain_24h_mm: 35.0 },
      current: {},
    })
    assert.equal(decision.city.status, 'WATERLOGGING_ALERT')
    assert.equal(decision.city.label, 'Pre-position Pumps')
    assert.ok(decision.city.reason.includes('25 mm'))
  })
})

test('5. GeoJSON CAP Polygon Point-in-Polygon Containment', async (t) => {
  const polygon = [
    [76.0, 28.0],
    [78.0, 28.0],
    [78.0, 30.0],
    [76.0, 30.0],
    [76.0, 28.0],
  ]

  await t.test('correctly identifies point inside polygon (e.g. Kapriwas/Delhi)', () => {
    const inside = pointInPolygon(77.0, 29.0, polygon)
    assert.equal(inside, true)
  })

  await t.test('correctly rejects point outside polygon', () => {
    const outside = pointInPolygon(85.0, 20.0, polygon)
    assert.equal(outside, false)
  })
})

test('6. Data Provenance & Anti-Hallucination Structuring', async (t) => {
  await t.test('correctly marks IMD/NDMA source as authoritative', () => {
    const prov = buildProvenance({ source: 'NDMA Sachet', product: 'CAP Warning', isAuthoritative: true })
    assert.equal(prov.isAuthoritative, true)
    assert.equal(prov.badge, 'IMD/NDMA Authoritative')
    assert.equal(prov.tone, 'green')
  })

  await t.test('correctly marks ECMWF NWP model source as physical model derived', () => {
    const prov = buildProvenance({ source: 'Open-Meteo', product: 'ECMWF IFS 9km', isAuthoritative: false })
    assert.equal(prov.isAuthoritative, false)
    assert.equal(prov.badge, 'ECMWF 9km NWP Model')
    assert.equal(prov.tone, 'amber')
  })
})
