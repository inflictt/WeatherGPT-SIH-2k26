/**
 * What Gemini is allowed to see, and what it is allowed to change.
 *
 * The prompt is deliberately a *rewriting* brief rather than an answering
 * one. The model receives a finished answer and the facts behind it, and is
 * asked to make the words clearer — not to work anything out. Asking it to
 * answer and then checking the answer would be the wrong shape: validation
 * catches invented numbers, but it cannot catch a plausible-sounding
 * recommendation that no engine produced.
 */

//: The only fields a rewrite may replace. Anything else in the response is
//  ignored even if the model returns it.
export const PROSE_FIELDS = [
  'summary',
  'gloss',
  'warningMessage',
  'riskExplanation',
  'uncertaintyExplanation',
  'irrigationReason',
]

const LANG_NOTE = {
  en: 'Write in plain English.',
  hi: 'Write in Hindi, in Devanagari script.',
  hinglish: 'Write in Hinglish — Hindi written in Latin script, as people actually type it.',
}

export function buildPrompt(answer, context, lang = 'en') {
  const facts = JSON.stringify(context, null, 1)
  const draft = JSON.stringify(
    Object.fromEntries(PROSE_FIELDS.map((f) => [f, answer[f] ?? null])),
    null,
    1,
  )

  return `You are the writing layer of an agricultural early-warning system used by farmers in India.

A deterministic engine has already produced the answer below. Your only job is to make the
wording clearer and warmer, in the requested language. You are not answering the question —
it has already been answered.

${LANG_NOTE[lang] || LANG_NOTE.en}

RULES — a response breaking any of these is discarded entirely:

1. Do not introduce any number that does not appear in FACTS. Not a rounded one, not an
   approximation, not a range. If FACTS says 118 mm you may write 118 mm; you may not write
   "over 100 mm" unless 100 also appears.
2. Do not name a source, an agency or a model that does not appear in FACTS.
3. Do not change any risk band, confidence level or recommendation. If the draft says "Wait",
   your rewrite says wait.
4. Do not add advice of your own. Especially do not name a pesticide, a fungicide, a
   fertiliser, a dose or a chemical treatment — those decisions belong to a qualified
   agricultural extension officer, not to this system.
5. Do not restate or soften official warning text. It is reproduced verbatim elsewhere.
6. Keep each field roughly the length it already is. A farmer reads this on a phone.

FACTS (everything you are permitted to refer to):
${facts}

DRAFT (rewrite these fields, keep every key):
${draft}

Return JSON only, with exactly the keys shown in DRAFT. Use null for any field that was null.`
}

export default { PROSE_FIELDS, buildPrompt }
