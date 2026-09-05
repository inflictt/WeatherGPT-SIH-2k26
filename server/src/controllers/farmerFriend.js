import { z } from 'zod'
import { Farm } from '../models/Farm.js'
import { AIInference } from '../models/AIInference.js'
import { log } from '../utils/logger.js'
import { answerQuestion } from '../services/chatPipeline.js'
import { buildBrief } from '../services/agriculture/brief.js'
import * as gemini from '../services/gemini/agent.js'
import { isConfigured as geminiConfigured } from '../services/gemini/agent.js'

/**
 * Farmer's Friend — PRD §13, §36, §43.
 *
 * The order here *is* the safety architecture (§26):
 *
 *   1. the existing chat pipeline parses, resolves and composes a complete,
 *      grounded answer with no model involved
 *   2. the agriculture engines add farm context — irrigation, risk, stage
 *   3. Gemini rewrites six prose fields, and only those
 *   4. validation rejects the whole rewrite if it invented anything
 *
 * Steps 1 and 2 are the product. Step 3 makes it read better. Deleting
 * `GEMINI_API_KEY` skips steps 3 and 4 and changes nothing about what the
 * answer says — there is a test for that, and `composer` in the response
 * tells the interface which path produced the words.
 */
export const chatSchema = z.object({
  message: z.string().min(1).max(1000),
  farmId: z.string().length(24).optional(),
  conversationId: z.string().max(64).optional(),
  lang: z.enum(['en', 'hi', 'hinglish']).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lon: z.number().min(-180).max(180).optional(),
  name: z.string().max(120).optional(),
  district: z.string().max(120).optional(),
  state: z.string().max(120).optional(),
  q: z.string().max(120).optional(),
})

export async function chat(req, res) {
  const started = Date.now()
  const { message, farmId, conversationId, lang, lat, lon, name, district, state, q } = req.body

  let farm = null
  if (req.user) {
    farm = farmId
      ? await Farm.findOne({ _id: farmId, userId: req.user.id })
      : await Farm.findOne({ userId: req.user.id }).sort({ updatedAt: -1 })
  }

  // --- 1. the grounded answer, with no model anywhere near it -----------
  const base = await answerQuestion({
    text: message,
    lang,
    conversationId,
    lat,
    lon,
    name,
    district,
    state,
    // A farm's district is a reasonable fallback when the question names no
    // place and no coordinates were sent — it is where the crop is.
    q: q || farm?.district || undefined,
    userId: req.user?.id,
  })

  // --- 2. farm context ---------------------------------------------------
  let agriculture = null
  if (base.location?.lat != null) {
    try {
      const b = await buildBrief({
        location: base.location,
        farm: farm ? farm.toObject() : {},
      })
      agriculture = b.agriculture
    } catch (err) {
      // Farm context is an enhancement. Losing it must not lose the answer.
      log.warn('farm context unavailable', { error: String(err?.message || err) })
    }
  }

  const answer = { ...base.answer }
  if (agriculture?.irrigation) {
    answer.irrigation = agriculture.irrigation.recommendation
    answer.irrigationReason = agriculture.irrigation.reason
  }

  // --- 3 & 4. prose, then the gate --------------------------------------
  const { answer: worded, composer, rejected } = await gemini.explain(
    answer,
    { ...(agriculture || {}), weather: base.weather ?? agriculture?.weather },
    { lang: lang || base.answer?.language || 'en' },
  )

  if (req.user) {
    AIInference.create({
      model: composer === 'gemini' ? 'gemini' : 'deterministic',
      task: 'chat',
      inputType: 'text',
      ok: true,
      prediction: composer,
      latencyMs: Date.now() - started,
      farmId: farm?._id ?? undefined,
      fusedBand: agriculture?.farm_risk?.overall || undefined,
    }).catch(() => {})
  }

  res.json({
    ...base,
    answer: worded,
    agriculture,
    // Always stated. The interface says which composer produced the words on
    // screen, so nobody has to guess whether a model touched them.
    composer,
    llmRejected: rejected,
    geminiConfigured: geminiConfigured(),
  })
}

export default { chat, chatSchema }
