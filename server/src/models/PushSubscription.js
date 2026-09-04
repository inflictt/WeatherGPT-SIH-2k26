import mongoose from 'mongoose'

/**
 * One browser push endpoint. A user can have several — phone, laptop, the
 * installed PWA — and each is registered independently.
 *
 * The endpoint URL is unique because that is what the browser guarantees;
 * re-registering the same device updates the row rather than adding a second.
 */
const pushSubscriptionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    endpoint: { type: String, required: true, unique: true },
    // The full PushSubscription JSON, as web-push wants it.
    endpointJson: { type: mongoose.Schema.Types.Mixed, required: true },
    userAgent: String,
    lastSeenAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
)

export const PushSubscription = mongoose.model('PushSubscription', pushSubscriptionSchema)
