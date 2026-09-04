import webpush from 'web-push'
import { env } from '../config/env.js'
import { NotificationLog } from '../models/NotificationLog.js'
import { log } from '../utils/logger.js'

/**
 * Browser push, and the deduplication that makes it tolerable.
 *
 * The single most important property here is that **a person is told about a
 * warning once**. An alerting system that repeats itself gets muted, and a
 * muted alerting system is worse than none — the user has now been trained to
 * ignore precisely the thing this product exists to deliver.
 *
 * That guarantee is not application logic. It is the unique index on
 * (userId, identifier) in NotificationLog: the insert either succeeds, and we
 * send, or it collides, and we do not. Two servers racing on the same warning
 * cannot both win, which a `findOne`-then-`send` check could not promise.
 *
 * Without VAPID keys the whole feature disables itself cleanly and /api/health
 * reports it, rather than throwing on the first send.
 */

let configured = false

export function pushEnabled() {
  return Boolean(env.vapidPublicKey && env.vapidPrivateKey)
}

function configure() {
  if (configured || !pushEnabled()) return pushEnabled()
  webpush.setVapidDetails(
    `mailto:${env.contactEmail}`,
    env.vapidPublicKey,
    env.vapidPrivateKey,
  )
  configured = true
  return true
}

/** MongoDB duplicate-key error. The dedupe working, not a failure. */
const isDuplicate = (err) => err?.code === 11000

/**
 * Send one warning to one user, at most once, ever.
 * @returns {'sent'|'duplicate'|'gone'|'disabled'|'failed'}
 */
export async function notifyOnce(user, warning, subscriptions) {
  if (!configure()) return 'disabled'
  if (!subscriptions?.length) return 'failed'

  // Claim the right to send *before* sending. If this throws a duplicate, some
  // other run already has it, and we stop.
  try {
    await NotificationLog.create({
      userId: user._id,
      identifier: warning.identifier,
      channel: 'push',
    })
  } catch (err) {
    if (isDuplicate(err)) return 'duplicate'
    throw err
  }

  // The official headline, verbatim. A notification is the one surface where a
  // paraphrase would be read as the warning itself.
  const payload = JSON.stringify({
    title: `${(warning.colour || 'weather').toUpperCase()} alert · ${warning.event || 'Weather warning'}`,
    body: warning.headline || warning.description || 'An official warning is active for your area.',
    tag: warning.identifier,
    data: {
      identifier: warning.identifier,
      colour: warning.colour,
      url: `/#/alerts`,
    },
  })

  let anyDelivered = false
  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(sub.endpointJson, payload, { TTL: 6 * 3600 })
      anyDelivered = true
    } catch (err) {
      // 404/410 mean the browser dropped the subscription — the endpoint is
      // dead for good and keeping it only produces future failures.
      if (err?.statusCode === 404 || err?.statusCode === 410) {
        await removeSubscription(sub).catch(() => {})
      } else {
        log.warn('push send failed', {
          identifier: warning.identifier,
          status: err?.statusCode,
          error: String(err?.message || err),
        })
      }
    }
  }

  if (!anyDelivered) {
    // Nothing reached a device, so release the claim: the user has not in fact
    // been told, and the next run should be allowed to try again.
    await NotificationLog.deleteOne({
      userId: user._id,
      identifier: warning.identifier,
    }).catch(() => {})
    return 'gone'
  }

  return 'sent'
}

async function removeSubscription(sub) {
  const { PushSubscription } = await import('../models/PushSubscription.js')
  await PushSubscription.deleteOne({ _id: sub._id })
}

export const vapidPublicKey = () => env.vapidPublicKey || null
