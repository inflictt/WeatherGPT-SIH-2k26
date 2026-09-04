import mongoose from 'mongoose'

/**
 * A farm — PRD §12, §29.
 *
 * Two privacy decisions are baked into the schema rather than left to a
 * controller, because a controller can be bypassed and a schema cannot:
 *
 *   * **Coordinates are stored but never selected by default.** `select: false`
 *     means every query has to ask for them explicitly, so an accidental
 *     `Farm.find()` in a new endpoint cannot leak a household's location.
 *   * **`toJSON` strips them again**, so even a document that *did* load
 *     coordinates cannot serialise them into a response by accident.
 *
 * The rest is deliberately sparse. §12 lists a dozen optional fields; storing
 * a field nobody reads is a liability, so this holds what the engines
 * actually consume and nothing more.
 */
const cropSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    variety: { type: String, trim: true, maxlength: 60 },
    sownAt: Date,
    areaHa: Number,
    // Set only when the farmer overrides the calendar's estimate. Null means
    // "use the estimate", which is honest; a stored guess would not be.
    stageOverride: { type: String, trim: true, maxlength: 40 },
  },
  { _id: true, timestamps: false },
)

const farmSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },

    // Sensitive. See the note above — both guards are deliberate.
    lat: { type: Number, select: false },
    lon: { type: Number, select: false },

    district: { type: String, trim: true, maxlength: 80 },
    state: { type: String, trim: true, maxlength: 80 },

    areaHa: Number,
    soilType: { type: String, trim: true, maxlength: 40 },
    //: Set when the soil type came from the image classifier rather than the
    //  farmer, so the interface can say which and show the confidence.
    soilSource: { type: String, enum: ['manual', 'model', null], default: null },
    soilConfidence: Number,

    irrigationType: { type: String, trim: true, maxlength: 40 },
    waterAvailability: { type: String, trim: true, maxlength: 40 },
    season: { type: String, trim: true, maxlength: 40 },

    crops: { type: [cropSchema], default: [] },

    lastIrrigatedAt: Date,
    soilMoisturePct: Number,
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        // Belt and braces: even if a query asked for them, they do not leave.
        delete ret.lat
        delete ret.lon
        delete ret.__v
        return ret
      },
    },
  },
)

//: One farmer can have several farms, but not two with the same name.
farmSchema.index({ userId: 1, name: 1 }, { unique: true })

export const Farm = mongoose.models.Farm || mongoose.model('Farm', farmSchema)
export default Farm
