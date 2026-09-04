import mongoose from 'mongoose'

/**
 * A CAP 1.2 alert, normalised. §7 of the PRD: the official text fields are
 * stored verbatim and must never be rewritten by any later stage.
 */
const warningSchema = new mongoose.Schema(
  {
    identifier: { type: String, required: true, unique: true, index: true },
    sender: String,
    senderName: String,
    event: { type: String, index: true },

    // CAP severity ladder, and the IMD colour we map it onto for the UI
    severity: {
      type: String,
      enum: ['Unknown', 'Minor', 'Moderate', 'Severe', 'Extreme'],
      default: 'Unknown',
      index: true,
    },
    urgency: String,
    certainty: String,
    colour: { type: String, enum: ['green', 'yellow', 'orange', 'red'], default: 'yellow', index: true },

    area: {
      description: String,
      state: { type: String, index: true },
      districts: { type: [String], default: [], index: true },
      // Present only when the CAP alert carried a polygon or circle.
      geometry: {
        type: { type: String, enum: ['Polygon', 'MultiPolygon', 'Point'] },
        coordinates: mongoose.Schema.Types.Mixed,
      },
    },

    sent: { type: Date, index: true },
    effective: Date,
    expires: { type: Date, index: true },

    // --- verbatim official text. Do not transform. ---
    headline: String,
    description: String,
    instruction: String,

    sourceUrl: String,
    // Sachet publishes geometry at a separate URL rather than inline. It 403s
    // for now, so district matching does the geo-match — but keeping the URL
    // means the map gains real polygons the day it opens, with no re-ingest.
    polygonUrl: String,
    raw: { type: String, select: false }, // original XML, for audit
    status: { type: String, enum: ['active', 'expired', 'cancelled'], default: 'active', index: true },
    ingestedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
)

warningSchema.index({ 'area.geometry': '2dsphere' })
warningSchema.index({ status: 1, expires: 1 })

/** A warning is only active if the clock agrees, not just the stored flag. */
warningSchema.methods.isLive = function isLive(now = new Date()) {
  return this.status === 'active' && (!this.expires || this.expires > now)
}

export const Warning = mongoose.model('Warning', warningSchema)
