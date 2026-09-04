import mongoose from 'mongoose'

/**
 * The gazetteer. Seeded once from a free open dataset, then queried locally —
 * this is why village-level lookup works when a live geocoder would fail.
 */
const locationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    // lowercased, unaccented, for fuzzy matching
    slug: { type: String, required: true, index: true },
    aliases: { type: [String], default: [], index: true },
    kind: {
      type: String,
      enum: ['state', 'district', 'city', 'town', 'village'],
      default: 'city',
      index: true,
    },
    district: { type: String, trim: true, index: true },
    state: { type: String, trim: true, index: true },
    lat: { type: Number, required: true },
    lon: { type: Number, required: true },
    // GeoJSON, [lon, lat] order — required by 2dsphere
    point: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true },
    },
    // Terrain flags the risk engine reads (§8 flood composite)
    urbanFloodProne: { type: Boolean, default: false },
    zone: { type: String, enum: ['plains', 'coastal', 'hills'], default: 'plains' },
    population: Number,
  },
  { timestamps: true },
)

locationSchema.index({ point: '2dsphere' })
locationSchema.index({ slug: 1, state: 1 })

locationSchema.pre('validate', function setPoint(next) {
  if (this.lat != null && this.lon != null) {
    this.point = { type: 'Point', coordinates: [this.lon, this.lat] }
  }
  next()
})

export const Location = mongoose.model('Location', locationSchema)
