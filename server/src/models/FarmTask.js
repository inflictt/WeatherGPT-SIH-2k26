import mongoose from 'mongoose'

/**
 * Weather-aware Farm Task entity.
 */
const farmTaskSchema = new mongoose.Schema(
  {
    farmId: { type: String, required: true, index: true },
    fieldId: { type: String, default: null },
    userId: { type: String, default: 'anonymous', index: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    type: {
      type: String,
      enum: [
        'irrigation',
        'spray',
        'fertilizer',
        'weeding',
        'sowing',
        'harvest',
        'inspection',
        'drainage',
        'tillage',
        'livestock',
        'other',
      ],
      default: 'other',
    },
    crop: { type: String, trim: true, maxlength: 80 },
    dueDate: { type: Date, required: true },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    status: {
      type: String,
      enum: ['upcoming', 'today', 'completed', 'skipped', 'overdue'],
      default: 'upcoming',
    },
    completedAt: Date,
    notes: { type: String, trim: true, maxlength: 500 },
    weatherDependency: {
      noRainRequired: { type: Boolean, default: false },
      maxWindKmh: { type: Number, default: null },
      maxTempC: { type: Number, default: null },
    },
    weatherConflict: {
      hasConflict: { type: Boolean, default: false },
      severity: { type: String, enum: ['advisory', 'warning', 'critical', null], default: null },
      reason: { type: String, trim: true, default: null },
      recommendation: { type: String, trim: true, default: null },
    },
  },
  {
    timestamps: true,
  },
)

farmTaskSchema.index({ farmId: 1, dueDate: 1, status: 1 })

export const FarmTask = mongoose.models.FarmTask || mongoose.model('FarmTask', farmTaskSchema)
export default FarmTask
