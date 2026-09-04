import { Subscription } from '../models/Subscription.js'
import { PushSubscription } from '../models/PushSubscription.js'
import { User } from '../models/User.js'
import { warningsForPoint } from '../services/capIngest.js'
import { notifyOnce, pushEnabled } from '../services/push.js'
import { log } from '../utils/logger.js'

/**
 * Fan a newly active warning out to the people who asked to hear about it.
 *
 * Runs on a schedule rather than on ingest, because ingest is best-effort and a
 * warning that arrives during a failed run must still reach someone on the next
 * one. Deduplication makes re-running safe: `notifyOnce` claims each
 * (user, warning) pair through a unique index, so a warning that has already
 * been delivered is skipped no matter how many times this runs.
 *
 * Severity is filtered per subscription, not globally. Someone who asked only
 * for severe events must not be woken at 3am by a yellow thunderstorm advisory
 * — that is how people turn notifications off.
 */

const RANK = { Minor: 1, Moderate: 2, Severe: 3, Extreme: 4, Unknown: 0 }

/** Only alerts at or above the subscription's floor. */
function meetsThreshold(warning, minSeverity = 'Severe') {
  return (RANK[warning.severity] ?? 0) >= (RANK[minSeverity] ?? 3)
}

export async function sendAlerts(now = new Date()) {
  if (!pushEnabled()) {
    return { ok: false, reason: 'push_disabled', sent: 0 }
  }

  const subscriptions = await Subscription.find({ active: true }).lean()
  if (!subscriptions.length) return { ok: true, sent: 0, considered: 0 }

  // Group by user so each person's devices are fetched once.
  const byUser = new Map()
  for (const sub of subscriptions) {
    const key = String(sub.userId)
    if (!byUser.has(key)) byUser.set(key, [])
    byUser.get(key).push(sub)
  }

  let sent = 0
  let duplicate = 0
  let considered = 0

  for (const [userId, places] of byUser) {
    const [user, devices] = await Promise.all([
      User.findById(userId).lean(),
      PushSubscription.find({ userId }).lean(),
    ])
    if (!user || !devices.length) continue

    for (const place of places) {
      let warnings = []
      try {
        warnings = await warningsForPoint(
          {
            lat: place.lat,
            lon: place.lon,
            district: place.district,
            state: place.state,
          },
          now,
        )
      } catch (err) {
        log.warn('alert lookup failed', { userId, error: String(err.message || err) })
        continue
      }

      for (const warning of warnings) {
        considered += 1
        if (!meetsThreshold(warning, place.minSeverity)) continue
        // An expired warning must never be pushed — checked against the clock
        // here as well as at read time, because a notification cannot be recalled.
        if (warning.expires && new Date(warning.expires) <= now) continue

        try {
          const result = await notifyOnce({ _id: userId }, warning, devices)
          if (result === 'sent') sent += 1
          else if (result === 'duplicate') duplicate += 1
        } catch (err) {
          log.error('notify failed', {
            userId,
            identifier: warning.identifier,
            error: String(err.message || err),
          })
        }
      }
    }
  }

  const result = { ok: true, users: byUser.size, considered, sent, duplicate }
  if (sent) log.info('alerts sent', result)
  return result
}
