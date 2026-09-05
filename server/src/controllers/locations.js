import { z } from 'zod'
import {
  searchGazetteer,
  geocodeNominatim,
  geocodeOpenMeteo,
  nearestLocation,
  resolveLocation,
  reverseGeocodeNominatim,
} from '../services/gazetteer.js'
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
  const local = await searchGazetteer(q, { limit, state })
  const openMeteoResults = await geocodeOpenMeteo(q)

  const seen = new Set(local.map((r) => `${r.name?.toLowerCase()}|${r.state?.toLowerCase()}`))
  const combined = [
    ...local.map((r) => ({
      id: r._id,
      name: r.name,
      kind: r.kind,
      district: r.district,
      state: r.state,
      lat: r.lat,
      lon: r.lon,
      source: 'gazetteer',
    })),
    ...openMeteoResults.filter((r) => !seen.has(`${r.name?.toLowerCase()}|${r.state?.toLowerCase()}`)),
  ]

  // Only reach for nominatim when local + openMeteo came up short.
  if (combined.length < 3) {
    const remote = await geocodeNominatim(q)
    const combinedSeen = new Set(combined.map((r) => `${r.name?.toLowerCase()}|${r.state?.toLowerCase()}`))
    combined.push(...remote.filter((r) => !combinedSeen.has(`${r.name?.toLowerCase()}|${r.state?.toLowerCase()}`)))
  }

  res.json({
    results: combined.slice(0, limit),
  })
}

export async function reverse(req, res) {
  const { lat, lon } = req.validQuery
  const geo = await reverseGeocodeNominatim(lat, lon)
  if (geo) {
    return res.json({ location: geo })
  }
  const near = await nearestLocation(lat, lon)
  if (!near) return res.json({ location: { name: 'Selected location', lat, lon, source: 'coordinates' } })
  res.json({
    location: {
      id: near._id, name: near.name, kind: near.kind, district: near.district,
      state: near.state, lat, lon, source: 'gazetteer-nearest',
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
