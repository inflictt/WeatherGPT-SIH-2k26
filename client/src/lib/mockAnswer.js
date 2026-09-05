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

export function mockAnswer(text, { persona = 'general', location = null, warnings = [], daily = null, farm = null, intelligence = null } = {}) {
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
  const formattedMm = Math.round(mm)

  // 0. Live feedback / user correction / thunderstorm observation ("no you are wrong", "it's raining heavily", "thunderstorm outside", etc.)
  if (/wrong|galat|lying|raining heavily|heavy rain|thunderstorm|storm outside|toofan|tez barish|garaj|lightning|bijli|raining outside|raining now/i.test(lowerText)) {
    const warnSender = warning?.sender || warning?.senderName || 'Haryana-SDMA'
    const warnCol = warning?.colour || 'Orange'
    const warnEvt = warning?.event || 'Heavy Rain with Thunderstorm'
    if (lang === 'hi') {
      summary = `ज़मीनी स्थिति संज्ञान में ली गई: स्थानीय स्तर पर गरज-चमक और तेज़ बारिश के बादल तेज़ी से विकसित हो सकते हैं। ${place} क्षेत्र में भारी बारिश व आंधी की गतिविधि दर्ज है — ज़िले के लिए ${warnSender} का ${warnCol} अलर्ट (${warnEvt}) सक्रिय है। तुरंत सावधानियाँ: पक्के मकान में सुरक्षित रहें, बिजली के खंभों व पेड़ों से दूर रहें और जलभराव वाले रास्तों से बचें।`
    } else if (lang === 'hinglish') {
      summary = `Ground observation noted: Local convective storm cells rapidly develop ho sakte hain. ${place} mein is samay heavy rain aur thunderstorm active hai — district ke liye ${warnSender} ka ${warnCol} Alert (${warnEvt}) active hai. Safety tips: Indoors safe rahein, open ground aur pedon ke paas na khade hon aur waterlogging se bachein.`
    } else {
      summary = `Real-time observation noted: Highly localized convective thunderstorm cells frequently develop ahead of grid model runs. Ground reports indicate heavy downpours and storm activity in ${place}. An official ${warnCol} Alert for ${warnEvt} from ${warnSender} is currently active for the district. Immediate precautions: Stay indoors in sturdy shelter, keep away from open fields/trees, and avoid waterlogged roads.`
    }
  }
  // 1. Current real-time weather query ("current weather outside is?", "what is the weather right now?")
  else if (/current weather|weather right now|outside is|outside right now|right now|abhi ka mausam|abhi mausam|live weather|present weather|weather outside/i.test(lowerText)) {
    const tmax = day?.tempMaxC ?? 29
    const warnSender = warning?.sender || warning?.senderName || 'Haryana-SDMA'
    const warnCol = warning?.colour || 'Orange'
    const warnEvt = warning?.event || 'Heavy Rain'
    if (warning && ['orange', 'red'].includes(String(warning.colour).toLowerCase())) {
      if (lang === 'hi') {
        summary = `${place} में वर्तमान मौसम स्थिति: तापमान लगभग ${tmax}°C और नमी अधिक है। ${warnSender} द्वारा ज़िले के लिए ${warnCol} अलर्ट (${warnEvt}) सक्रिय है, जिससे रुक-रुक कर तेज़ बौछारें और आंधी संभव है। बाहर निकलते समय पूरी सतर्कता बरतें।`
      } else if (lang === 'hinglish') {
        summary = `${place} mein current weather status: Temp lagbhag ${tmax}°C aur humidity high hai. District ke liye ${warnSender} ka ${warnCol} Alert (${warnEvt}) active hai. Sudden showers aur gusty winds ke liye taiyar rahein.`
      } else {
        summary = `Current weather in ${place}: Live conditions indicate temperatures around ${tmax}°C with high humidity. An active ${warnCol} Warning for ${warnEvt} is in effect from ${warnSender} with strong chances of sudden convective showers. Keep rain gear handy.`
      }
    } else {
      if (lang === 'hi') {
        summary = `${place} में वर्तमान मौसम: तापमान लगभग ${tmax}°C और हवा की गति सामान्य है। हल्की बौछारों की संभावना बनी हुई है (कुल वर्षा लगभग ${formattedMm} मिमी)।`
      } else if (lang === 'hinglish') {
        summary = `${place} mein current weather: Temp lagbhag ${tmax}°C hai. Hawa gentle hai aur intermittent showers expected hain (total ~${formattedMm} mm).`
      } else {
        summary = `Current conditions in ${place}: Temperatures are hovering near ${tmax}°C with moderate breezes. Intermittent light-to-moderate showers (~${formattedMm} mm) remain possible.`
      }
    }
  }
  // 2. Farm status / condition / Continuous Farm Intelligence
  else if (nlu.intent === 'farm_status' || (/farm|khet|haal|report|condition|crop status|fasal|फसल|खेत|avashtha|stage/i.test(text) && persona === 'farmer')) {
    const cropName = farm?.crops?.[0]?.name || 'Wheat (गेहूँ)'
    const cropStageLabel = intelligence?.cropStage?.label || 'Active Growth'
    const cropStageDays = intelligence?.cropStage?.days != null ? ` (Day ${intelligence.cropStage.days})` : ''
    const waterVal = intelligence?.matrix?.find((m) => m.key === 'water')?.value || 'Adequate'
    const sprayVal = intelligence?.matrix?.find((m) => m.key === 'spray')?.value || 'Window Open'
    const diseaseVal = intelligence?.matrix?.find((m) => m.key === 'disease')?.value || 'Low'

    if (lang === 'hi') {
      summary = `${place} में आपके खेत (${farm?.name || 'मुख्य खेत'}) की वर्तमान स्थिति उत्तम (Good) है। फ़सल: ${cropName} (${cropStageLabel}${cropStageDays})। जल व नमी: ${waterVal}। कीटनाशक छिड़काव: ${sprayVal}। रोग जोखिम: ${diseaseVal}। अनुमानित वर्षा: ${formattedMm} मिमी।`
    } else if (lang === 'hinglish') {
      summary = `${place} mein aapke farm (${farm?.name || 'Main Farm'}) ki status Good hai. Crop: ${cropName} · ${cropStageLabel}${cropStageDays}. Water level: ${waterVal}. Spray condition: ${sprayVal}. Disease pressure: ${diseaseVal}. Expected rain: ${formattedMm} mm.`
    } else {
      summary = `Continuous Farm State for ${farm?.name || 'Main Farm'} in ${place}: Overall condition is Good. Active Crop: ${cropName} at ${cropStageLabel}${cropStageDays}. Soil water level is ${waterVal} with ~${formattedMm} mm rain outlook. Spray window is ${sprayVal}, and disease pressure is ${diseaseVal}.`
    }
  }
  // 2b. Nearest Emergency Shelter & Relief Camp query
  else if (/shelter|relief camp|rahat|shivir|aashray|suraksha|refuge|cyclone shelter|flood shelter/i.test(lowerText)) {
    if (lang === 'hi') {
      summary = `${place} के निकटतम आपातकालीन राहत शिविर: राजकीय वरिष्ठ माध्यमिक विद्यालय, कापड़ीवास (1.2 किमी दूर, खुला व सक्रिय, हेल्पलाइन: 01274-225244) तथा सामुदायिक राहत केंद्र, बावल रोड (3.4 किमी दूर)। आपातकालीन आपदा नियंत्रण हेल्पलाइन: 1077 (ज़िला) एवं 1070 (राज्य)।`
    } else if (lang === 'hinglish') {
      summary = `${place} ke nearest emergency relief shelters: Govt. Senior Secondary School, Kapriwas (1.2 km, Open & Ready, Helpline: 01274-225244) aur Community Relief Centre, Bawal Road (3.4 km). 24x7 Emergency Helplines: 1077 (District) & 1070 (State).`
    } else {
      summary = `Nearest verified emergency shelters for ${place}: 1. Govt. Senior Secondary School, Kapriwas (1.2 km away, Open & Active with water/medical support, Helpline: 01274-225244). 2. Community Relief Centre, Bawal Road (3.4 km away). 24x7 Disaster Control Helpline: 1077.`
    }
  }
  // 3. Travel advice (including typos like travek)
  else if (nlu.intent === 'travel_advice' || /travel|travek|travl|trip|journey|safar|yatra|highway|driving/i.test(lowerText)) {
    if (formattedMm >= 15 || (warning && ['orange', 'red'].includes(warning.colour))) {
      if (lang === 'hi') {
        summary = `${place} के लिए यात्रा सलाह: सावधानी बरतें। ${when} भारी वर्षा (${formattedMm} मिमी) और सक्रिय मौसम चेतावनी की संभावना है। गैर-ज़रूरी यात्रा टालें और जलभराव वाले अंडरपास व खुले हाईवे पर सतर्क रहें।`
      } else if (lang === 'hinglish') {
        summary = `${place} Travel Advisory: Caution rakhein. ${when} bhaari barish (${formattedMm} mm) aur active weather alert hai. Non-essential travel taal dein aur safe driving karein.`
      } else {
        summary = `Travel Advisory for ${place} ${when}: Exercise caution. Significant precipitation of around ${formattedMm} mm is expected alongside active weather warnings. Delay non-essential travel and avoid flood-prone routes.`
      }
    } else {
      if (lang === 'hi') {
        summary = `${place} में ${when} यात्रा दृष्टिकोण: मौसम मुख्यतः अनुकूल और यात्रा के लिए सुरक्षित है। हल्की वर्षा (${formattedMm} मिमी) हो सकती है, लेकिन मुख्य मार्ग और दृश्यता पूरी तरह सामान्य रहेगी।`
      } else if (lang === 'hinglish') {
        summary = `${place} mein ${when} Travel Outlook: Mausam friendly aur safe hai. Halki barish (${formattedMm} mm) ho sakti hai lekin roads aur visibility clear rahegi. Safe commute expected hai.`
      } else {
        summary = `Travel Outlook for ${place} ${when}: Road conditions and visibility are generally clear and safe for travel. Light showers (${formattedMm} mm) may cause brief wet patches, so maintain normal highway speeds.`
      }
    }
  }
  // 4. Irrigation advice
  else if (/irrigate|sinchai|सिंचाई|water|pani/i.test(lowerText)) {
    if (formattedMm >= 2 || (warning && ['orange', 'red'].includes(warning.colour))) {
      if (lang === 'hi') {
        summary = `सिंचाई सिफारिश: आज खेत में पानी न लगाएं। ${place} में ${when} लगभग ${formattedMm} मिमी बारिश का अनुमान है। अभी अतिरिक्त सिंचाई करने से खेत में जलभराव, जड़ सड़न और उर्वरक बहने का जोखिम हो सकता है।`
      } else if (lang === 'hinglish') {
        summary = `Irrigation Recommendation: Aaj sinchai rok dein. ${place} mein ${when} lagbhag ${formattedMm} mm barish ki sambhavna hai. Abhi paani lagane se khet mein jal-bharaav aur nutrient loss ho sakta hai.`
      } else {
        summary = `Irrigation Recommendation: Hold off on deep watering today. Around ${formattedMm} mm of rainfall is expected in ${place} ${when}, which will provide ample natural moisture without risking waterlogging or nutrient leaching.`
      }
    } else {
      if (lang === 'hi') {
        summary = `सिंचाई सिफारिश: सिंचाई करना सुरक्षित और उपयुक्त है। ${place} में ${when} कोई विशेष वर्षा नहीं होगी। 10-15 सेमी गहराई पर मिट्टी की नमी जांचें और वाष्पीकरण की दर के अनुसार सुबह के समय पानी दें।`
      } else if (lang === 'hinglish') {
        summary = `Irrigation Recommendation: Sinchai karna safe aur suitable hai. ${place} mein ${when} koi khaas barish nahi hogi. 10-15 cm gehrai par root moisture check karke subah paani dein.`
      } else {
        summary = `Irrigation Recommendation: Safe to irrigate. Dry and clear weather is forecasted for ${place} ${when}. Check root-zone moisture at 10-15 cm depth and apply measured water during early morning hours.`
      }
    }
  }
  // 5. Spray window
  else if (/spray|chhidkaw|chhidkao|छिड़काव|dawa|दवा/i.test(lowerText)) {
    if (formattedMm >= 2 || (warning && ['orange', 'red'].includes(warning.colour))) {
      if (lang === 'hi') {
        summary = `छिड़काव विंडो: बंद / प्रतिकूल। ${place} में ${when} वर्षा (${formattedMm} मिमी) के कारण छिड़की गई दवा धुलने का जोखिम है। मौसम साफ होने तक कीटनाशक या फफूंदनाशक का छिड़काव स्थगित रखें।`
      } else if (lang === 'hinglish') {
        summary = `Spray Window: Closed / Pratikool. ${place} mein ${when} barish (${formattedMm} mm) ke kaaran spray wash-off hone ka risk hai. Mausam khulne tak spray hold karein.`
      } else {
        summary = `Spray Window: Unfavourable / Closed. Expected rainfall of around ${formattedMm} mm in ${place} ${when} creates a chemical wash-off and drift risk. Postpone foliar applications until conditions dry out.`
      }
    } else {
      if (lang === 'hi') {
        summary = `छिड़काव विंडो: खुली / अत्यधिक अनुकूल। ${place} में ${when} हवा शांत और मौसम शुष्क रहने का अनुमान है। सर्वोत्तम समय: सुबह 6 से 9 बजे के बीच, जब पत्तियों पर अवशोषण सबसे प्रभावी होता है।`
      } else if (lang === 'hinglish') {
        summary = `Spray Window: Highly Favourable / Open. ${place} mein ${when} hawa calm aur dry mausam rahega. Best time: Subah 6 se 9 baje jab foliar absorption maximum hota hai.`
      } else {
        summary = `Spray Window: Highly Favourable / Open. Calm winds and dry conditions are forecasted for ${place} ${when}. Optimal application window: Early morning (6:00 AM – 9:00 AM) for maximum foliar absorption.`
      }
    }
  }
  // 6. Yellow leaves / disease diagnostic
  else if (/yellow|leaf|leaves|patte|patti|peele|पीले|पत्ते|रोग/i.test(lowerText)) {
    if (lang === 'hi') {
      summary = `${place} फसल पत्ती पीली पड़ने का विश्लेषण: 1) नाइट्रोजन या पोषक तत्वों की कमी (निचले पुराने पत्तों से शुरुआत), 2) जड़ क्षेत्र में अधिक नमी व जलभराव, या 3) फंगल संक्रमण। तुरंत कदम: 10-15 सेमी गहराई पर जड़ की नमी जांचें, जल निकासी नाली साफ करें और नजदीकी KVK से परामर्श लें।`
    } else if (lang === 'hinglish') {
      summary = `${place} Crop Foliage Diagnostic: Patte peele hone ke mukhya kaaran: 1) Nitrogen/nutrients ki kami (purane patton se shuruaat), 2) Jado mein excess moisture/waterlogging, ya 3) Fungal infection. Action: 10-15 cm par nami check karein aur drainage open karein.`
    } else {
      summary = `Crop Foliage Diagnostic for ${place}: Yellowing leaves (chlorosis) usually point to: 1) Nitrogen deficiency (starting on older lower leaves), 2) Root waterlogging & poor soil aeration, or 3) Early fungal blight. Field Action: Squeeze-test soil at 10-15 cm root depth, clear drainage furrows, and consult your local KVK extension officer with a sample.`
    }
  }
  // 7. Temperature
  else if (/temp|temperature|garmi|sardi|thand|गर्मी|सर्दी|तापमान/i.test(lowerText)) {
    const tmax = day?.tempMaxC ?? 31
    const tmin = day?.tempMinC ?? 22
    if (lang === 'hi') {
      summary = `${place} में ${when} तापमान दृष्टिकोण: अधिकतम तापमान ${tmax}°C और न्यूनतम तापमान ${tmin}°C रहने का अनुमान है। दिन में हल्की गर्माहट और सुबह-शाम का मौसम काफी सुखद रहेगा।`
    } else if (lang === 'hinglish') {
      summary = `${place} mein ${when} Temperature Outlook: Day high lagbhag ${tmax}°C aur night low ${tmin}°C rahega. Subah aur shaam ka mausam comfortable rahega.`
    } else {
      summary = `Temperature Outlook for ${place} ${when}: Daytime highs will reach around ${tmax}°C with pleasant overnight lows settling near ${tmin}°C. Humidity levels will remain comfortable throughout the day.`
    }
  }
  // 8. Warning check
  else if (nlu.intent === 'warning_check' || /warning|alert|chetawani|चेतावनी/i.test(lowerText)) {
    summary = warning
      ? (lang === 'hi' ? `${place} के लिए ${COLOUR[warning.colour]?.hi || warning.colour} अलर्ट सक्रिय है: ${warning.event}। सामान्य दिनचर्या जारी रखें परंतु निचले इलाकों में सतर्क रहें।` : lang === 'hinglish' ? `${place} ke liye ${COLOUR[warning.colour]?.hinglish || warning.colour} warning active hai: ${warning.event}. Normal routines can continue with standard awareness.` : `There is an active ${warning.colour} warning for ${place}: ${warning.event}. Standard precautions apply in low-lying sectors.`)
      : (lang === 'hi' ? `${place} के लिए इस समय कोई गंभीर मौसम चेतावनी सक्रिय नहीं है। सभी दैनिक कार्य और कृषि गतिविधियां सामान्य रूप से की जा सकती हैं।` : lang === 'hinglish' ? `${place} ke liye is samay koi severe weather warning active nahi hai. All regular tasks can proceed normally.` : `There is no active severe weather warning for ${place} right now. General activities can proceed as normal.`)
  }
  // 9. Rain forecast (e.g. "Will it rain this evening?")
  else if (mm == null) {
    summary = NO_DATA[lang](place)
    insufficient = true
  } else if (formattedMm < 2 && (!warning || !['orange', 'red'].includes(warning.colour))) {
    if (lang === 'hi') {
      summary = `${place} में ${when} मौसम मुख्यतः शुष्क और आंशिक रूप से साफ रहने का अनुमान है (उल्लेखनीय वर्षा की संभावना नहीं है)। बाहरी कार्य और सामान्य दिनचर्या बिना रुकावट जारी रखी जा सकती है।`
    } else if (lang === 'hinglish') {
      summary = `${place} mein ${when} mausam mostly clear aur dry rahega (barish ki koi khaas sambhavna nahi hai). Aap apne daily outdoor plans bina kisi pareshani ke continue kar sakte hain.`
    } else {
      summary = `Mostly clear to partly cloudy skies are expected in ${place} ${when}, with negligible rain chance (under 2 mm). Temperatures will remain comfortable with gentle breezes, making it ideal for outdoor activities.`
    }
  } else {
    const warnNotice = warning && ['orange', 'red'].includes(warning.colour) ? ` (Active ${warning.colour} Warning)` : ''
    if (lang === 'hi') {
      summary = `${place} में ${when} रुक-रुक कर बारिश की संभावना है, कुल लगभग ${formattedMm} मिमी${warnNotice}। हवा की गति सामान्य रहेगी। बाहर निकलते समय छाता या रेन प्रोटेक्शन साथ रखें।`
    } else if (lang === 'hinglish') {
      summary = `${place} mein ${when} ruk-ruk kar barish hone ki sambhavna hai, lagbhag ${formattedMm} mm tak${warnNotice}। Hawa ki speed normal rahegi aur mausam pleasant rahega. Bahar jaate waqt umbrella saath rakhein.`
    } else {
      summary = `Expect showers in ${place} ${when}, totaling around ${formattedMm} mm${warnNotice}. Peak shower likelihood is accompanied by moderate humidity and pleasant breezes. Keep a light rain jacket or umbrella handy if heading outdoors.`
    }
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
