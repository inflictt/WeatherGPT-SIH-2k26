import mongoose from 'mongoose'

/**
 * Every model inference, logged — PRD §30, §31.
 *
 * This is the research dataset, and its value depends entirely on it being
 * complete: a log that only records the confident predictions describes a
 * model that does not exist. **Failures are logged too**, with `ok: false`
 * and the error, which is what makes a real error rate computable later.
 *
 * `farmId` is stored so a farmer can see their own history. Nothing here
 * carries a name, an email or a coordinate, so a research export is an
 * anonymised dataset by construction rather than by remembering to strip
 * fields at export time (§46).
 */
const aiInferenceSchema = new mongoose.Schema(
  {
    model: { type: String, required: true, index: true },
    modelVersion: String,
    task: { type: String, enum: ['soil', 'disease', 'chat'], required: true, index: true },
    inputType: { type: String, enum: ['image', 'text'], required: true },

    ok: { type: Boolean, required: true, index: true },
    prediction: String,
    confidence: Number,
    //: Runner-up classes, when the model returns them. Useful for calibration
    //  work later and cheap to keep.
    alternatives: { type: [{ label: String, confidence: Number, _id: false }], default: [] },
    error: String,

    latencyMs: Number,

    farmId: { type: mongoose.Schema.Types.ObjectId, ref: 'Farm', index: true },
    //: The engine's band after fusing the prediction with weather, so the
    //  research set can compare the raw model against the full system (§32).
    fusedBand: String,
    //: Coarse weather at inference time, for the same reason. Bucketed rather
    //  than exact — this is for grouping, not for re-deriving a location.
    conditions: {
      humidityBand: String,
      tempBand: String,
      rainBand: String,
    },
  },
  { timestamps: true },
)

//: Research queries are almost always "this model, over this period".
aiInferenceSchema.index({ model: 1, createdAt: -1 })

export const AIInference =
  mongoose.models.AIInference || mongoose.model('AIInference', aiInferenceSchema)
export default AIInference
