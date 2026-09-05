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
  'yatra', 'surakshit', 'haal', 'report', 'status', 'patte', 'peele',
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
  ['warning_check', ['warning', 'warnings', 'alert', 'alerts', 'chetawani', 'chetwani', 'चेतावनी', 'अलर्ट', 'खतरा']],
  ['farm_status', ['farm status', 'farm condition', 'farm update', 'khet ka haal', 'khet kaisa', 'mere farm', 'mere khet', 'fasal ka haal', 'खेत का हाल', 'फार्म स्थिति', 'फसल कैसी']],
  ['travel_advice', ['travel', 'travek', 'travl', 'trave', 'trip', 'journey', 'safar', 'yatra', 'driving', 'drive', 'highway', 'road', 'nikalna', 'safe to travel', 'सफर', 'यात्रा']],
  ['advice', ['should i', 'safe to', 'is it safe', 'karun', 'karoon', 'chahiye',
    'करूँ', 'चाहिए', 'सुरक्षित', 'surakshit', 'sinchai', 'irrigate', 'irrigation', 'harvest',
    'fasal', 'khet', 'crop', 'spray', 'chhidkaw', 'chhidkao', 'peele', 'yellow', 'leaves', 'patti', 'dawa']],
  ['temperature', ['temperature', 'temp', 'hot', 'cold', 'warm', 'heat', 'garmi', 'sardi',
    'thand', 'तापमान', 'गर्मी', 'ठंड', 'सर्दी']],
  ['wind', ['wind', 'gust', 'squall', 'storm', 'hawa', 'andhi', 'toofan', 'tufan',
    'हवा', 'आंधी', 'तूफान']],
  ['rain_forecast', ['rain', 'rainfall', 'shower', 'showers', 'drizzle', 'monsoon', 'barish',
    'baarish', 'बारिश', 'बरसात', 'वर्षा', 'paani']],
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
