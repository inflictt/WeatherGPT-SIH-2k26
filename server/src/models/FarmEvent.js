import mongoose from 'mongoose'

/**
 * Farm Event entity for historical farm memory & timeline.
 */
const farmEventSchema = new mongoose.Schema(
  {
    farmId: { type: String, required: true, index: true },
    fieldId: { type: String, default: null },
    userId: { type: String, default: 'anonymous', index: true },
    eventType: {
      type: String,
      enum: [
        'WEATHER_CHANGE',
        'HEAVY_RAIN',
        'ALERT',
        'IRRIGATION',
        'SPRAY',
        'DISEASE_SCAN',
        'SOIL_SCAN',
        'TASK_COMPLETED',
        'TASK_CONFLICT',
        'HARVEST',
        'AI_RECOMMENDATION',
        'NOTE',
      ],
      required: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 150 },
    description: { type: String, trim: true, maxlength: 1000 },
    timestamp: { type: Date, default: Date.now, index: true },
    severity: { type: String, enum: ['info', 'advisory', 'warning', 'critical'], default: 'info' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
  },
)

farmEventSchema.index({ farmId: 1, timestamp: -1 })

export const FarmEvent = mongoose.models.FarmEvent || mongoose.model('FarmEvent', farmEventSchema)
export default FarmEvent
