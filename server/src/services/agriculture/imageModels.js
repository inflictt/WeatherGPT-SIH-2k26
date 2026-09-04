import { env } from '../../config/env.js'
import { log } from '../../utils/logger.js'
import { AppError } from '../../utils/AppError.js'

/**
 * The two HuggingFace image models — PRD §7, §8.
 *
 * The single most important property of this module is what it does **not**
 * do. There is no fallback path that returns a plausible class when the model
 * is unreachable, no cached "typical" answer, no heuristic on the filename.
 * If the model does not answer, the caller gets an error and the interface
 * says so. §44 states it outright — never fabricate a missing model result —
 * and a crop-disease screen is the one place in this product where a
 * convincing lie could cost someone their crop.
 *
 * The token lives here and only here. The browser never sees it, which is the
 * whole reason this proxy exists rather than the client calling HF directly.
 */

const MODELS = {
  soil: {
    id: 'Ben041/soil-type-classifier',
    label: 'soil type',
    //: What the classifier's labels mean in the farm profile. Anything not in
    //  here is passed through verbatim rather than being mapped to a guess.
    normalise: (s) => String(s || '').replace(/[_-]+/g, ' ').trim(),
  },
  disease: {
    id: 'VisionaryQuant/5_Crop_Disease_Detection',
    label: 'crop disease',
    normalise: (s) => String(s || '').replace(/[_-]+/g, ' ').trim(),
  },
}

export const MODEL_IDS = Object.fromEntries(
  Object.entries(MODELS).map(([k, v]) => [k, v.id]),
)

/** Is this task usable at all? The interface asks before offering the button. */
export function isConfigured() {
  return Boolean(env.hfToken)
}

/**
 * Classify one image.
 *
 * Returns `{ prediction, confidence, alternatives, model, latencyMs }`.
 * Throws — never returns a shaped guess — when the model is unavailable,
 * unconfigured, still loading, or returns something unusable.
 */
export async function classify(task, buffer, { timeoutMs = 25000 } = {}) {
  const spec = MODELS[task]
  if (!spec) throw new AppError(400, `Unknown model task: ${task}`)

  if (!env.hfToken) {
    // A named, actionable failure — not a 500, and not a fake result.
    throw new AppError(
      503,
      `The ${spec.label} model is not configured on this server. Set HF_TOKEN to enable it.`,
      { code: 'MODEL_NOT_CONFIGURED', model: spec.id },
    )
  }

  const started = Date.now()
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), timeoutMs)

  try {
    const res = await fetch(`https://api-inference.huggingface.co/models/${spec.id}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.hfToken}`,
        'Content-Type': 'application/octet-stream',
        // HF returns 503 while a cold model loads. Asking it to wait turns a
        // retry loop into one slower request, which is the better trade on a
        // phone connection.
        'x-wait-for-model': 'true',
      },
      body: buffer,
      signal: ctl.signal,
    })

    const text = await res.text()
    let data
    try {
      data = JSON.parse(text)
    } catch {
      throw new AppError(502, `The ${spec.label} model returned an unreadable response.`, {
        code: 'MODEL_BAD_RESPONSE',
      })
    }

    if (!res.ok) {
      const detail = data?.error || `HTTP ${res.status}`
      // A loading model is a distinct, temporary state and deserves its own
      // message — "try again in a minute" is actionable, "it failed" is not.
      const loading = /loading/i.test(String(detail))
      throw new AppError(
        loading ? 503 : 502,
        loading
          ? `The ${spec.label} model is still starting up. Try again in a minute.`
          : `The ${spec.label} model could not process that image (${detail}).`,
        { code: loading ? 'MODEL_LOADING' : 'MODEL_ERROR' },
      )
    }

    // HF image classification returns [{ label, score }, …], best first.
    const rows = Array.isArray(data) ? data : Array.isArray(data?.[0]) ? data[0] : []
    const usable = rows
      .filter((r) => r && typeof r.score === 'number' && r.label)
      .sort((a, b) => b.score - a.score)

    if (!usable.length) {
      throw new AppError(502, `The ${spec.label} model returned no usable prediction.`, {
        code: 'MODEL_NO_PREDICTION',
      })
    }

    return {
      model: spec.id,
      prediction: spec.normalise(usable[0].label),
      confidence: usable[0].score,
      alternatives: usable.slice(1, 4).map((r) => ({
        label: spec.normalise(r.label),
        confidence: r.score,
      })),
      latencyMs: Date.now() - started,
    }
  } catch (err) {
    if (err instanceof AppError) throw err
    if (err?.name === 'AbortError') {
      throw new AppError(504, `The ${spec.label} model did not respond in time.`, {
        code: 'MODEL_TIMEOUT',
      })
    }
    log.warn('image model call failed', { task, error: String(err?.message || err) })
    throw new AppError(502, `The ${spec.label} model is unreachable.`, { code: 'MODEL_UNREACHABLE' })
  } finally {
    clearTimeout(timer)
  }
}

export default { classify, isConfigured, MODEL_IDS }
