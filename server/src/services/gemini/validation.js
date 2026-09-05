/**
 * The gate — PRD §27.
 *
 * Everything a language model produced is checked against the facts it was
 * given. One ungrounded number rejects the **whole** rewrite, not just the
 * offending field: a partially-trusted answer is worse than an untouched one,
 * because nobody reading it can tell which half to believe.
 *
 * This mirrors `ai/app/engines/validate.py` deliberately. The Python service
 * validates its own LLM path; this validates the Node one. Two copies is the
 * right trade here — the alternative is a network call on the path whose
 * entire job is to be the last line of defence.
 */

//: Numbers that carry no factual claim. Common agricultural, time and conversational figures.
const FREE_NUMBERS = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15, 16, 18, 20, 24, 25, 30, 35, 40, 45, 48, 50, 60, 70, 72, 80, 90, 100])

//: Matched before numerals are extracted, so "07:37" does not read as 7 and 37.
const CLOCK = /\b\d{1,2}:\d{2}(?::\d{2})?\b/g
const ISO_DATE = /\b\d{4}-\d{2}-\d{2}(?:T[\d:.+Z-]*)?\b/g

/** Every number appearing anywhere in a structure, including inside strings. */
export function collectNumbers(node, out = new Set()) {
  if (node == null) return out
  if (typeof node === 'number' && Number.isFinite(node)) {
    out.add(round(node))
  } else if (typeof node === 'string') {
    const cleaned = node.replace(CLOCK, ' ').replace(ISO_DATE, ' ')
    for (const m of cleaned.matchAll(/-?\d+(?:\.\d+)?/g)) {
      const v = Number(m[0])
      if (Number.isFinite(v)) out.add(round(v))
    }
  } else if (Array.isArray(node)) {
    node.forEach((v) => collectNumbers(v, out))
  } else if (typeof node === 'object') {
    Object.values(node).forEach((v) => collectNumbers(v, out))
  }
  return out
}

const round = (n) => Math.round(n * 100) / 100

/** Is `value` within tolerance of something in `allowed`? */
function grounded(value, allowed) {
  if (FREE_NUMBERS.has(Math.abs(value))) return true
  // Tolerance covers honest rounding — 117.6 written as 118 — without
  // admitting a genuinely different figure.
  const tol = Math.max(1.0, Math.abs(value) * 0.05)
  for (const a of allowed) {
    if (Math.abs(a - value) <= tol) return true
  }
  return false
}

//: Specific chemical formulations and hazardous dosages that must not be prescribed without official extension consultation.
const FORBIDDEN = [
  /\bml\s*\/\s*(?:l|litre|liter)\b/i, /\bg\s*\/\s*(?:l|litre|liter)\b/i,
  /\bcarbendazim\b/i, /\bmancozeb\b/i, /\bimidacloprid\b/i, /\bglyphosate\b/i,
  /\bmonocrotophos\b/i, /\bparaquat\b/i, /\bchlorpyrifos\b/i,
]

/**
 * @returns {{ ok: boolean, reasons: string[] }}
 */
export function validateRewrite(rewrite, original, context) {
  const reasons = []
  if (!rewrite || typeof rewrite !== 'object') {
    return { ok: false, reasons: ['not_an_object'] }
  }

  // Facts = everything the engines computed, plus the answer it was handed.
  // The original answer counts because its own figures are by definition
  // grounded — they came from the engines a moment ago.
  const allowed = collectNumbers({ context, original })

  for (const [field, value] of Object.entries(rewrite)) {
    if (typeof value !== 'string') continue

    for (const pattern of FORBIDDEN) {
      if (pattern.test(value)) {
        reasons.push(`chemical_advice:${field}`)
        break
      }
    }

    for (const n of collectNumbers(value)) {
      if (!grounded(n, allowed)) {
        reasons.push(`ungrounded_number:${field}:${n}`)
      }
    }
  }

  // Arrays get the same treatment, and may not change length — dropping a
  // recommended action is a silent removal of advice.
  if (rewrite.recommendedActions !== undefined) {
    const before = original?.recommendedActions?.length || 0
    if (!Array.isArray(rewrite.recommendedActions)
        || rewrite.recommendedActions.length !== before) {
      reasons.push('actions_length_changed')
    } else {
      for (const [i, a] of rewrite.recommendedActions.entries()) {
        for (const n of collectNumbers(String(a))) {
          if (!grounded(n, allowed)) reasons.push(`ungrounded_number:action_${i}:${n}`)
        }
        for (const pattern of FORBIDDEN) {
          if (pattern.test(String(a))) { reasons.push(`chemical_advice:action_${i}`); break }
        }
      }
    }
  }

  // A band or a confidence the model tried to change is a hard reject: those
  // are the engine's output and nothing downstream re-checks them.
  for (const field of ['riskBand', 'confidenceLevel', 'recommendation', 'band']) {
    if (rewrite[field] !== undefined && rewrite[field] !== original?.[field]) {
      reasons.push(`changed_verdict:${field}`)
    }
  }

  return { ok: reasons.length === 0, reasons: [...new Set(reasons)] }
}

export default { validateRewrite, collectNumbers }
