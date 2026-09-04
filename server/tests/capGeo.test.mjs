/**
 * Runs with zero dependencies:  node --test tests/
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  severityToColour,
  polygonToGeoJson,
  circleToGeoJson,
  districtsFromAreaDesc,
} from '../src/services/capGeo.js'

test('CAP severity maps onto the IMD colour ladder', () => {
  assert.equal(severityToColour('Extreme'), 'red')
  assert.equal(severityToColour('Severe'), 'orange')
  assert.equal(severityToColour('Moderate'), 'yellow')
  assert.equal(severityToColour('Minor'), 'yellow')
  assert.equal(severityToColour('Unknown'), 'green')
  assert.equal(severityToColour('extreme'), 'red', 'case insensitive')
})

test('colour falls back to the event text when severity is absent', () => {
  assert.equal(severityToColour(null, 'Orange alert: heavy rainfall'), 'orange')
  assert.equal(severityToColour('', 'RED WARNING'), 'red')
})

test('polygon converts lat,lon pairs to closed GeoJSON [lon,lat] rings', () => {
  const g = polygonToGeoJson('24.5,73.7 24.9,73.7 24.9,74.2 24.5,74.2')
  assert.equal(g.type, 'Polygon')
  const ring = g.coordinates[0]
  assert.deepEqual(ring[0], [73.7, 24.5], 'lon first')
  assert.equal(ring.length, 5, 'ring is closed by repeating the first point')
  assert.deepEqual(ring[0], ring[ring.length - 1])
})

test('an already-closed polygon is not double-closed', () => {
  const g = polygonToGeoJson('24.5,73.7 24.9,73.7 24.9,74.2 24.5,73.7')
  assert.equal(g.coordinates[0].length, 4)
})

test('degenerate polygons are rejected rather than stored', () => {
  assert.equal(polygonToGeoJson('24.5,73.7 24.9,73.7'), null)
  assert.equal(polygonToGeoJson(''), null)
  assert.equal(polygonToGeoJson(null), null)
})

test('circle becomes a closed polygon of the right size', () => {
  const g = circleToGeoJson('24.58,73.71 50')
  assert.equal(g.type, 'Polygon')
  const ring = g.coordinates[0]
  assert.equal(ring.length, 25)
  assert.deepEqual(ring[0], ring[ring.length - 1])
  // 50 km north of 24.58° is roughly 0.45° of latitude
  const north = Math.max(...ring.map(([, lat]) => lat))
  assert.ok(north - 24.58 > 0.4 && north - 24.58 < 0.5, `got ${north - 24.58}`)
})

test('areaDesc splits into district names with the noise removed', () => {
  assert.deepEqual(
    districtsFromAreaDesc('Udaipur District, Rajsamand and Chittorgarh districts'),
    ['Udaipur', 'Rajsamand', 'Chittorgarh'],
  )
  assert.deepEqual(districtsFromAreaDesc(''), [])
})
