import { LOCATION, DAILY, WARNINGS, RISK, CONFIDENCE_RESULT } from './sampleData'
import { parseLocally } from './localNlu'

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
const FARM_STATUS_REPLY = {
  en: (p, mm, cond) => `Farm Condition is Good in ${p}. Water level is adequate with ${mm} mm rain expected. Spray window is open until tomorrow morning. Disease risk is low.`,
  hi: (p, mm, cond) => `${p} में आपके खेत की स्थिति उत्तम (Good) है। नमी पर्याप्त है और ${mm} मिमी वर्षा अनुमानित है। कीटनाशक छिड़काव का अनुकूल समय खुला है। रोग जोखिम न्यूनतम है।`,
  hinglish: (p, mm, cond) => `${p} mein aapke farm ki condition Good hai. Nami adequate hai aur ${mm} mm barish expected hai. Spray window open hai. Disease risk low hai.`,
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
    en: ['Spray window is open until tomorrow 10:00 AM.', 'Hold off on deep irrigation — soil has optimal moisture.', 'Check foliage on low plots.'],
    hi: ['दवा छिड़काव का अनुकूल समय कल सुबह 10:00 बजे तक खुला है।', 'सिंचाई स्थगित रखें — मिट्टी में पर्याप्त नमी है।', 'निचले खेतों में पत्तियों की निगरानी करें।'],
    hinglish: ['Dawa spray ka accha time kal subah 10 baje tak hai.', 'Sinchai hold karein — mitti mein adequate nami hai.', 'Nichle plots par patte check karein.'],
  },
  traveller: {
    en: ['Delay non-essential travel through low-lying stretches.', 'Expect reduced visibility and crosswinds on open roads.'],
    hi: ['निचले इलाकों से होकर ग़ैर-ज़रूरी यात्रा टाल दें।', 'खुली सड़कों पर कम दृश्यता और तेज़ हवा की आशंका है।'],
    hinglish: ['Nichle ilakon se hokar gair-zaroori yatra taal dein.', 'Khuli sadkon par kam drishyata aur tez hawa ki aashanka hai.'],
  },
  general: {
    en: ['Carry rain protection if you are going out.', 'Avoid waterlogged underpasses and low-lying roads.'],
    hi: ['बाहर जा रहे हों तो बारिश से बचाव साथ रखें।', 'जलभराव वाले अंडरपास और निचली सड़कों से बचें।'],
    hinglish: ['Bahar ja rahe hon to barish se bachav saath rakhein.', 'Jalbharav wale underpass aur nichli sadkon se bachein.'],
  },
}

const band = (mm) => (mm >= 204.5 ? 'EXTREME' : mm >= 115.6 ? 'HIGH' : mm >= 64.5 ? 'MODERATE' : 'LOW')

export function mockAnswer(text, { persona = 'general', location = null, warnings = [], daily = null } = {}) {
  const nlu = parseLocally(text)
  const lang = nlu.language
  const place = nlu.location || location?.name || LOCATION.name

  const day = (daily && daily[nlu.window.day_offset]) || DAILY[nlu.window.day_offset] || DAILY[0]
  const mm = day?.mm ?? 0

  const now = Date.now()
  const activeList = warnings?.length ? warnings : WARNINGS
  const live = activeList.filter(
    (w) => w.status === 'active' && (!w.expires || new Date(w.expires).getTime() > now),
  )
  const warning = live[0] || null

  const whenKey = nlu.window.label
  const when = (WHEN[whenKey] || WHEN.today)[lang]

  let summary
  let insufficient = false
  if (nlu.intent === 'farm_status' || (/farm|khet|haal|report/i.test(text) && persona === 'farmer')) {
    summary = FARM_STATUS_REPLY[lang](place, Math.round(mm), 'Good')
  } else if (nlu.intent === 'warning_check') {
    summary = warning
      ? WARNING_ONLY[lang](place, COLOUR[warning.colour]?.[lang] || warning.colour, warning.event)
      : (lang === 'hi' ? `${place} के लिए इस समय कोई आधिकारिक सक्रिय चेतावनी नहीं है।` : lang === 'hinglish' ? `${place} ke liye is samay koi official active warning nahi hai.` : `There is no active official warning for ${place} right now.`)
  } else if (mm == null) {
    summary = NO_DATA[lang](place)
    insufficient = true
  } else if (mm < 2) {
    summary = RAIN_NONE[lang](place, when)
  } else {
    summary = RAIN_YES[lang](place, when, RAIN_BAND[band(mm)][lang], Math.round(mm))
  }

  const speech =
    lang === 'hinglish'
      ? nlu.intent === 'farm_status'
        ? FARM_STATUS_REPLY.hi(place, Math.round(mm), 'Good')
        : nlu.intent === 'warning_check' && warning
          ? WARNING_ONLY.hi(place, COLOUR[warning.colour].hi, warning.event)
          : mm < 2
            ? RAIN_NONE.hi(place, (WHEN[whenKey] || WHEN.today).hi)
            : RAIN_YES.hi(place, (WHEN[whenKey] || WHEN.today).hi, RAIN_BAND[band(mm)].hi, Math.round(mm))
      : summary

  const gloss =
    lang === 'en'
      ? null
      : nlu.intent === 'farm_status'
        ? FARM_STATUS_REPLY.en(place, Math.round(mm), 'Good')
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
    riskExplanation: `Overall farm condition is monitored with a risk score of ${RISK.score}/100.`,
    confidence: CONFIDENCE_RESULT.level,
    confidenceReasons: CONFIDENCE_RESULT.reasons,
    actions,
    actionsGloss: lang === 'en' ? [] : ACTIONS[persona]?.en || ACTIONS.general.en,
    location: LOCATION,
    sources: ['Open-Meteo (NWP)', 'NDMA Sachet', 'Continuous Farm Condition Engine'],
    composer: 'deterministic',
    insufficientData: insufficient,
    degraded: false,
    demo: true,
    at: new Date().toISOString(),
  }
}

export default mockAnswer
