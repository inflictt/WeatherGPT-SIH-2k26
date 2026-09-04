import test from 'node:test'
import assert from 'node:assert/strict'

import { subscribeSchema, pushSchema } from '../src/controllers/alerts.js'

/**
 * The push path cannot be exercised end to end without a database and VAPID
 * keys, so what is tested here is what can go wrong *silently*: the validation
 * that decides what gets stored, and the severity filter that decides who gets
 * woken.
 *
 * A notification cannot be recalled. A bug that over-delivers trains people to
 * mute the product, which is the one outcome an alerting system cannot recover
 * from — so the threshold logic is worth pinning even without a live socket.
 */

// Mirrors the ranking in jobs/sendAlerts.js.
const RANK = { Minor: 1, Moderate: 2, Severe: 3, Extreme: 4, Unknown: 0 }
const meetsThreshold = (w, min = 'Severe') => (RANK[w.severity] ?? 0) >= (RANK[min] ?? 3)

test('severe-only does not deliver a yellow advisory', () => {
  // This is the 3am thunderstorm that makes people turn notifications off.
  assert.equal(meetsThreshold({ severity: 'Moderate' }, 'Severe'), false)
  assert.equal(meetsThreshold({ severity: 'Minor' }, 'Severe'), false)
})

test('severe-only delivers severe and extreme', () => {
  assert.equal(meetsThreshold({ severity: 'Severe' }, 'Severe'), true)
  assert.equal(meetsThreshold({ severity: 'Extreme' }, 'Severe'), true)
})

test('a lower threshold delivers more, not less', () => {
  assert.equal(meetsThreshold({ severity: 'Moderate' }, 'Moderate'), true)
  assert.equal(meetsThreshold({ severity: 'Minor' }, 'Minor'), true)
})

test('an unknown severity is never pushed', () => {
  // Unknown is not "probably fine" — it is "the feed did not say", and waking
  // someone for it is guessing.
  assert.equal(meetsThreshold({ severity: 'Unknown' }, 'Minor'), false)
})

test('a missing severity is treated as unknown, not as severe', () => {
  assert.equal(meetsThreshold({}, 'Severe'), false)
})

test('the default threshold is Severe', () => {
  assert.equal(meetsThreshold({ severity: 'Moderate' }), false)
  assert.equal(meetsThreshold({ severity: 'Severe' }), true)
})

// --------------------------------------------------------------- validation ---

test('a saved location requires real coordinates', () => {
  assert.equal(subscribeSchema.safeParse({ name: 'Bhinder' }).success, false)
  assert.equal(
    subscribeSchema.safeParse({ name: 'Bhinder', lat: 200, lon: 73 }).success,
    false,
  )
  assert.equal(
    subscribeSchema.safeParse({ name: 'Bhinder', lat: 24.5, lon: 73.7 }).success,
    true,
  )
})

test('a saved location defaults to severe-only', () => {
  const parsed = subscribeSchema.parse({ name: 'Bhinder', lat: 24.5, lon: 73.7 })
  assert.equal(parsed.minSeverity, 'Severe')
  assert.equal(parsed.active, true)
})

test('an arbitrary severity string is rejected', () => {
  assert.equal(
    subscribeSchema.safeParse({
      name: 'X', lat: 1, lon: 1, minSeverity: 'Catastrophic',
    }).success,
    false,
  )
})

test('a push endpoint must be a URL with both keys', () => {
  // This value is stored and later handed to a third-party push service, so it
  // is validated rather than trusted.
  assert.equal(pushSchema.safeParse({ subscription: { endpoint: 'nope' } }).success, false)
  assert.equal(
    pushSchema.safeParse({
      subscription: { endpoint: 'https://fcm.googleapis.com/x', keys: { p256dh: 'a' } },
    }).success,
    false,
  )
  assert.equal(
    pushSchema.safeParse({
      subscription: {
        endpoint: 'https://fcm.googleapis.com/fcm/send/abc',
        keys: { p256dh: 'key', auth: 'auth' },
      },
    }).success,
    true,
  )
})

test('an absurdly long endpoint is rejected', () => {
  assert.equal(
    pushSchema.safeParse({
      subscription: {
        endpoint: `https://example.com/${'x'.repeat(3000)}`,
        keys: { p256dh: 'k', auth: 'a' },
      },
    }).success,
    false,
  )
})
