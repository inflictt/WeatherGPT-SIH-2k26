/**
 * A browser port of the language and intent rules from
 * `ai/app/engines/nlu.py`, used only when there is no backend.
 *
 * Deliberately the *same* rules, not a simplification: script test first,
 * romanised-Hindi keyword list second, nukta folding so "तूफ़ान" and "तूफान"
 * match, and self-location patterns matched on word boundaries so "is t(here)"
 * does not resolve to the user's own village. Those were real bugs in the
 * Python engine; a demo that reproduces the answer but not the bug fixes would
 * be showing something that does not exist.
 *
 * The Python engine remains the source of truth. This is here so the frontend
 * can be handed to someone as a single file and still behave correctly.
 */

const DEVANAGARI = /[ऀ-ॿ]/
const WORD = /[\wऀ-ॿ]+/g
const NUKTA = '़'

/** Lowercase and drop nuktas — matching only, never display. */
export const fold = (s) => String(s || '').toLowerCase().normalize('NFD').split(NUKTA).join('')

const HINGLISH = new Set([
  'kal', 'aaj', 'parso', 'abhi', 'subah', 'shaam', 'sham', 'raat', 'dopahar', 'kab',
  'barish', 'baarish', 'mausam', 'garmi', 'sardi', 'thand', 'hawa', 'toofan', 'tufan',
  'andhi', 'aandhi', 'badal', 'paani', 'gaon', 'gaanv', 'zila', 'zile', 'jila',
  'mera', 'mere', 'meri', 'hoga', 'hogi', 'hai', 'hain', 'kya', 'kitna', 'kitni',
  'karun', 'karoon', 'chahiye', 'rahega', 'fasal', 'sinchai', 'khet', 'safar',
  'yatra', 'surakshit',
].map(fold))

export function detectLanguage(text) {
  if (!text || !text.trim()) return 'en'
  if (DEVANAGARI.test(text)) return 'hi'
  const words = new Set((text.match(WORD) || []).map(fold))
  for (const w of words) if (HINGLISH.has(w)) return 'hinglish'
  return 'en'
}

/** First match wins; order is significance, not specificity. */
const INTENTS = [
  ['warning_check', ['warning', 'warnings', 'alert', 'alerts', 'चेतावनी', 'अलर्ट']],
  ['advice', ['should i', 'safe to', 'is it safe', 'karun', 'karoon', 'chahiye',
    'करूँ', 'चाहिए', 'सुरक्षित', 'surakshit', 'sinchai', 'irrigate', 'harvest',
    'fasal', 'khet', 'crop', 'yatra', 'safar']],
  ['rain_forecast', ['rain', 'rainfall', 'shower', 'drizzle', 'monsoon', 'barish',
    'baarish', 'बारिश', 'बरसात', 'वर्षा']],
  ['temperature', ['temperature', 'hot', 'cold', 'warm', 'heat', 'garmi', 'sardi',
    'thand', 'तापमान', 'गर्मी', 'ठंड']],
  ['wind', ['wind', 'gust', 'squall', 'storm', 'hawa', 'andhi', 'toofan', 'tufan',
    'हवा', 'आंधी', 'तूफान']],
].map(([k, words]) => [k, words.map(fold)])

const DAYS = [
  [2, ['day after tomorrow', 'parso', 'परसों']],
  [1, ['tomorrow', 'kal', 'कल']],
  [0, ['today', 'tonight', 'now', 'aaj', 'abhi', 'आज']],
].map(([n, w]) => [n, w.map(fold)])

const PARTS = [
  ['morning', ['morning', 'subah', 'सुबह'], 5, 11],
  ['afternoon', ['afternoon', 'dopahar', 'दोपहर'], 11, 16],
  ['evening', ['evening', 'shaam', 'sham', 'शाम'], 16, 21],
  ['night', ['night', 'tonight', 'raat', 'रात'], 21, 24],
].map(([n, w, a, b]) => [n, w.map(fold), a, b])

const SELF = [
  'my village', 'my town', 'my district', 'my area', 'here',
  'mere gaon', 'mere gaanv', 'mera gaon', 'mere zile', 'yahan',
  'मेरे गाँव', 'मेरे गांव', 'मेरे ज़िले', 'यहाँ',
].map(fold)

// Word-boundary matched. "here" as a substring matches "is t(here)", which
// silently answered about the wrong place — the bug this guards against.
const SELF_RE = new RegExp(
  `(?<![\\w])(?:${SELF.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})(?![\\w])`,
  'i',
)

export function parseLocally(text) {
  const raw = String(text || '')
  const lowered = ` ${fold(raw).trim()} `

  let intent = 'general'
  for (const [name, words] of INTENTS) {
    if (words.some((w) => lowered.includes(w))) {
      intent = name
      break
    }
  }

  let dayOffset = 0
  let dayLabel = 'today'
  for (const [n, words] of DAYS) {
    if (words.some((w) => lowered.includes(w))) {
      dayOffset = n
      dayLabel = n === 1 ? 'tomorrow' : n === 2 ? 'the day after tomorrow' : 'today'
      break
    }
  }

  let fromHour = null
  let toHour = null
  let part = ''
  for (const [name, words, a, b] of PARTS) {
    if (words.some((w) => lowered.includes(w))) {
      part = name
      fromHour = a
      toHour = b
      break
    }
  }

  return {
    intent,
    language: detectLanguage(raw),
    location: null,
    location_hint: SELF_RE.test(fold(raw)) ? 'self' : null,
    window: {
      day_offset: dayOffset,
      from_hour: fromHour,
      to_hour: toHour,
      label: part ? `${dayLabel} ${part}` : dayLabel,
    },
  }
}

export default parseLocally
