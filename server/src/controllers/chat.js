import { z } from 'zod'
import { answerQuestion } from '../services/chatPipeline.js'
import { Conversation } from '../models/Conversation.js'
import { log } from '../utils/logger.js'

/**
 * POST /api/chat/query — one conversational turn.
 *
 * The route is thin on purpose: validate, run the pipeline, persist if the
 * caller is signed in, return. Everything interesting is in chatPipeline.js,
 * where it can be tested without a database.
 */

export const querySchema = z.object({
  text: z.string().trim().min(1, 'Message cannot be empty').max(2000),
  lang: z.enum(['en', 'hi', 'hinglish']).optional().default('en'),
  persona: z
    .enum(['general', 'everyone', 'farmer', 'farm', 'traveller', 'official'])
    .optional()
    .transform((v) => (v === 'farm' ? 'farmer' : v === 'everyone' ? 'general' : v || 'general')),
  q: z.string().trim().min(1).max(120).nullable().optional(),
  lat: z.coerce.number().min(-90).max(90).nullable().optional(),
  lon: z.coerce.number().min(-180).max(180).nullable().optional(),
  conversationId: z.string().trim().max(64).nullable().optional(),
})

/** How many prior turns are consulted when resolving a follow-up. */
const HISTORY_TURNS = 6

import * as gemini from '../services/gemini/agent.js'

export async function query(req, res) {
  const input = req.body
  const started = Date.now()

  // Prior turns give a follow-up its location. Anonymous callers get none,
  // which is why the client also sends its selected location every time.
  let conversation = null
  let history = []
  if (input.conversationId && req.user) {
    conversation = await Conversation.findOne({
      _id: input.conversationId,
      userId: req.user._id,
    }).catch(() => null)
    history = (conversation?.turns || []).slice(-HISTORY_TURNS)
  }

  const result = await answerQuestion({
    text: input.text,
    lang: input.lang || req.user?.language || null,
    persona: input.persona || req.user?.persona || 'general',
    q: input.q,
    lat: input.lat,
    lon: input.lon,
    history,
  })

  let finalAnswer = result.answer
  let composer = 'deterministic'
  let rejected = null
  if (result.answer) {
    const explained = await gemini.explain(
      result.answer,
      {
        question: input.text,
        intent: result.nlu?.intent || 'general',
        location: result.location,
        forecast: result.forecast,
        current: result.current,
        weather: result.current,
        risk: result.risk,
        confidence: result.confidence,
        warnings: result.warnings,
      },
      { lang: input.lang || result.answer?.language || 'en' },
    )
    finalAnswer = explained.answer
    composer = explained.composer
    rejected = explained.rejected
  }

  // Persistence is best-effort: a database hiccup must not cost the user the
  // answer we already computed.
  if (req.user) {
    try {
      const turn = {
        text: input.text,
        language: result.nlu?.language,
        intent: result.nlu?.intent,
        location: result.location
          ? {
              name: result.location.name,
              district: result.location.district,
              state: result.location.state,
              lat: result.location.lat,
              lon: result.location.lon,
            }
          : undefined,
        summary: result.answer?.summary,
        riskBand: result.risk?.overall,
        warningRef: result.answer?.warningRef,
        at: new Date(),
      }
      if (conversation) {
        conversation.turns.push(turn)
        await conversation.save()
      } else {
        conversation = await Conversation.create({ userId: req.user._id, turns: [turn] })
      }
    } catch (err) {
      log.warn('conversation not persisted', { error: String(err.message || err) })
    }
  }

  res.json({
    ...result,
    answer: finalAnswer,
    composer,
    llmRejected: rejected,
    conversationId: conversation?._id ?? null,
    ms: Date.now() - started,
  })
}
