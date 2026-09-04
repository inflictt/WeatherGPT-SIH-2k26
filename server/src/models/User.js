import mongoose from 'mongoose'

const savedLocation = new mongoose.Schema(
  {
    locationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Location' },
    name: String,
    district: String,
    state: String,
    lat: Number,
    lon: Number,
  },
  { _id: false },
)

const userSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true, select: false },
    // Phase 2 ships English, Hindi and Hinglish. Others are added later.
    language: { type: String, enum: ['en', 'hi', 'hinglish'], default: 'en' },
    persona: { type: String, enum: ['general', 'farmer', 'traveller', 'official'], default: 'general' },
    savedLocations: { type: [savedLocation], default: [] },
    notify: {
      severeOnly: { type: Boolean, default: true },
      voiceReplies: { type: Boolean, default: true },
    },
  },
  { timestamps: true },
)

userSchema.methods.toPublic = function toPublic() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    language: this.language,
    persona: this.persona,
    savedLocations: this.savedLocations,
    notify: this.notify,
  }
}

export const User = mongoose.model('User', userSchema)
