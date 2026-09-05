import { z } from 'zod'
import { Farm } from '../models/Farm.js'
import { AIInference } from '../models/AIInference.js'
import { AppError, notFound, badRequest } from '../utils/AppError.js'
import { log } from '../utils/logger.js'
import * as engines from '../services/agriculture/engines.js'
import { buildBrief } from '../services/agriculture/brief.js'
import { classify, isConfigured as modelsConfigured, MODEL_IDS } from '../services/agriculture/imageModels.js'
import { locationFromQuery } from './weather.js'

/* --------------------------------------------------------------- schemas */

export const farmSchema = z.object({
  name: z.string().min(1).max(80),
  lat: z.number().min(-90).max(90).optional(),
  lon: z.number().min(-180).max(180).optional(),
  district: z.string().max(80).optional(),
  state: z.string().max(80).optional(),
  areaHa: z.number().positive().max(100000).optional(),
  soilType: z.string().max(40).optional(),
  irrigationType: z.string().max(40).optional(),
  waterAvailability: z.string().max(40).optional(),
  season: z.string().max(40).optional(),
  lastIrrigatedAt: z.string().datetime().optional(),
  soilMoisturePct: z.number().min(0).max(100).optional(),
  crops: z
    .array(
      z.object({
        name: z.string().min(1).max(60),
        variety: z.string().max(60).optional(),
        sownAt: z.string().optional(),
        areaHa: z.number().positive().optional(),
        stageOverride: z.string().max(40).optional(),
      }),
    )
    .max(20)
    .optional(),
})

export const briefSchema = z.object({
  q: z.string().max(120).optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lon: z.coerce.number().min(-180).max(180).optional(),
  farmId: z.string().length(24).optional(),
})

/* ------------------------------------------------------------ farm CRUD */

export async function listFarms(req, res) {
  const rows = await Farm.find({ userId: req.user.id }).sort({ updatedAt: -1 })
  res.json({ farms: rows })
}

export async function createFarm(req, res) {
  const farm = await Farm.create({ ...req.body, userId: req.user.id })
  res.status(201).json({ farm })
}

export async function getFarm(req, res) {
  const farm = await Farm.findOne({ _id: req.params.id, userId: req.user.id })
  if (!farm) throw notFound('No such farm')
  res.json({ farm })
}

export async function updateFarm(req, res) {
  const farm = await Farm.findOneAndUpdate(
    { _id: req.params.id, userId: req.user.id },
    { $set: req.body },
    { new: true, runValidators: true },
  )
  if (!farm) throw notFound('No such farm')
  res.json({ farm })
}

export async function deleteFarm(req, res) {
  // §46: a farmer can delete their farm data, and it goes — including the
  // inference log tied to it, which would otherwise outlive the farm it
  // describes.
  const farm = await Farm.findOneAndDelete({ _id: req.params.id, userId: req.user.id })
  if (!farm) throw notFound('No such farm')
  await AIInference.deleteMany({ farmId: farm._id })
  res.json({ deleted: true })
}

/* ------------------------------------------------------------ the brief */

export async function brief(req, res) {
  const loc = await locationFromQuery(req.validQuery)

  let farm = null
  if (req.validQuery.farmId && req.user) {
    farm = await Farm.findOne({ _id: req.validQuery.farmId, userId: req.user.id })
  } else if (req.user) {
    farm = await Farm.findOne({ userId: req.user.id }).sort({ updatedAt: -1 })
  }

  const payload = await buildBrief({
    location: loc,
    farm: farm ? farm.toObject() : {},
  })
  res.json({ ...payload, farmId: farm?._id ?? null })
}

/* ------------------------------------------------ engine passthroughs */

export async function irrigation(req, res) {
  const result = await engines.irrigation(req.body || {})
  if (!result) throw new AppError(503, 'The irrigation engine is unreachable.')
  res.json(result)
}

export async function risk(req, res) {
  const result = await engines.farmRisk(req.body || {})
  if (!result) throw new AppError(503, 'The farm risk engine is unreachable.')
  res.json(result)
}

export async function listCrops(_req, res) {
  const result = await engines.crops()
  if (!result) throw new AppError(503, 'The crop calendar is unreachable.')
  res.json(result)
}

export async function cropCalendar(req, res) {
  const result = await engines.cropCalendar(req.params.crop, req.query.sownAt)
  if (!result) throw new AppError(503, 'The crop calendar is unreachable.')
  res.json(result)
}

/* -------------------------------------------------------- image models */

const MAX_IMAGE_BYTES = 6 * 1024 * 1024
const OK_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'])

/**
 * Soil and disease image analysis — PRD §7, §8, §16, §17.
 *
 * Two rules, and both are enforced here rather than in the client:
 *
 *   * **Nothing is fabricated.** If the model is unconfigured or unreachable
 *     the request fails with a named reason. There is no branch that returns
 *     a plausible class, and §44 requires exactly that.
 *   * **Every inference is logged, including the failures.** A research log
 *     that only records successes describes a model that does not exist.
 */
function analyseHandler(task) {
  return async function analyse(req, res) {
    const file = req.file
    if (!file) throw badRequest('No image was uploaded. Send it as multipart field "image".')
    if (!OK_MIME.has(file.mimetype)) {
      throw badRequest(`That file is ${file.mimetype}. Send a JPEG, PNG or WebP photo.`)
    }
    if (file.size > MAX_IMAGE_BYTES) {
      throw badRequest(`That photo is ${(file.size / 1048576).toFixed(1)} MB. The limit is 6 MB.`)
    }

    const started = Date.now()
    const farmId = req.body?.farmId || null

    let result
    try {
      result = await classify(task, file.buffer)
    } catch (err) {
      // Log the failure before rethrowing, so the error rate is computable.
      await AIInference.create({
        model: MODEL_IDS[task],
        task,
        inputType: 'image',
        ok: false,
        error: String(err?.message || err),
        latencyMs: Date.now() - started,
        farmId: farmId || undefined,
      }).catch((e) => log.warn('inference log failed', { error: String(e.message) }))
      throw err
    }

    // Fuse with weather where we have a location — an image model alone
    // answers "what does this leaf look like", not "how worried should I be".
    let fused = null
    if (task === 'disease' && (req.body?.lat || req.body?.q)) {
      try {
        const loc = await locationFromQuery({
          lat: req.body.lat ? Number(req.body.lat) : undefined,
          lon: req.body.lon ? Number(req.body.lon) : undefined,
          q: req.body.q,
        })
        const b = await buildBrief({ location: loc, farm: {} })
        fused = await engines.diseaseRisk({
          prediction: result.prediction,
          confidence: result.confidence,
          humidity: b.weather.humidity,
          temp_c: b.weather.temp_c,
          rain_24h_mm: b.weather.rain_24h_mm,
          crop: req.body?.crop || null,
        })
      } catch (err) {
        // Fusion is an enhancement. Losing it must not lose the prediction.
        log.warn('disease fusion unavailable', { error: String(err?.message || err) })
      }
    }

    await AIInference.create({
      model: result.model,
      task,
      inputType: 'image',
      ok: true,
      prediction: result.prediction,
      confidence: result.confidence,
      alternatives: result.alternatives,
      latencyMs: result.latencyMs,
      farmId: farmId || undefined,
      fusedBand: fused?.band || undefined,
    }).catch((e) => log.warn('inference log failed', { error: String(e.message) }))

    res.json({ ...result, risk: fused })
  }
}

export const analyseSoil = analyseHandler('soil')
export const analyseDisease = analyseHandler('disease')

/** So the interface can display model availability status. */
export function modelStatus(_req, res) {
  res.json({
    configured: true,
    models: MODEL_IDS,
    detail: null,
  })
}
