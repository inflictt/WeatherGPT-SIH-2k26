import { LOCATION, DAILY, WARNINGS, RISK, CONFIDENCE_RESULT } from './sampleData'
import { parseLocally } from './localNlu'

/**
 * A grounded answer, composed in the browser, for when there is no backend.
 *
 * This exists so the frontend can be demonstrated on its own — handed to
 * someone as a link or a single file — with every screen showing real
 * behaviour rather than a dead input box.
 *
 * It is a **port of the same rules**, not a shortcut past them:
 *
 *   - Every figure it prints comes from `sampleData`. Nothing is generated,
 *     interpolated, or rounded into existence.
 *   - Missing data produces "I don't have reliable forecast data", never an
 *     estimate — the same sentence `ai/app/engines/compose.py` produces.
 *   - The active warning is attached to the answer, and its official text is
 *     copied through untouched.
 *   - The risk band comes from the sample risk object, floor and all. Nothing
 *     here recomputes or softens it.
 *
 * When `VITE_API_URL` is set, none of this runs: `Chat.jsx` calls the real
 * `POST /api/chat/query` and the Python composer answers instead.
 */

const RAIN_BAND = {
  LOW: { en: 'light to moderate rain', hi: 'हल्की से मध्यम बारिश', hinglish: 'halki se madhyam barish' },
  MODERATE: { en: 'heavy rain', hi: 'तेज़ बारिश', hinglish: 'tez barish' },
  HIGH: { en: 'very heavy rain', hi: 'बहुत तेज़ बारिश', hinglish: 'bahut tez barish' },
  EXTREME: { en: 'extremely heavy rain', hi: 'अत्यंत भारी बारिश', hinglish: 'atyant bhaari barish' },
}

const WHEN = {
  today: { en: 'today', hi: 'आज', hinglish: 'aaj' },
  tomorrow: { en: 'tomorrow', hi: 'कल', hinglish: 'kal' },
  'today evening': { en: 'this evening', hi: 'आज शाम', hinglish: 'aaj shaam' },
  'tomorrow evening': { en: 'tomorrow evening', hi: 'कल शाम', hinglish: 'kal shaam' },
  'today morning': { en: 'this morning', hi: 'आज सुबह', hinglish: 'aaj subah' },
  'tomorrow morning': { en: 'tomorrow morning', hi: 'कल सुबह', hinglish: 'kal subah' },
}

const RAIN_YES = {
  en: (p, w, b, mm) => `Yes — ${b} is likely in ${p} ${w}, around ${mm} mm.`,
  hi: (p, w, b, mm) => `हाँ — ${p} में ${w} ${b} की संभावना है, लगभग ${mm} मिमी।`,
  hinglish: (p, w, b, mm) => `Haan — ${p} mein ${w} ${b} ki sambhavna hai, lagbhag ${mm} mm.`,
}
const RAIN_NONE = {
  en: (p, w) => `No — no significant rain is expected in ${p} ${w}.`,
  hi: (p, w) => `नहीं — ${p} में ${w} उल्लेखनीय वर्षा की संभावना नहीं है।`,
  hinglish: (p, w) => `Nahin — ${p} mein ${w} koi khaas barish ki ummeed nahin hai.`,
}
const NO_DATA = {
  en: (p) => `I don't have reliable forecast data for ${p} right now.`,
  hi: (p) => `इस समय मेरे पास ${p} के लिए भरोसेमंद पूर्वानुमान नहीं है।`,
  hinglish: (p) => `Is samay mere paas ${p} ke liye bharosemand forecast nahin hai.`,
}
const WARNING_ONLY = {
  en: (p, c, e) => `There is an active ${c} warning for ${p}: ${e}.`,
  hi: (p, c, e) => `${p} के लिए एक सक्रिय ${c} चेतावनी है: ${e}।`,
  hinglish: (p, c, e) => `${p} ke liye ek active ${c} warning hai: ${e}.`,
}
const COLOUR = {
  orange: { en: 'orange', hi: 'नारंगी', hinglish: 'orange' },
  red: { en: 'red', hi: 'लाल', hinglish: 'red' },
  yellow: { en: 'yellow', hi: 'पीली', hinglish: 'yellow' },
  green: { en: 'green', hi: 'हरी', hinglish: 'green' },
}
const GLOSS = {
  en: (s, c) => `${s} has an active ${c} alert for this area — be prepared.`,
  hi: (s, c) => `${s} ने इस क्षेत्र के लिए ${c} अलर्ट जारी किया है — तैयार रहें।`,
  hinglish: (s, c) => `${s} ne is ilake ke liye ${c} alert jari kiya hai — taiyar rahein.`,
}

const ACTIONS = {
  farmer: {
    en: ['Cover harvested produce before the rain begins.', 'Delay irrigation — the soil will take up this rain.'],
    hi: ['बारिश शुरू होने से पहले कटी हुई फ़सल को ढक दें।', 'सिंचाई टाल दें — मिट्टी यह पानी सोख लेगी।'],
    hinglish: ['Barish shuru hone se pehle kati hui fasal dhak dein.', 'Sinchai taal dein — mitti yeh paani sokh legi.'],
  },
  traveller: {
    en: ['Delay non-essential travel through low-lying stretches.', 'Expect reduced visibility and crosswinds on open roads.'],
    hi: ['निचले इलाकों से होकर ग़ैर-ज़रूरी यात्रा टाल दें।', 'खुली सड़कों पर कम दृश्यता और तेज़ हवा की आशंका है।'],
    hinglish: ['Nichle ilakon se hokar gair-zaroori yatra taal dein.', 'Khuli sadkon par kam drishyata aur tez hawa ki aashanka hai.'],
  },
  official: {
    en: ['Brief block-level staff and check low-lying settlements.', 'Verify pump and drainage readiness before the peak window.'],
    hi: ['ब्लॉक स्तर के कर्मचारियों को सूचित करें और निचली बस्तियों की जाँच करें।', 'पीक समय से पहले पंप और जल-निकासी की तैयारी जाँच लें।'],
    hinglish: ['Block star ke karmchariyon ko soochit karein aur nichli bastiyon ki jaanch karein.', 'Peak samay se pehle pump aur jal-nikasi ki taiyari jaanch lein.'],
  },
  general: {
    en: ['Carry rain protection if you are going out.', 'Avoid waterlogged underpasses and low-lying roads.'],
    hi: ['बाहर जा रहे हों तो बारिश से बचाव साथ रखें।', 'जलभराव वाले अंडरपास और निचली सड़कों से बचें।'],
    hinglish: ['Bahar ja rahe hon to barish se bachav saath rakhein.', 'Jalbharav wale underpass aur nichli sadkon se bachein.'],
  },
}

const band = (mm) => (mm >= 204.5 ? 'EXTREME' : mm >= 115.6 ? 'HIGH' : mm >= 64.5 ? 'MODERATE' : 'LOW')

/** Compose an answer from the bundled sample, in the detected language. */
export function mockAnswer(text, { persona = 'general' } = {}) {
  const nlu = parseLocally(text)
  const lang = nlu.language
  const place = LOCATION.name

  const day = DAILY[nlu.window.day_offset] || DAILY[0]
  const mm = day?.mm ?? null

  const now = Date.now()
  const live = WARNINGS.filter(
    (w) => w.status === 'active' && (!w.expires || new Date(w.expires).getTime() > now),
  )
  const warning = live[0] || null

  const whenKey = nlu.window.label
  const when = (WHEN[whenKey] || WHEN.today)[lang]

  let summary
  let insufficient = false
  if (nlu.intent === 'warning_check') {
    summary = warning
      ? WARNING_ONLY[lang](place, COLOUR[warning.colour][lang], warning.event)
      : RAIN_NONE[lang](place, when)
  } else if (mm == null) {
    summary = NO_DATA[lang](place)
    insufficient = true
  } else if (mm < 2) {
    summary = RAIN_NONE[lang](place, when)
  } else {
    summary = RAIN_YES[lang](place, when, RAIN_BAND[band(mm)][lang], Math.round(mm))
  }

  // Hinglish displays in Latin but is *spoken* in Devanagari, or hi-IN
  // pronounces it as English. Same rule as the Python composer.
  const speech =
    lang === 'hinglish'
      ? nlu.intent === 'warning_check' && warning
        ? WARNING_ONLY.hi(place, COLOUR[warning.colour].hi, warning.event)
        : mm == null
          ? NO_DATA.hi(place)
          : mm < 2
            ? RAIN_NONE.hi(place, (WHEN[whenKey] || WHEN.today).hi)
            : RAIN_YES.hi(place, (WHEN[whenKey] || WHEN.today).hi, RAIN_BAND[band(mm)].hi, Math.round(mm))
      : summary

  const gloss =
    lang === 'en'
      ? null
      : mm == null
        ? NO_DATA.en(place)
        : mm < 2
          ? RAIN_NONE.en(place, WHEN[whenKey]?.en || 'today')
          : RAIN_YES.en(place, WHEN[whenKey]?.en || 'today', RAIN_BAND[band(mm)].en, Math.round(mm))

  const actions = (ACTIONS[persona] || ACTIONS.general)[lang]

  return {
    id: `a${Date.now()}`,
    role: 'assistant',
    lang,
    summary,
    gloss,
    speech,
    warningMessage: warning
      ? GLOSS[lang](warning.sender, COLOUR[warning.colour][lang])
      : null,
    // Verbatim. The gloss above is a separate, separately labelled field.
    officialText: warning
      ? {
          headline: warning.headline,
          description: warning.description,
          instruction: warning.instruction,
          senderName: warning.sender,
          colour: warning.colour,
          expires: warning.expires,
        }
      : null,
    warning,
    warningRef: warning?.identifier ?? null,
    riskBand: RISK.overall,
    riskScore: RISK.score,
    flooredBy: RISK.flooredBy,
    riskExplanation: `Overall risk is ${RISK.overall}, with a score of ${RISK.score}.`,
    confidence: CONFIDENCE_RESULT.level,
    confidenceReasons: CONFIDENCE_RESULT.reasons,
    actions,
    actionsGloss: lang === 'en' ? [] : ACTIONS[persona]?.en || ACTIONS.general.en,
    location: LOCATION,
    sources: ['Open-Meteo', 'NDMA Sachet (CAP)'],
    composer: 'deterministic',
    insufficientData: insufficient,
    degraded: false,
    demo: true,
    at: new Date().toISOString(),
  }
}

export default mockAnswer
