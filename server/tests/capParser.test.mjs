import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import { parseFeed, normaliseAlert } from '../src/services/capParser.js'

const here = path.dirname(fileURLToPath(import.meta.url))
const fixture = (name) => readFileSync(path.join(here, 'fixtures', name), 'utf8')

/**
 * These fixtures are real documents captured from NDMA Sachet on 2026-09-04,
 * not hand-written approximations. That matters: the live feed differs from the
 * CAP examples in three ways the parser originally got wrong, and every one of
 * them was invisible because `capIngest` silently fell back to the bundled
 * sample file when the feed URL 404'd.
 */

test('parses a real Sachet CAP document', () => {
  const { alerts } = parseFeed(fixture('sachet-alert.xml'))
  assert.equal(alerts.length, 1)

  const a = alerts[0]
  assert.equal(a.identifier, 'IN-1788468893661013_58')
  assert.equal(a.event, 'Moderate Rain')
  assert.equal(a.severity, 'Severe')
  assert.equal(a.colour, 'orange')
  assert.equal(a.urgency, 'Expected')
  assert.equal(a.certainty, 'Likely')
})

test('senderName falls back to sender when the element is absent', () => {
  // Real Sachet documents carry <cap:sender> but no <cap:senderName>. Without
  // the fallback the UI renders a warning attributed to nobody, which is worse
  // than useless on a card whose whole job is to be authoritative.
  const { alerts } = parseFeed(fixture('sachet-alert.xml'))
  assert.equal(alerts[0].sender, 'IMD-Lucknow')
  assert.equal(alerts[0].senderName, 'IMD-Lucknow')
})

test('official text is copied verbatim', () => {
  const { alerts } = parseFeed(fixture('sachet-alert.xml'))
  assert.equal(
    alerts[0].headline,
    'Thunder with lightning and Moderate to intense Rain is very likely to occur at a few places over Jhansi, Lalitpur in next 3 hours.',
  )
  assert.equal(alerts[0].instruction, 'Please follow SDMA guidelines.')
})

test('an empty description does not become the string "undefined"', () => {
  // <cap:description/> is an empty element; a naive read yields {} or "".
  const { alerts } = parseFeed(fixture('sachet-alert.xml'))
  const d = alerts[0].description
  assert.ok(d === undefined || d === '', `description was ${JSON.stringify(d)}`)
})

test('captures the Polygon URL parameter', () => {
  // Sachet does not inline <cap:polygon>. It publishes a parameter pointing at
  // a separate document, so geometry has to be fetched (or, as today, 403s and
  // district matching carries the load).
  const { alerts } = parseFeed(fixture('sachet-alert.xml'))
  assert.match(alerts[0].polygonUrl, /FetchPolygonXMLFile\?identifier=1788468893661013/)
})

test('district is extracted from a bare areaDesc', () => {
  const { alerts } = parseFeed(fixture('sachet-alert.xml'))
  assert.deepEqual(alerts[0].area.districts, ['Lalitpur'])
})

test('expiry is parsed as a date, not a string', () => {
  const { alerts } = parseFeed(fixture('sachet-alert.xml'))
  assert.ok(alerts[0].expires instanceof Date)
  assert.equal(alerts[0].expires.toISOString(), '2026-09-03T23:54:00.000Z')
})

test('follows item links from the real RSS index', () => {
  // The index embeds no alerts at all — it lists CAP documents. A parser that
  // only handled embedded alerts would report zero warnings for all of India
  // and look like it was working.
  const { alerts, links } = parseFeed(fixture('sachet-rss.xml'))
  assert.equal(alerts.length, 0)
  assert.equal(links.length, 6)
  assert.match(links[0], /FetchXMLFile\?identifier=/)
})

test('a non-XML page yields nothing rather than throwing', () => {
  // sachet.ndma.gov.in/CapFeed returns an HTML app shell. The old default
  // pointed there, so every ingest silently produced zero alerts.
  const { alerts, links } = parseFeed('<!DOCTYPE html><html><body><div>SACHET</div></body></html>')
  assert.equal(alerts.length, 0)
  assert.equal(links.length, 0)
})

test('an alert with no identifier is dropped', () => {
  assert.equal(normaliseAlert({ info: { event: 'Rain' } }), null)
})

test('cancelled messages are not stored as active', () => {
  const a = normaliseAlert({
    identifier: 'X1',
    msgType: 'Cancel',
    sender: 'IMD',
    info: { event: 'Rain', severity: 'Severe', area: { areaDesc: 'Jaipur' } },
  })
  assert.equal(a.status, 'cancelled')
})

test('an English info block is preferred over other languages', () => {
  const a = normaliseAlert({
    identifier: 'X2',
    sender: 'AP SDMA',
    info: [
      { language: 'te-IN', event: 'పిడుగులు', severity: 'Moderate', headline: 'telugu' },
      { language: 'en-IN', event: 'Lightning', severity: 'Moderate', headline: 'english' },
    ],
  })
  assert.equal(a.headline, 'english')
  assert.equal(a.event, 'Lightning')
})
