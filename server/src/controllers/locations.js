import { z } from 'zod'
import { searchGazetteer, geocodeOpenMeteo, geocodeNominatim, nearestLocation, resolveLocation } from '../services/gazetteer.js'
import { notFound } from '../utils/AppError.js'

export const searchSchema = z.object({
  q: z.string().trim().min(2).max(80),
  state: z.string().trim().max(60).optional(),
  limit: z.coerce.number().int().min(1).max(20).optional(),
})

export const coordSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
})

export async function search(req, res) {
  const { q, state, limit = 8 } = req.validQuery
  
  // Fast local search + fast Open-Meteo geocoding (<50ms)
  const [local, remoteOpenMeteo] = await Promise.all([
    searchGazetteer(q, { limit, state }),
    geocodeOpenMeteo(q),
  ])

  const seen = new Set(local.map((r) => `${r.name?.toLowerCase()}|${r.state?.toLowerCase()}`))
  
  const combined = [
    ...local.map((r) => ({
      id: r._id, name: r.name, kind: r.kind, district: r.district,
      state: r.state, lat: r.lat, lon: r.lon, source: 'gazetteer',
    })),
    ...remoteOpenMeteo
      .filter((r) => !seen.has(`${r.name?.toLowerCase()}|${r.state?.toLowerCase()}`))
      .slice(0, 5),
  ]

  // If still empty, try Nominatim as last resort
  if (combined.length === 0) {
    const remoteNominatim = await geocodeNominatim(q)
    combined.push(...remoteNominatim)
  }

  res.json({ results: combined.slice(0, limit) })
}

export async function reverse(req, res) {
  const { lat, lon } = req.validQuery
  const near = await nearestLocation(lat, lon)
  if (!near) return res.json({ location: { name: 'Selected location', lat, lon, source: 'coordinates' } })
  res.json({
    location: {
      id: near._id, name: near.name, kind: near.kind, district: near.district,
      state: near.state, lat: near.lat, lon: near.lon, source: 'gazetteer-nearest',
    },
  })
}

export async function resolve(req, res) {
  const found = await resolveLocation(req.validQuery)
  if (!found) throw notFound('Could not resolve that location')
  res.json({ location: found })
}

export const resolveSchema = z
  .object({
    q: z.string().trim().min(2).max(80).optional(),
    lat: z.coerce.number().min(-90).max(90).optional(),
    lon: z.coerce.number().min(-180).max(180).optional(),
    state: z.string().trim().max(60).optional(),
  })
  .refine((v) => v.q || (v.lat != null && v.lon != null), {
    message: 'Provide either q, or both lat and lon',
  })
