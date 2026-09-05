import { env } from '../../config/env.js'
import { log } from '../../utils/logger.js'

const ENDPOINT = (model) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`

const CANDIDATE_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.6-flash',
  'gemini-3.8-flash',
  'gemini-flash-lite-latest',
  'gemini-3.1-flash-lite-preview',
]

/**
 * Transcribe spoken audio using Gemini multimodal API.
 * Supports Hindi, English, and Hinglish.
 *
 * @param {string} audioBase64 - Base64 encoded audio bytes
 * @param {string} mimeType - Audio mime type (e.g. 'audio/webm', 'audio/mp4', 'audio/wav', 'audio/ogg')
 * @param {string} [lang='hi'] - Target language hint ('hi', 'en', 'hinglish')
 * @returns {Promise<{ transcript: string, modelUsed: string } | null>}
 */
export async function transcribeAudio(audioBase64, mimeType = 'audio/webm', lang = 'hi') {
  if (!env.geminiApiKey || !audioBase64) {
    return null
  }

  const modelsToTry = Array.from(new Set([env.geminiModel, ...CANDIDATE_MODELS].filter(Boolean)))

  const promptText = `You are a speech-to-text engine for Indian farmers using the Aakrishi agricultural voice assistant.
The speaker may speak in Hindi, English, or Hinglish (e.g. "aaj Gurgaon mein baarish hogi kya", "mere farm ka risk score kya hai", "kya aaj irrigation karni chahiye", "will it rain tomorrow").
Listen to the audio and transcribe the exact words spoken.
Rules:
1. Transcribe verbatim in the language/script spoken (Devanagari for Hindi or Latin script for Hinglish/English).
2. Do NOT answer the question.
3. Do NOT add commentary, explanations, or quotes.
4. If there is only background noise or silence, return an empty string.`

  for (const model of modelsToTry) {
    const ctl = new AbortController()
    const timer = setTimeout(() => ctl.abort(), 20000)

    try {
      const res = await fetch(`${ENDPOINT(model)}?key=${env.geminiApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: ctl.signal,
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                {
                  inlineData: {
                    mimeType: mimeType.split(';')[0] || 'audio/webm',
                    data: audioBase64,
                  },
                },
                {
                  text: promptText,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 256,
          },
        }),
      })

      if (!res.ok) {
        log.warn(`gemini audio transcribe on ${model} returned status ${res.status}`)
        continue
      }

      const data = await res.json()
      const part =
        data?.candidates?.[0]?.content?.parts?.find((p) => p.text && !p.thought) ||
        data?.candidates?.[0]?.content?.parts?.[0]
      const text = part?.text?.trim() || ''

      // Clean quotation marks if returned
      const cleanTranscript = text.replace(/^["']|["']$/g, '').trim()
      return { transcript: cleanTranscript, modelUsed: model }
    } catch (err) {
      log.warn(`gemini transcribe audio on ${model} failed`, { error: String(err?.message || err) })
    } finally {
      clearTimeout(timer)
    }
  }

  return null
}
