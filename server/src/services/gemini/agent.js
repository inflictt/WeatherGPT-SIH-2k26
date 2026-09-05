import { env } from '../../config/env.js'
import { log } from '../../utils/logger.js'
import { PROSE_FIELDS, buildPrompt } from './prompts.js'
import { validateRewrite } from './validation.js'

/**
 * Gemini — PRD §10, §26, §27.
 *
 * The architectural rule this file exists to enforce:
 *
 *     Models calculate. Tools retrieve. Risk engines evaluate. Gemini explains.
 *
 * So the agent is given a *finished* answer — every figure, band and
 * confidence already computed by the Python engines — and is allowed to
 * rewrite six prose fields. It cannot add a number, name a source, change a
 * risk band or reference a warning, because `validation.js` rejects the whole
 * rewrite if it tries, and the deterministic answer is kept instead.
 *
 * That is why `GEMINI_API_KEY` being absent changes how well the product
 * reads and never what it says. It is also why there is no tool-calling loop
 * here: §11's tool list is the *server's* job, and by the time we reach this
 * file every tool has already run. Letting a model decide which engine to
 * call would put it back on the critical path for facts.
 */

const ENDPOINT = (model) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`

/** Is the prose layer available at all? `/api/health` reports this. */
export function isConfigured() {
  return Boolean(env.geminiApiKey)
}

const CANDIDATE_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.5-flash',
  'gemini-3.8-flash',
  'gemini-flash-lite-latest',
  'gemini-3.1-flash-lite-preview',
]

/**
 * Rewrite the prose of an already-complete answer.
 *
 * Returns `{ answer, composer, rejected }`. `composer` is 'deterministic' or
 * 'gemini' and is surfaced in the API response, so the interface can always
 * say which produced the words on screen.
 */
export async function explain(answer, context, { lang = 'en', timeoutMs = 25000 } = {}) {
  if (!env.geminiApiKey) {
    return { answer, composer: 'deterministic', rejected: null }
  }

  const modelsToTry = Array.from(new Set([env.geminiModel, ...CANDIDATE_MODELS].filter(Boolean)))
  let lastError = null

  for (const model of modelsToTry) {
    const ctl = new AbortController()
    const timer = setTimeout(() => ctl.abort(), timeoutMs)

    try {
      const res = await fetch(`${ENDPOINT(model)}?key=${env.geminiApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: ctl.signal,
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: buildPrompt(answer, context, lang) }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 2048,
            responseMimeType: 'application/json',
          },
          safetySettings: [
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
          ],
        }),
      })

      if (!res.ok) {
        log.warn(`gemini call to ${model} failed with status ${res.status}`)
        lastError = [`http_${res.status}`]
        continue
      }

      const data = await res.json()
      const part =
        data?.candidates?.[0]?.content?.parts?.find((p) => p.text && !p.thought) ||
        data?.candidates?.[0]?.content?.parts?.[0]
      const text = part?.text
      if (!text) {
        lastError = ['empty_response']
        continue
      }

      let rewrite
      try {
        const clean = text.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim()
        const jsonMatch = clean.match(/\{[\s\S]*\}/)
        rewrite = JSON.parse(jsonMatch ? jsonMatch[0] : clean)
      } catch {
        lastError = ['unparseable_json']
        continue
      }

      const { ok, reasons } = validateRewrite(rewrite, answer, context)
      if (!ok) {
        log.warn('gemini rewrite rejected', { reasons, model })
        lastError = reasons
        continue
      }

      const merged = { ...answer }
      for (const field of PROSE_FIELDS) {
        if (typeof rewrite[field] === 'string' && rewrite[field].trim()) {
          merged[field] = rewrite[field].trim()
        }
      }
      if (Array.isArray(rewrite.recommendedActions) && rewrite.recommendedActions.length > 0) {
        merged.recommendedActions = rewrite.recommendedActions.map(String)
      }

      return { answer: merged, composer: 'gemini', rejected: null, modelUsed: model }
    } catch (err) {
      if (err?.name === 'AbortError') {
        lastError = ['timeout']
      } else {
        log.warn(`gemini ${model} unreachable`, { error: String(err?.message || err) })
        lastError = ['unreachable']
      }
    } finally {
      clearTimeout(timer)
    }
  }

  return { answer, composer: 'deterministic', rejected: lastError }
}

export default { explain, isConfigured }
