/**
 * Multilingual Intent Classifier and Entity Extractor for Krishivaani & Akashvaani.
 *
 * Supports Hindi (Devanagari), Hinglish (Latin transliteration), and English.
 * Categorizes user queries with precision before context assembly so tools and data
 * are fetched strictly on demand rather than dumping a universal daily brief.
 */

export const INTENTS = {
  GREETING: 'GREETING',
  GENERAL_CONVERSATION: 'GENERAL_CONVERSATION',
  RAIN_GEAR: 'RAIN_GEAR',
  TRAVEL_SAFETY: 'TRAVEL_SAFETY',
  WEATHER_CURRENT: 'WEATHER_CURRENT',
  WEATHER_TODAY: 'WEATHER_TODAY',
  WEATHER_TOMORROW: 'WEATHER_TOMORROW',
  RAIN_FORECAST: 'RAIN_FORECAST',
  RAIN_TIMING: 'RAIN_TIMING',
  RAINFALL_AMOUNT: 'RAINFALL_AMOUNT',
  TEMPERATURE: 'TEMPERATURE',
  WIND_HUMIDITY: 'WIND_HUMIDITY',
  WEATHER_IMPACT_ON_CROP: 'WEATHER_IMPACT_ON_CROP',
  IRRIGATION: 'IRRIGATION',
  SPRAY_WINDOW: 'SPRAY_WINDOW',
  CROP_HEALTH: 'CROP_HEALTH',
  CROP_SOWING: 'CROP_SOWING',
  CROP_STAGE: 'CROP_STAGE',
  FARM_STATUS: 'FARM_STATUS',
  FARM_TASKS: 'FARM_TASKS',
  FARM_FINANCE: 'FARM_FINANCE',
  FARM_FIELDS: 'FARM_FIELDS',
  LIVESTOCK: 'LIVESTOCK',
  ALERT: 'ALERT',
  GENERAL_AGRICULTURE: 'GENERAL_AGRICULTURE',
  UNRELATED: 'UNRELATED',
  AMBIGUOUS: 'AMBIGUOUS',
  FOLLOW_UP: 'FOLLOW_UP',
}

const CROPS = [
  { name: 'wheat', aliases: ['wheat', 'gehun', 'gehu', 'गेहूं', 'गेहुं'] },
  { name: 'mustard', aliases: ['mustard', 'sarson', 'sarso', 'सरसों', 'राई'] },
  { name: 'rice', aliases: ['rice', 'paddy', 'dhan', 'chawal', 'धान', 'चावल'] },
  { name: 'cotton', aliases: ['cotton', 'kapas', 'kapaas', 'कपास'] },
  { name: 'sugarcane', aliases: ['sugarcane', 'ganna', 'ईख', 'गन्ना'] },
  { name: 'potato', aliases: ['potato', 'aloo', 'aalu', 'आलू'] },
  { name: 'gram', aliases: ['gram', 'chana', 'चना'] },
  { name: 'maize', aliases: ['maize', 'corn', 'makka', 'मक्का'] },
  { name: 'tomato', aliases: ['tomato', 'tamatar', 'टमाटर'] },
  { name: 'onion', aliases: ['onion', 'pyaz', 'pyaaj', 'प्याज'] },
]

const VULGAR_OR_ABUSIVE = [
  /\bgand\b/i,
  /\blund\b/i,
  /\bchut\b/i,
  /\bchutiya\b/i,
  /\bgaand\b/i,
  /\bmadarchod\b/i,
  /\bbehenchod\b/i,
  /\bbhosd\b/i,
  /\bfuck\b/i,
  /\bbitch\b/i,
  /\bpenis\b/i,
  /\bvagina\b/i,
  /\bsex\b/i,
  /\bporn\b/i,
]

const GREETINGS = [
  /^hi\b/i,
  /^hello\b/i,
  /^hey\b/i,
  /^namaste\b/i,
  /^namaskar\b/i,
  /^pranam\b/i,
  /^good morning\b/i,
  /^good afternoon\b/i,
  /^good evening\b/i,
  /^ram ram\b/i,
  /^jai shree ram\b/i,
  /^salaam\b/i,
  /^hello hello/i,
  /^wah wah/i,
  /^नमस्ते/i,
  /^नमस्कार/i,
  /^प्रणाम/i,
  /^राम राम/i,
  /^शुभ प्रभात/i,
]

/**
 * Extract crop mentioned in the text
 */
export function extractCrop(text = '') {
  const lower = text.toLowerCase()
  for (const crop of CROPS) {
    for (const alias of crop.aliases) {
      const regex = new RegExp(`(^|[^a-zA-Z0-9\u0900-\u097F])${alias}([^a-zA-Z0-9\u0900-\u097F]|$)`, 'i')
      if (regex.test(lower)) {
        return crop.name
      }
    }
  }
  return null
}

/**
 * Extract temporal reference
 */
export function extractTemporal(text = '') {
  const lower = text.toLowerCase()
  if (/(कल|kal|tomorrow)/i.test(lower)) return 'tomorrow'
  if (/(आज|aaj|today|right now|abhi)/i.test(lower)) return 'today'
  if (/(परसों|parson|day after tomorrow)/i.test(lower)) return 'day_after_tomorrow'
  if (/(कल शाम|kal shaam|tomorrow evening)/i.test(lower)) return 'tomorrow_evening'
  if (/(कल सुबह|kal subah|tomorrow morning)/i.test(lower)) return 'tomorrow_morning'
  if (/(आज शाम|aaj shaam|this evening)/i.test(lower)) return 'today_evening'
  return 'today'
}

/**
 * Classify the intent of a user message.
 * Also inspects previous conversation turns for follow-up resolution.
 */
export function classifyIntent(text = '', history = []) {
  const raw = String(text || '').trim()
  const lower = ` ${raw.toLowerCase()} `

  // 1. Inappropriate / Abusive / Vulgar detection
  for (const regex of VULGAR_OR_ABUSIVE) {
    if (regex.test(lower)) {
      return {
        intent: INTENTS.UNRELATED,
        subCategory: 'inappropriate',
        confidence: 0.99,
        crop: null,
        temporal: null,
      }
    }
  }

  // 2. Rain Gear / Comparison: Raincoat vs Umbrella
  // e.g. "Raincoat better hai ya umbrella?", "umbrella or raincoat", "chhaata le jaun ya raincoat"
  if (
    /(raincoat|umbrella|chhaata|chhata|chhatri|रेनकोट|छाता)/i.test(lower) &&
    /(better|ya|or|versus|vs|chahiye|kaun sa|sahi|achha|accha|ले जाऊं|पहनूं)/i.test(lower)
  ) {
    return {
      intent: INTENTS.RAIN_GEAR,
      confidence: 0.98,
      crop: null,
      temporal: extractTemporal(raw),
    }
  }

  // 3. General Conversational Questions ("how are you", "kaise ho", "kya haal hai", "who are you")
  if (
    /(how are you|kaise ho|kaise hain|kya haal hai|kya hal hai|who are you|aap kaun ho|tum kaun ho|who made you|kya kar sakte ho|how do you work)/i.test(lower) &&
    !/(farm|khet|fasal|crop|weather|mausam)/i.test(lower)
  ) {
    return {
      intent: INTENTS.GENERAL_CONVERSATION,
      confidence: 0.96,
      crop: null,
      temporal: null,
    }
  }

  // 4. Pure Greeting detection
  // e.g. "hi", "hello", "namaste", "hello hello wah wah", "good morning"
  const cleanTokens = raw.replace(/[^\w\s\u0900-\u097F]/gi, '').trim()
  const isGreetingWord = GREETINGS.some((g) => g.test(cleanTokens))
  if (isGreetingWord) {
    const words = cleanTokens.split(/\s+/).filter(Boolean)
    if (words.length <= 4 && !/(barish|baarish|pani|khet|farm|gehun|fasal|spray|sinchai|weather|rain|तापमान|बारिश|सिंचाई|खेत)/i.test(lower)) {
      return {
        intent: INTENTS.GREETING,
        confidence: 0.98,
        crop: null,
        temporal: null,
      }
    }
  }

  // 5. Travel & Outdoor Safety query
  // e.g. "Is it safe to travel tomorrow?", "kal travel karna safe hai?", "can I go outside?", "bahar ja sakte hain kya?"
  if (
    /(travel|safari|yatra|यात्रा|bahar|outside|driving|ja sakte|safe to go|safe to travel|safar|drive karna)/i.test(lower) &&
    /(safe|surakshit|suraksha|सुरक्षित|thik|karein|karna|chahiye|जाना)/i.test(lower)
  ) {
    return {
      intent: INTENTS.TRAVEL_SAFETY,
      confidence: 0.96,
      crop: null,
      temporal: extractTemporal(raw),
    }
  }

  // 6. Weather Impact on Crop query
  // e.g. "Will rain affect my wheat?", "kya barish se fasal ko nuksan hoga?", "barish aur gehun"
  const mentionedCrop = extractCrop(raw)
  if (
    mentionedCrop &&
    /(rain|barish|baarish|weather|mausam|hawa|barph|storm)/i.test(lower) &&
    /(affect|effect|damage|nuksan|nuksaan|kharab|kharaba|bura asar|asar|faayda|फायदा|नुकसान|असर)/i.test(lower)
  ) {
    return {
      intent: INTENTS.WEATHER_IMPACT_ON_CROP,
      confidence: 0.95,
      crop: mentionedCrop,
      temporal: extractTemporal(raw),
    }
  }

  // 7. Sowing / Planting Farm Memory Event
  // e.g. "मैंने आज खेत में गेहूं बोए हैं।", "aaj gehun boya", "wheat sown today", "buwai kar di"
  if (
    /(बोया|बोए|बुवाई|बोने|बोई|boya|boye|sown|sowing|planted|planting|buwai|buwayi|bowaai)/i.test(lower) &&
    !/(कब बोए|kab boye|when to sow|sowing time|kab boen)/i.test(lower)
  ) {
    const crop = mentionedCrop || 'crop'
    const temporal = extractTemporal(raw)
    return {
      intent: INTENTS.CROP_SOWING,
      confidence: 0.95,
      crop,
      temporal,
      activity: 'sowing',
      userObservation: true,
    }
  }

  // 8. Follow-up detection
  // e.g. "Then what should I do?", "phir kya karu?", "to kya karein?", "पानी कब दूं?", "aur kal?"
  const lastTurn = history.length > 0 ? history[history.length - 1] : null
  if (
    /(then what should i do|what should i do then|phir kya karu|phir kya karein|to kya karu|ab kya karna chahiye|aur aage|then what)/i.test(lower)
  ) {
    return {
      intent: INTENTS.FOLLOW_UP,
      isFollowUp: true,
      lastTurnIntent: lastTurn?.intent,
      crop: lastTurn?.crop || mentionedCrop,
      confidence: 0.95,
    }
  }

  if (
    /(पानी कब दूं|paani kab doon|pani kab doon|pani doon|paani du|water when|when to water|pani du kya|paani doon kya)/i.test(lower) ||
    ((/^(pani|paani|पानी)\s*\??$/i.test(cleanTokens) || /^(kal|कल)\s*\??$/i.test(cleanTokens)) && lastTurn)
  ) {
    const crop = mentionedCrop || lastTurn?.crop || 'crop'
    const temporal = extractTemporal(raw)
    return {
      intent: INTENTS.IRRIGATION,
      isFollowUp: true,
      lastTurnIntent: lastTurn?.intent,
      crop,
      temporal,
      confidence: 0.92,
    }
  }

  // 9. Rain Timing query
  // e.g. "What time will it rain?", "barish kab hogi?", "kis time barish shuru hogi?", "when will it rain?"
  if (
    /(barish|baarish|rain|precipitation)/i.test(lower) &&
    /(what time|kab|kis time|kis samay|when|start|onset|timing|समय|कब)/i.test(lower) &&
    !/(how much|kitni|amount|mm)/i.test(lower)
  ) {
    return {
      intent: INTENTS.RAIN_TIMING,
      confidence: 0.96,
      temporal: extractTemporal(raw),
      crop: mentionedCrop,
    }
  }

  // 10. Rainfall Amount query
  // e.g. "How much rain is expected?", "kitni barish hogi?", "kitne mm barish?"
  if (
    /(barish|baarish|rain|precipitation)/i.test(lower) &&
    /(how much|kitni|kitna|amount|how many mm|kitne mm|quant|मात्रा|कितनी)/i.test(lower)
  ) {
    return {
      intent: INTENTS.RAINFALL_AMOUNT,
      confidence: 0.96,
      temporal: extractTemporal(raw),
      crop: mentionedCrop,
    }
  }

  // 11. Tomorrow's General Weather
  // e.g. "kal ka mausam kaisa rahega?", "tomorrow's weather", "what is the weather tomorrow"
  if (
    /(कल का मौसम|kal ka mausam|tomorrow's weather|weather tomorrow|kal kaisa mausam)/i.test(lower)
  ) {
    return {
      intent: INTENTS.WEATHER_TOMORROW,
      confidence: 0.95,
      temporal: 'tomorrow',
      crop: mentionedCrop,
    }
  }

  // 12. Irrigation query
  // e.g. "Should I irrigate today", "kya aaj sinchai karni chahiye", "paani lagana hai"
  if (
    /(sinchai|irrigation|irrigate|पानी लगा|पानी देना|सिंचाई|water the field|watering)/i.test(lower) ||
    (/(pani|paani|पानी)/i.test(lower) && /(doon|karein|chahiye|lagayein|dena|kare|karu|lagaye)/i.test(lower))
  ) {
    return {
      intent: INTENTS.IRRIGATION,
      confidence: 0.95,
      crop: mentionedCrop,
      temporal: extractTemporal(raw),
    }
  }

  // 13. Spray Window / Pesticide / Dawa query
  // e.g. "is spray window open", "dawa chhidkao", "pesticide spray", "dawa spray kab karein"
  if (
    /(spray|chhidkao|छिड़काव|dawa|कीटनाशक|pesticide|fungicide|herbicide|spray window)/i.test(lower)
  ) {
    return {
      intent: INTENTS.SPRAY_WINDOW,
      confidence: 0.95,
      crop: mentionedCrop,
      temporal: extractTemporal(raw),
    }
  }

  // 14. Crop Health & Disease
  // e.g. "leaves turning yellow", "peeli patti", "keet lag gaye", "patte sukh rahe hain"
  if (
    /(yellow|peeli|peele|पीले|पीली|patte|patti|leaves|foliage|keet|rog|disease|fungus|blight|sukh|fungal|infection|कीट|रोग|फफूंद)/i.test(lower)
  ) {
    return {
      intent: INTENTS.CROP_HEALTH,
      confidence: 0.94,
      crop: mentionedCrop,
      temporal: extractTemporal(raw),
    }
  }

  // 15. Farm Status / Daily Brief query
  // e.g. "mere farm ka kya haal hai", "farm report", "how is my farm today", "aaj ka haal"
  if (
    /(farm ka haal|khet ka haal|farm condition|farm report|haal kya hai|farm ka kya haal|khet ki sthiti|daily brief|status of my farm|khet kaisa hai)/i.test(lower)
  ) {
    return {
      intent: INTENTS.FARM_STATUS,
      confidence: 0.95,
      crop: mentionedCrop,
      temporal: 'today',
    }
  }

  // 15b. Farm Tasks query
  // e.g. "what should I do today?", "aaj kya karna chahiye", "what tasks do I have", "pending tasks", "kal kya karna hai"
  if (
    /(kya karna chahiye|kya karein|kya karu|what should i do|what to do|tasks|task|कार्य|काम क्या है|aaj kya karu|kal kya karu|pending task|ploughing|jutai|nindai|weeding)/i.test(lower)
  ) {
    return {
      intent: INTENTS.FARM_TASKS,
      confidence: 0.95,
      crop: mentionedCrop,
      temporal: extractTemporal(raw),
    }
  }

  // 15c. Farm Finance / Expenses query
  // e.g. "how much did I spend", "mera kitna kharcha hua", "expenses on wheat", "farm income"
  if (
    /(spend|spent|kharch|kharcha|खर्च|expense|expenses|cost|income|aamdani|kamai|कमाई|profit|revenue|kitna laga)/i.test(lower)
  ) {
    return {
      intent: INTENTS.FARM_FINANCE,
      confidence: 0.95,
      crop: mentionedCrop,
      temporal: extractTemporal(raw),
    }
  }

  // 15d. Multi-Field / Parcel query
  // e.g. "which field needs attention", "north field", "khet ke plot", "parcels"
  if (
    /(which field|field condition|plot ka haal|kaunsa khet|kaunsa plot|north field|south field|plot 1|plot 2|plots|fields|parcels)/i.test(lower)
  ) {
    return {
      intent: INTENTS.FARM_FIELDS,
      confidence: 0.95,
      crop: mentionedCrop,
      temporal: extractTemporal(raw),
    }
  }

  // 15e. Livestock / Animal query
  // e.g. "how are my cows", "gaay bhains ka haal", "livestock health", "pashudhan"
  if (
    /(livestock|pashu|animal|animals|cow|cows|buffalo|buffaloes|goat|goats|gaay|bhains|bakri|पशु|गाय|भैंस|बकरी|चारा|fodder)/i.test(lower)
  ) {
    return {
      intent: INTENTS.LIVESTOCK,
      confidence: 0.95,
      temporal: extractTemporal(raw),
    }
  }

  // 16. General Rain Forecast query
  // e.g. "will it rain tomorrow", "kal barish hogi kya", "rain expected"
  if (
    /(rain|barish|baarish|precipitation|बारिश|बरसात|bochhar|showers|raining)/i.test(lower)
  ) {
    return {
      intent: INTENTS.RAIN_FORECAST,
      confidence: 0.95,
      temporal: extractTemporal(raw),
      crop: mentionedCrop,
    }
  }

  // 17. Current Weather / Temperature query
  // e.g. "what is the temperature right now", "abhi kitna taapmaan hai", "abhi ka mausam"
  if (
    /(temperature|taapman|tapman|तापमान|garmi|sardi|how hot|current weather|abhi ka mausam|outside right now)/i.test(lower)
  ) {
    return {
      intent: /(temperature|taapman|tapman|तापमान)/i.test(lower)
        ? INTENTS.TEMPERATURE
        : INTENTS.WEATHER_CURRENT,
      confidence: 0.93,
      temporal: extractTemporal(raw),
    }
  }

  // 18. Government Warning / Alert query
  // e.g. "koi alert hai kya", "chetawani", "red alert"
  if (/(alert|warning|chetawani|चेतावनी|red alert|orange alert)/i.test(lower)) {
    return {
      intent: INTENTS.ALERT,
      confidence: 0.95,
      temporal: extractTemporal(raw),
    }
  }

  // 19. General Crop Information / Sowing Time
  // e.g. "gehun kab boe", "wheat sowing time", "mustard variety"
  if (
    /(kab boe|kab boyen|sowing time|best time to sow|variety|kissam|उन्नत किस्म|किस्म|बीज|fertilizer|khad|urea|dap)/i.test(lower)
  ) {
    return {
      intent: INTENTS.GENERAL_AGRICULTURE,
      confidence: 0.9,
      crop: mentionedCrop,
      temporal: extractTemporal(raw),
    }
  }

  // 20. Unrelated / Non-Agricultural Query fallback
  // e.g. "who won the match", "write python code", "capital of france"
  if (
    /(cricket|match|movie|song|python|code|actor|politics|election|capital of|president|prime minister)/i.test(lower) &&
    !/(farm|khet|weather|mausam|crop|fasal)/i.test(lower)
  ) {
    return {
      intent: INTENTS.UNRELATED,
      subCategory: 'off_topic',
      confidence: 0.88,
      crop: null,
      temporal: null,
    }
  }

  return {
    intent: INTENTS.GENERAL_AGRICULTURE,
    confidence: 0.7,
    crop: mentionedCrop,
    temporal: extractTemporal(raw),
  }
}

export default { INTENTS, classifyIntent, extractCrop, extractTemporal }
