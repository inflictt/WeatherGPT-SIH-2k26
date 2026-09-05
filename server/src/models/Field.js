import mongoose from 'mongoose'

/**
 * Field entity representing a distinct parcel/plot of the farm.
 */
const fieldSchema = new mongoose.Schema(
  {
    farmId: { type: String, required: true, index: true },
    userId: { type: String, default: 'anonymous', index: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    areaHa: { type: Number, required: true, min: 0.01 },
    soilType: { type: String, trim: true, maxlength: 50 },
    irrigationType: { type: String, trim: true, maxlength: 50 },
    waterAvailability: { type: String, trim: true, maxlength: 50 },
    healthStatus: {
      type: String,
      enum: ['healthy', 'attention', 'elevated_risk', 'critical'],
      default: 'healthy',
    },
    boundary: {
      type: Array, // Array of [lat, lon] points for Leaflet polygon
      default: [],
    },
    assignedCropName: { type: String, trim: true, maxlength: 80 },
    assignedCropVariety: { type: String, trim: true, maxlength: 80 },
    sownAt: Date,
    notes: { type: String, trim: true, maxlength: 500 },
  },
  {
    timestamps: true,
  },
)

fieldSchema.index({ farmId: 1, name: 1 })

export const Field = mongoose.models.Field || mongoose.model('Field', fieldSchema)
export default Field
