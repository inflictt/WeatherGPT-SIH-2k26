import { z } from 'zod'
import { transcribeAudio } from '../services/gemini/transcribe.js'
import { log } from '../utils/logger.js'

export const transcribeSchema = z.object({
  audioBase64: z.string().min(1),
  mimeType: z.string().max(64).optional(),
  lang: z.enum(['en', 'hi', 'hinglish']).optional(),
})

export async function transcribe(req, res) {
  const { audioBase64, mimeType = 'audio/webm', lang = 'hi' } = req.body

  try {
    const result = await transcribeAudio(audioBase64, mimeType, lang)
    if (!result) {
      return res.status(503).json({
        ok: false,
        error: 'Voice transcription service currently unavailable. You can type your question instead.',
        transcript: '',
      })
    }

    return res.json({
      ok: true,
      transcript: result.transcript,
      modelUsed: result.modelUsed,
    })
  } catch (err) {
    log.error('voice transcribe controller error', { error: String(err?.message || err) })
    return res.status(500).json({
      ok: false,
      error: 'Failed to transcribe audio.',
      transcript: '',
    })
  }
}
