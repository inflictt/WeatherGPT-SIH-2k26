import mongoose from 'mongoose'

/** One row per (user, warning). The unique index IS the deduplication. */
const notificationLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  identifier: { type: String, required: true },
  channel: { type: String, default: 'push' },
  sentAt: { type: Date, default: Date.now },
})

notificationLogSchema.index({ userId: 1, identifier: 1 }, { unique: true })

export const NotificationLog = mongoose.model('NotificationLog', notificationLogSchema)
