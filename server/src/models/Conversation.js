import mongoose from 'mongoose'

/**
 * A conversation, stored so a follow-up can inherit the previous turn's place.
 *
 * Only what a later turn actually needs is kept — the question, the resolved
 * location, and a short record of what was answered. The forecast itself is
 * deliberately *not* stored: it goes stale in minutes, and a follow-up must
 * re-fetch rather than answer from a cached number.
 */
const turnSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, maxlength: 500 },
    language: { type: String, enum: ['en', 'hi', 'hinglish'] },
    intent: String,
    location: {
      name: String,
      district: String,
      state: String,
      lat: Number,
      lon: Number,
    },
    summary: String,
    riskBand: { type: String, enum: ['LOW', 'MODERATE', 'HIGH', 'EXTREME'] },
    warningRef: String,
    at: { type: Date, default: Date.now },
  },
  { _id: false },
)

const conversationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    turns: { type: [turnSchema], default: [] },
  },
  { timestamps: true },
)

conversationSchema.index({ userId: 1, updatedAt: -1 })

/** Keep threads bounded; nothing beyond the recent turns is ever consulted. */
const MAX_TURNS = 50
conversationSchema.pre('save', function trim(next) {
  if (this.turns.length > MAX_TURNS) this.turns = this.turns.slice(-MAX_TURNS)
  next()
})

export const Conversation = mongoose.model('Conversation', conversationSchema)
