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
  const isUdaipur = !location?.name || location.name.toLowerCase() === 'udaipur'
  const activeList = Array.isArray(warnings) && warnings.length > 0 ? warnings : (isUdaipur ? WARNINGS : [])
  const live = activeList.filter(
    (w) => w.status === 'active' && (!w.expires || new Date(w.expires).getTime() > now),
  )
  const warning = live[0] || null

  const whenKey = nlu.window.label
  const when = (WHEN[whenKey] || WHEN.today)[lang]

  let summary
  let insufficient = false
  const lowerText = text.toLowerCase()

  // 1. Farm status / condition
  if (nlu.intent === 'farm_status' || (/farm|khet|haal|report/i.test(text) && persona === 'farmer')) {
    summary = FARM_STATUS_REPLY[lang](place, Math.round(mm), 'Good')
  }
  // 2. Irrigation
  else if (/irrigate|sinchai|सिंचाई|water/i.test(lowerText)) {
    if (mm >= 2) {
      if (lang === 'hi') {
        summary = `सिफारिश: आज सिंचाई रोकें। ${place} में ${when} लगभग ${Math.round(mm)} मिमी बारिश की संभावना है। अभी सिंचाई करने से खेत में जलभराव और पोषक तत्वों के बहने का जोखिम हो सकता है।`
      } else if (lang === 'hinglish') {
        summary = `Recommendation: Aaj sinchai rok dein. ${place} mein ${when} lagbhag ${Math.round(mm)} mm barish hone ki sambhavna hai. Abhi sinchai karne se khet mein jal-bharaav ho sakta hai.`
      } else {
        summary = `Recommendation: Hold off on irrigation. Around ${Math.round(mm)} mm of rainfall is expected in ${place} ${when}. Irrigating now may cause root waterlogging and nutrient leaching.`
      }
    } else {
      if (lang === 'hi') {
        summary = `सिफारिश: सिंचाई करना सुरक्षित है। ${place} में ${when} कोई खास बारिश नहीं होगी (तापमान सामान्य रहेगा)। जड़ के पास 10-15 सेमी गहराई पर नमी जांचकर आवश्यकतानुसार पानी दें।`
      } else if (lang === 'hinglish') {
        summary = `Recommendation: Sinchai karna surakshit hai. ${place} mein ${when} koi khaas barish nahi hogi. Jar ke paas 10-15 cm gehrai par nami check karke sinchai karein.`
      } else {
        summary = `Recommendation: Safe to irrigate. No significant rain is expected in ${place} ${when}. Check soil moisture at root depth (10-15 cm) before applying water.`
      }
    }
  }
  // 3. Spray window
  else if (/spray|chhidkaw|छिड़काव|dawa|दवा/i.test(lowerText)) {
    if (mm >= 2) {
      if (lang === 'hi') {
        summary = `छिड़काव विंडो: बंद / प्रतिकूल। ${place} में ${when} बारिश (${Math.round(mm)} मिमी) के कारण दवा धुलने का जोखिम है। छिड़काव स्थगित रखें।`
      } else if (lang === 'hinglish') {
        summary = `Spray Window: Closed / Pratikool. ${place} mein ${when} barish (${Math.round(mm)} mm) ke kaaran spray karna theek nahi hai.`
      } else {
        summary = `Spray Window: Closed / Unfavourable. Expected rain (${Math.round(mm)} mm) creates a wash-off risk in ${place} ${when}. Hold off on spraying.`
      }
    } else {
      if (lang === 'hi') {
        summary = `छिड़काव विंडो: खुली / अनुकूल। ${place} में ${when} हवा शांत है और मौसम शुष्क रहेगा। सुबह 6 से 9 बजे का समय छिड़काव के लिए सर्वोत्तम है।`
      } else if (lang === 'hinglish') {
        summary = `Spray Window: Open / Anukool. ${place} mein ${when} mausam shant aur dry rahega. Subah 6 se 9 baje spray ka best time hai.`
      } else {
        summary = `Spray Window: Open / Favourable. Calm winds and dry conditions in ${place} ${when}. Optimal spray hours: Early morning (6:00 AM - 9:00 AM).`
      }
    }
  }
  // 4. Yellow leaves / disease inquiry
  else if (/yellow|leaf|leaves|patte|peele|पीले|पत्ते|रोग/i.test(lowerText)) {
    if (lang === 'hi') {
      summary = `फसल पत्ती पीली पड़ने का विश्लेषण (${place}): 1. नाइट्रोजन या आवश्यक पोषक तत्वों की कमी (निचले पुराने पत्तों से शुरुआत)। 2. खेत में जलभराव या जड़ में अधिक नमी। 3. फंगल या ब्लाइट संक्रमण। सलाह: जड़ के पास 10-15 सेमी पर नमी जांचें, जल निकासी सुनिश्चित करें और पत्ती का नमूना नजदीकी KVK को दिखाएं।`
    } else if (lang === 'hinglish') {
      summary = `Crop Foliage Diagnostic (${place}): Patte peele hone ke mukhya kaaran: 1. Nitrogen/poshak tatva ki kami. 2. Khet mein jal-bharaav ya jado mein over-moisture. 3. Fungal ya blight sankraman. Salah: Jado ke paas 10-15 cm par nami check karein aur drainage saaf karein.`
    } else {
      summary = `Crop Foliage Diagnostic (${place}): Yellowing leaves typically indicate: 1. Nitrogen deficiency (chlorosis starting on older lower leaves). 2. Soil waterlogging & root suffocation. 3. Foliar fungal infection. Recommendation: Check root-zone moisture at 10-15 cm, ensure drainage furrows are open, and consult your local KVK extension officer.`
    }
  }
  // 5. Travel safety
  else if (/travel|safar|yatra|safe to travel|यात्रा|सफर/i.test(lowerText)) {
    if (mm >= 20 || (warning && ['orange', 'red'].includes(warning.colour))) {
      if (lang === 'hi') {
        summary = `यात्रा सलाह: सावधानी बरतें। ${place} में ${when} भारी वर्षा (${Math.round(mm)} मिमी) की संभावना है। गैर-जरूरी यात्रा टालें और जलभराव वाले रास्तों से बचें।`
      } else if (lang === 'hinglish') {
        summary = `Travel Advisory: Caution rakhein. ${place} mein ${when} bhaari barish (${Math.round(mm)} mm) ki sambhavna hai. Gair-zaroori travel taal dein.`
      } else {
        summary = `Travel Advisory: Exercise caution. Significant rain (${Math.round(mm)} mm) expected in ${place} ${when}. Avoid low-lying underpasses and open highway stretches.`
      }
    } else {
      if (lang === 'hi') {
        summary = `यात्रा सलाह: यात्रा के लिए मौसम अनुकूल और सुरक्षित है। ${place} में ${when} कोई गंभीर मौसम चेतावनी नहीं है।`
      } else if (lang === 'hinglish') {
        summary = `Travel Advisory: Mausam safe aur clear hai. ${place} mein ${when} travel karne mein koi pareshani nahi hai.`
      } else {
        summary = `Travel Advisory: Safe for travel. Road and weather conditions in ${place} ${when} are clear with normal visibility.`
      }
    }
  }
  // 6. Temperature
  else if (/temp|temperature|garmi|sardi|thand|गर्मी|सर्दी|तापमान/i.test(lowerText)) {
    const tmax = day?.tempMaxC ?? 31
    const tmin = day?.tempMinC ?? 22
    if (lang === 'hi') {
      summary = `${place} में ${when}: अधिकतम तापमान ${tmax} °C और न्यूनतम तापमान ${tmin} °C रहने का अनुमान है।`
    } else if (lang === 'hinglish') {
      summary = `${place} mein ${when}: Max temp ${tmax} °C aur min temp ${tmin} °C rehne ka anumaan hai.`
    } else {
      summary = `${place} ${when}: Expected high of ${tmax} °C and a comfortable low of ${tmin} °C.`
    }
  }
  // 7. Warning check
  else if (nlu.intent === 'warning_check' || /warning|alert|chetawani|चेतावनी/i.test(lowerText)) {
    summary = warning
      ? WARNING_ONLY[lang](place, COLOUR[warning.colour]?.[lang] || warning.colour, warning.event)
      : (lang === 'hi' ? `${place} के लिए इस समय कोई आधिकारिक सक्रिय चेतावनी नहीं है।` : lang === 'hinglish' ? `${place} ke liye is samay koi official active warning nahi hai.` : `There is no active official warning for ${place} right now.`)
  }
  // 8. Rain forecast default
  else if (mm == null) {
    summary = NO_DATA[lang](place)
    insufficient = true
  } else if (mm < 2) {
    summary = RAIN_NONE[lang](place, when)
  } else {
    summary = RAIN_YES[lang](place, when, RAIN_BAND[band(mm)][lang], Math.round(mm))
  }

  const speech = summary
  const gloss = lang === 'en' ? null : summary

  const actions = (ACTIONS[persona] || ACTIONS.general)[lang]
  const isWarningSpecific = nlu.intent === 'warning_check' || /warning|alert|chetawani|चेतावनी/i.test(lowerText)
  const isSevereAlert = warning && ['orange', 'red'].includes(String(warning.colour).toLowerCase())
  const attachWarning = warning && (isWarningSpecific || isSevereAlert)

  return {
    id: `a${Date.now()}`,
    role: 'assistant',
    lang,
    summary,
    gloss,
    speech,
    warningMessage: attachWarning
      ? GLOSS[lang](warning.sender || warning.senderName || 'IMD', COLOUR[warning.colour]?.[lang] || warning.colour)
      : null,
    officialText: attachWarning
      ? {
          headline: warning.headline,
          description: warning.description,
          instruction: warning.instruction,
          senderName: warning.sender || warning.senderName,
          colour: warning.colour,
          expires: warning.expires,
        }
      : null,
    warning: attachWarning ? warning : null,
    warningRef: attachWarning ? warning?.identifier ?? null : null,
    riskBand: attachWarning ? RISK.overall : 'LOW',
    riskScore: attachWarning ? RISK.score : 18,
    flooredBy: attachWarning ? RISK.flooredBy : null,
    riskExplanation: attachWarning ? `Monitored with a risk score of ${RISK.score}/100.` : `Overall condition is normal with low weather risk.`,
    confidence: CONFIDENCE_RESULT.level,
    confidenceReasons: CONFIDENCE_RESULT.reasons,
    actions,
    actionsGloss: lang === 'en' ? [] : ACTIONS[persona]?.en || ACTIONS.general.en,
    location: location || LOCATION,
    sources: ['Open-Meteo (NWP)', 'NDMA Sachet', 'Continuous Condition Engine'],
    composer: 'Engine Grounded',
    insufficientData: insufficient,
    degraded: false,
    demo: true,
    at: new Date().toISOString(),
  }
}

export default mockAnswer
