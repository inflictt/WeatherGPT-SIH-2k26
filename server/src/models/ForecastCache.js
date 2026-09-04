import mongoose from 'mongoose'

/**
 * Open-Meteo is free but rate limited, and users ask for the same places.
 * A TTL index expires documents automatically, so nothing has to sweep them.
 */
const forecastCacheSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, index: true },
  payload: { type: mongoose.Schema.Types.Mixed, required: true },
  fetchedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
})

export const ForecastCache = mongoose.model('ForecastCache', forecastCacheSchema)
