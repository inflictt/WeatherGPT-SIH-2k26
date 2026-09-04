import mongoose from 'mongoose'

const subscriptionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    label: String,
    district: { type: String, index: true },
    state: String,
    lat: Number,
    lon: Number,
    point: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true },
    },
    minSeverity: { type: String, enum: ['Minor', 'Moderate', 'Severe', 'Extreme'], default: 'Severe' },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
)

subscriptionSchema.index({ point: '2dsphere' })
subscriptionSchema.index({ userId: 1, district: 1 }, { unique: false })

export const Subscription = mongoose.model('Subscription', subscriptionSchema)
