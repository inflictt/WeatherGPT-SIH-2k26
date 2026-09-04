import { z } from 'zod'
import { Subscription } from '../models/Subscription.js'
import { PushSubscription } from '../models/PushSubscription.js'
import { pushEnabled, vapidPublicKey } from '../services/push.js'
import { badRequest, notFound } from '../utils/AppError.js'

/**
 * Saved locations, and the browser push endpoints they notify.
 *
 * Two separate things on purpose: a *place* someone wants to hear about, and a
 * *device* that can be reached. One person has several of each, and losing a
 * phone must not lose their saved village.
 */

export const subscribeSchema = z.object({
  name: z.string().trim().min(1).max(80),
  district: z.string().trim().max(60).optional(),
  state: z.string().trim().max(60).optional(),
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
  minSeverity: z.enum(['Minor', 'Moderate', 'Severe', 'Extreme']).default('Severe'),
  active: z.boolean().default(true),
})

/**
 * The shape the browser's PushManager returns. Validated rather than trusted:
 * this value is stored and later handed to a third-party push service.
 */
export const pushSchema = z.object({
  subscription: z.object({
    endpoint: z.string().url().max(2000),
    expirationTime: z.union([z.number(), z.null()]).optional(),
    keys: z.object({
      p256dh: z.string().min(1).max(255),
      auth: z.string().min(1).max(255),
    }),
  }),
})

export async function list(req, res) {
  const rows = await Subscription.find({ userId: req.user._id }).sort({ createdAt: 1 }).lean()
  res.json({
    subscriptions: rows.map((r) => ({
      id: String(r._id),
      name: r.label,
      district: r.district,
      state: r.state,
      lat: r.lat,
      lon: r.lon,
      minSeverity: r.minSeverity,
      active: r.active,
    })),
    pushAvailable: pushEnabled(),
    devices: await PushSubscription.countDocuments({ userId: req.user._id }),
  })
}

export async function subscribe(req, res) {
  const b = req.body
  // Upsert on (user, place) so saving the same village twice updates rather
  // than duplicating — the client retries, and a duplicate would double-notify.
  const row = await Subscription.findOneAndUpdate(
    { userId: req.user._id, label: b.name, district: b.district ?? null },
    {
      userId: req.user._id,
      label: b.name,
      district: b.district,
      state: b.state,
      lat: b.lat,
      lon: b.lon,
      point: { type: 'Point', coordinates: [b.lon, b.lat] },
      minSeverity: b.minSeverity,
      active: b.active,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  )

  res.status(201).json({
    subscription: {
      id: String(row._id),
      name: row.label,
      district: row.district,
      state: row.state,
      lat: row.lat,
      lon: row.lon,
      minSeverity: row.minSeverity,
      active: row.active,
    },
  })
}

export async function unsubscribe(req, res) {
  const result = await Subscription.deleteOne({
    _id: req.params.id,
    userId: req.user._id,
  })
  if (!result.deletedCount) throw notFound('No such saved location')
  res.json({ ok: true })
}

/** Register this browser as a device that can be reached. */
export async function registerPush(req, res) {
  if (!pushEnabled()) {
    throw badRequest('Push notifications are not configured on this server')
  }
  const sub = req.body.subscription
  await PushSubscription.findOneAndUpdate(
    { endpoint: sub.endpoint },
    {
      userId: req.user._id,
      endpoint: sub.endpoint,
      endpointJson: sub,
      userAgent: String(req.headers['user-agent'] || '').slice(0, 200),
      lastSeenAt: new Date(),
    },
    { upsert: true, new: true },
  )
  res.status(201).json({ ok: true })
}

/**
 * The VAPID public key, so the browser can subscribe. Public by definition —
 * it is handed to every client — and unauthenticated so the page can fetch it
 * before anyone signs in.
 */
export function vapidKey(_req, res) {
  res.json({ publicKey: vapidPublicKey(), enabled: pushEnabled() })
}
