import { getNearbyShelters, SHELTERS_DATABASE } from '../services/shelterService.js'

/**
 * GET /api/shelters?lat=...&lon=...&limit=...
 * Returns nearest disaster and cyclone shelters with distance, capacity, and live facilities.
 */
export function getShelters(req, res) {
  try {
    const lat = req.query.lat ? Number.parseFloat(req.query.lat) : null
    const lon = req.query.lon ? Number.parseFloat(req.query.lon) : null
    const limit = req.query.limit ? Number.parseInt(req.query.limit, 10) : 5

    if (lat !== null && lon !== null && !Number.isNaN(lat) && !Number.isNaN(lon)) {
      const nearest = getNearbyShelters(lat, lon, limit)
      return res.json({
        status: 'ok',
        count: nearest.length,
        queryCoords: { lat, lon },
        shelters: nearest
      })
    }

    // Default: return all shelters with navigation links
    return res.json({
      status: 'ok',
      count: SHELTERS_DATABASE.length,
      shelters: SHELTERS_DATABASE.map(s => ({
        ...s,
        navigationUrl: `https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lon}`
      }))
    })
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message })
  }
}
