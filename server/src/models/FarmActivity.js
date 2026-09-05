import mongoose from 'mongoose'

/**
 * Farm Activity entity for the agricultural journal.
 */
const farmActivitySchema = new mongoose.Schema(
  {
    farmId: { type: String, required: true, index: true },
    fieldId: { type: String, default: null },
    userId: { type: String, default: 'anonymous', index: true },
    activityType: {
      type: String,
      enum: [
        'irrigation',
        'fertilizer',
        'spraying',
        'pesticide',
        'weeding',
        'ploughing',
        'sowing',
        'harvest',
        'pest_scout',
        'disease_scout',
        'soil_test',
        'livestock_care',
        'other',
      ],
      required: true,
    },
    crop: { type: String, trim: true, maxlength: 80 },
    date: { type: Date, default: Date.now },
    quantity: { type: Number, default: null },
    unit: { type: String, trim: true, maxlength: 30, default: null },
    cost: { type: Number, default: 0 },
    notes: { type: String, trim: true, maxlength: 1000 },
    photoUrl: { type: String, trim: true, default: null },
  },
  {
    timestamps: true,
  },
)

farmActivitySchema.index({ farmId: 1, date: -1 })

export const FarmActivity = mongoose.models.FarmActivity || mongoose.model('FarmActivity', farmActivitySchema)
export default FarmActivity
