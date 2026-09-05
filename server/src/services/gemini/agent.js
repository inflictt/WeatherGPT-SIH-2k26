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

  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), timeoutMs)

  try {
    const res = await fetch(`${ENDPOINT(env.geminiModel)}?key=${env.geminiApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: ctl.signal,
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: buildPrompt(answer, context, lang) }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 2048,
          // Structured output, so a malformed rewrite is a parse failure
          // rather than something that half-applies.
          responseMimeType: 'application/json',
        },
        // The prose is about weather warnings and crop damage. Default safety
        // settings sometimes refuse that vocabulary outright, and a refusal
        // here would silently drop the rewrite — which is safe, but noisy.
        safetySettings: [
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
        ],
      }),
    })

    if (!res.ok) {
      log.warn('gemini call failed', { status: res.status })
      return { answer, composer: 'deterministic', rejected: [`http_${res.status}`] }
    }

    const data = await res.json()
    const part =
      data?.candidates?.[0]?.content?.parts?.find((p) => p.text && !p.thought) ||
      data?.candidates?.[0]?.content?.parts?.[0]
    const text = part?.text
    if (!text) return { answer, composer: 'deterministic', rejected: ['empty_response'] }

    let rewrite
    try {
      const clean = text.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim()
      const jsonMatch = clean.match(/\{[\s\S]*\}/)
      rewrite = JSON.parse(jsonMatch ? jsonMatch[0] : clean)
    } catch {
      return { answer, composer: 'deterministic', rejected: ['unparseable_json'] }
    }

    // The gate. Everything the model produced is checked against the facts it
    // was given, and a single ungrounded number rejects the *whole* rewrite —
    // not just the offending field. A partially-trusted answer is worse than
    // an untouched one, because nobody can tell which half to believe.
    const { ok, reasons } = validateRewrite(rewrite, answer, context)
    if (!ok) {
      log.warn('gemini rewrite rejected', { reasons })
      return { answer, composer: 'deterministic', rejected: reasons }
    }

    const merged = { ...answer }
    for (const field of PROSE_FIELDS) {
      if (typeof rewrite[field] === 'string' && rewrite[field].trim()) {
        merged[field] = rewrite[field].trim()
      }
    }
    // Recommended actions are merged if provided as an array of strings.
    if (Array.isArray(rewrite.recommendedActions) && rewrite.recommendedActions.length > 0) {
      merged.recommendedActions = rewrite.recommendedActions.map(String)
    }

    return { answer: merged, composer: 'gemini', rejected: null }
  } catch (err) {
    if (err?.name === 'AbortError') {
      return { answer, composer: 'deterministic', rejected: ['timeout'] }
    }
    log.warn('gemini unreachable', { error: String(err?.message || err) })
    return { answer, composer: 'deterministic', rejected: ['unreachable'] }
  } finally {
    clearTimeout(timer)
  }
}

export default { explain, isConfigured }
