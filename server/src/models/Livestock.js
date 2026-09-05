import mongoose from 'mongoose'

/**
 * Livestock entity for optional animal management.
 */
const livestockSchema = new mongoose.Schema(
  {
    farmId: { type: String, required: true, index: true },
    userId: { type: String, default: 'anonymous', index: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    type: {
      type: String,
      enum: ['cattle', 'buffalo', 'goat', 'sheep', 'poultry', 'dairy', 'other'],
      default: 'cattle',
    },
    count: { type: Number, required: true, min: 1, default: 1 },
    breed: { type: String, trim: true, maxlength: 80 },
    healthStatus: { type: String, enum: ['healthy', 'under_treatment', 'quarantine', 'critical'], default: 'healthy' },
    vaccinationNotes: { type: String, trim: true, maxlength: 500 },
    productionNotes: { type: String, trim: true, maxlength: 500 },
    notes: { type: String, trim: true, maxlength: 500 },
  },
  {
    timestamps: true,
  },
)

livestockSchema.index({ farmId: 1, type: 1 })

export const Livestock = mongoose.models.Livestock || mongoose.model('Livestock', livestockSchema)
export default Livestock
