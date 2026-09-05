import { z } from 'zod'
import { Farm } from '../models/Farm.js'
import { Field } from '../models/Field.js'
import { FarmTask } from '../models/FarmTask.js'
import { FarmFinance } from '../models/FarmFinance.js'
import { Livestock } from '../models/Livestock.js'
import { Conversation } from '../models/Conversation.js'
import { AIInference } from '../models/AIInference.js'
import { log } from '../utils/logger.js'
import { answerQuestion } from '../services/chatPipeline.js'
import { buildBrief } from '../services/agriculture/brief.js'
import * as gemini from '../services/gemini/agent.js'
import { isConfigured as geminiConfigured } from '../services/gemini/agent.js'
import { classifyIntent, INTENTS } from '../services/ai/intentClassifier.js'

// In-memory conversation store to preserve turn context (for follow-ups and unauthenticated sessions)
const conversationStore = new Map()
const MAX_CONVERSATIONS = 1000
const MAX_TURNS = 10

function getHistory(convId) {
  if (!convId) return []
  return conversationStore.get(convId) || []
}

function saveTurn(convId, turn) {
  if (!convId) return
  const turns = conversationStore.get(convId) || []
  turns.push({ ...turn, at: new Date() })
  if (turns.length > MAX_TURNS) turns.shift()
  if (conversationStore.size > MAX_CONVERSATIONS) {
    const firstKey = conversationStore.keys().next().value
    conversationStore.delete(firstKey)
  }
  conversationStore.set(convId, turns)
}

export const chatSchema = z.object({
  message: z.string().trim().min(1, 'Message cannot be empty').max(2000),
  farmId: z.string().max(64).nullable().optional(),
  conversationId: z.string().max(64).nullable().optional(),
  lang: z.enum(['en', 'hi', 'hinglish']).optional().default('en'),
  audience: z
    .enum(['general', 'everyone', 'farm', 'farmer'])
    .optional()
    .transform((v) => (v === 'farm' || v === 'farmer' ? 'farm' : 'general')),
  persona: z.string().max(40).nullable().optional(),
  lat: z.coerce.number().min(-90).max(90).nullable().optional(),
  lon: z.coerce.number().min(-180).max(180).nullable().optional(),
  name: z.string().max(120).nullable().optional(),
  district: z.string().max(120).nullable().optional(),
  state: z.string().max(120).nullable().optional(),
  q: z.string().max(120).nullable().optional(),
})

export async function chat(req, res) {
  const started = Date.now()
  const {
    message,
    farmId,
    conversationId,
    lang = 'en',
    audience = 'general',
    persona: requestedPersona,
    lat,
    lon,
    name,
    district,
    state,
    q,
  } = req.body
  const activeConvId = conversationId || `c_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const storeConvId = req.user?.id ? `${req.user.id}:${activeConvId}` : `anon:${activeConvId}`

  let farm = null
  if (req.user) {
    if (farmId && /^[0-9a-fA-F]{24}$/.test(farmId)) {
      farm = await Farm.findOne({ _id: farmId, userId: req.user.id })
    } else {
      farm = await Farm.findOne({ userId: req.user.id }).sort({ updatedAt: -1 })
    }
  }

  // Load prior conversation turns for follow-up resolution
  let history = getHistory(storeConvId)
  if (req.user && activeConvId && /^[0-9a-fA-F]{24}$/.test(activeConvId) && history.length === 0) {
    try {
      const dbConv = await Conversation.findOne({ _id: activeConvId, userId: req.user.id })
      if (dbConv?.turns) {
        history = dbConv.turns.map((t) => ({
          text: t.text,
          intent: t.intent,
          location: t.location,
          summary: t.summary,
        }))
      }
    } catch {}
  }

  // Step 1: Classify intent and extract entities
  const intentInfo = classifyIntent(message, history)
  const userLang = lang || 'en'
  const isFarm = audience === 'farm' || requestedPersona === 'farmer'
  const assistantName = isFarm ? 'Krishivaani' : 'Akashvaani'
  const locName = name || district || farm?.district || 'Gurgaon'

  log.info('Assistant query processing', {
    message,
    intent: intentInfo.intent,
    crop: intentInfo.crop,
    temporal: intentInfo.temporal,
    audience: isFarm ? 'farm' : 'general',
    isFollowUp: intentInfo.isFollowUp,
  })

  // -------------------------------------------------------------
  // HANDLER A: Pure Greeting (e.g. "hello", "hi", "namaste")
  // -------------------------------------------------------------
  if (intentInfo.intent === INTENTS.GREETING) {
    const defaultGreeting = isFarm
      ? userLang === 'hi'
        ? `नमस्ते! 👋 मैं कृष्णावाणी (Aakrishi AI) हूँ। आप अपनी फसल, मौसम, सिंचाई, खाद या खेत से जुड़ी किसी भी समस्या के बारे में पूछ सकते हैं। बताइए आज मैं आपकी क्या मदद करूँ?`
        : userLang === 'hinglish'
          ? `Namaste! 👋 Main Krishivaani (Aakrishi AI) hoon. Aap apni fasal, mausam, sinchai ya farm ke sawalon ke baare mein pooch sakte hain. Boliye, aaj kya madad karun?`
          : `Hello! 👋 I am Krishivaani, your agricultural advisor. You can ask me about your crops, weather forecast, irrigation, or farm conditions. How can I help you today?`
      : userLang === 'hi'
        ? `नमस्ते! 👋 मैं आकाशवाणी (Aakrishi Weather AI) हूँ। मैं आपको लाइव मौसम, बारिश के पूर्वानुमान और बाहरी सुरक्षा से जुड़ी ताज़ा जानकारी दे सकता हूँ। बताइए आज मैं आपकी क्या मदद करूँ?`
        : userLang === 'hinglish'
          ? `Namaste! 👋 Main Akashvaani (Aakrishi Weather AI) hoon. Main aapko live mausam, barish forecast aur outdoor safety updates de sakta hoon. Boliye, aaj kya janna chahte hain?`
          : `Hello! 👋 I am Akashvaani, your personal weather advisor. I can help you with live weather updates, rain forecasts, temperature outlooks, and travel safety. What would you like to know today?`

    const draftAnswer = {
      summary: defaultGreeting,
      speech: defaultGreeting,
      gloss: userLang === 'en' ? null : defaultGreeting,
      sources: [],
      language: userLang,
      recommendedActions: [],
      composer: 'deterministic',
    }

    const { answer: worded, composer, rejected } = await gemini.explain(
      draftAnswer,
      {
        question: message,
        intent: INTENTS.GREETING,
        audience: isFarm ? 'farm' : 'general',
        location: { name: locName, district: district || farm?.district },
      },
      { lang: userLang },
    )

    saveTurn(storeConvId, {
      text: message,
      intent: INTENTS.GREETING,
      summary: worded?.summary,
    })

    return res.json({
      conversationId: activeConvId,
      intent: INTENTS.GREETING,
      nlu: { intent: 'greeting', language: userLang },
      location: { name: locName, district: district || farm?.district },
      answer: {
        ...worded,
        speech: worded?.speech || worded?.summary,
        recommendedActions: [],
        riskBand: null,
      },
      risk: null,
      highestWarning: null,
      warnings: [],
      sources: [],
      composer,
      llmRejected: rejected,
      geminiConfigured: geminiConfigured(),
    })
  }

  // -------------------------------------------------------------
  // HANDLER B: General Conversation (e.g. "how are you?", "who are you?")
  // -------------------------------------------------------------
  if (intentInfo.intent === INTENTS.GENERAL_CONVERSATION) {
    const defaultChat = isFarm
      ? userLang === 'hi'
        ? `मैं बिल्कुल ठीक हूँ, धन्यवाद! मैं कृष्णावाणी हूँ — आपके खेत, मौसम और फसलों की देखभाल के लिए हमेशा तत्पर। आज आपके गाँव या खेत में मौसम कैसा है?`
        : userLang === 'hinglish'
          ? `Main badhiya hoon, thank you! Main Krishivaani hoon — aapke farm aur mausam ki sahayata ke liye tayar. Aaj aapke farm ke baare mein kya janna chahte hain?`
          : `I am doing great, thank you! I am Krishivaani, your AI agricultural and weather advisor. How can I assist with your farm or crops today?`
      : userLang === 'hi'
        ? `मैं बहुत अच्छा हूँ, पूछने के लिए धन्यवाद! मैं आकाशवाणी हूँ। आप मुझसे आज या कल के मौसम, तापमान, बारिश या यात्रा सुरक्षा के बारे में कुछ भी पूछ सकते हैं।`
        : userLang === 'hinglish'
          ? `Main bilkul theek hoon, thank you! Main Akashvaani hoon. Aap mujhse aaj ya kal ke mausam, barish ya travel safety ke baare mein pooch sakte hain.`
          : `I am doing very well, thank you for asking! I am Akashvaani, your AI weather assistant. What can I check for you today?`

    const draftAnswer = {
      summary: defaultChat,
      speech: defaultChat,
      gloss: userLang === 'en' ? null : defaultChat,
      sources: [],
      language: userLang,
      recommendedActions: [],
      composer: 'deterministic',
    }

    const { answer: worded, composer, rejected } = await gemini.explain(
      draftAnswer,
      {
        question: message,
        intent: INTENTS.GENERAL_CONVERSATION,
        audience: isFarm ? 'farm' : 'general',
        location: { name: locName, district: district || farm?.district },
      },
      { lang: userLang },
    )

    saveTurn(storeConvId, {
      text: message,
      intent: INTENTS.GENERAL_CONVERSATION,
      summary: worded?.summary,
    })

    return res.json({
      conversationId: activeConvId,
      intent: INTENTS.GENERAL_CONVERSATION,
      nlu: { intent: 'general_conversation', language: userLang },
      location: { name: locName, district: district || farm?.district },
      answer: {
        ...worded,
        speech: worded?.speech || worded?.summary,
        recommendedActions: [],
        riskBand: null,
      },
      risk: null,
      highestWarning: null,
      warnings: [],
      sources: [],
      composer,
      llmRejected: rejected,
      geminiConfigured: geminiConfigured(),
    })
  }

  // -------------------------------------------------------------
  // HANDLER C: Inappropriate / Off-Topic (e.g. vulgar, non-agri)
  // -------------------------------------------------------------
  if (intentInfo.intent === INTENTS.UNRELATED) {
    const defaultReply =
      userLang === 'hi'
        ? `मैं ${assistantName} हूँ — मैं केवल मौसम, वर्षा, यात्रा सुरक्षा और कृषि मार्गदर्शन में सहायता कर सकती हूँ। कृपया मौसम या खेती से संबंधित प्रश्न पूछें।`
        : userLang === 'hinglish'
          ? `Main ${assistantName} hoon — main sirf mausam, barish, travel safety aur agriculture guidance mein help kar sakti hoon. Kripya weather ya farming se related sawal puchein.`
          : `I am ${assistantName}, your weather and agricultural assistant. I can only assist with weather forecasts, rainfall, travel safety, and farm guidance. Please ask a weather- or farm-related question.`

    const draftAnswer = {
      summary: defaultReply,
      speech: defaultReply,
      gloss: userLang === 'en' ? null : defaultReply,
      sources: ['Aakrishi Domain Safety Policy'],
      language: userLang,
      recommendedActions: [],
      composer: 'deterministic',
    }

    const { answer: worded, composer, rejected } = await gemini.explain(
      draftAnswer,
      {
        question: message,
        intent: INTENTS.UNRELATED,
        audience: isFarm ? 'farm' : 'general',
      },
      { lang: userLang },
    )

    saveTurn(storeConvId, {
      text: message,
      intent: INTENTS.UNRELATED,
      summary: worded?.summary,
    })

    return res.json({
      conversationId: activeConvId,
      intent: INTENTS.UNRELATED,
      nlu: { intent: 'unrelated', language: userLang },
      answer: {
        ...worded,
        speech: worded?.speech || worded?.summary,
        recommendedActions: [],
        riskBand: null,
      },
      risk: null,
      highestWarning: null,
      warnings: [],
      sources: [],
      composer,
      llmRejected: rejected,
      geminiConfigured: geminiConfigured(),
    })
  }

  // -------------------------------------------------------------
  // HANDLER D: Rain Gear Comparison (e.g. "Raincoat better hai ya umbrella?")
  // -------------------------------------------------------------
  if (intentInfo.intent === INTENTS.RAIN_GEAR) {
    const base = await answerQuestion({
      text: message,
      lang: userLang,
      conversationId: activeConvId,
      lat,
      lon,
      name,
      district,
      state,
      q: q || farm?.district || undefined,
      userId: req.user?.id,
    })

    const windKmh = base.current?.windKmh ?? base.forecast?.wind_kmh ?? 12
    const rainMm = base.forecast?.rain_mm ?? 5
    const isWindy = windKmh >= 15

    const gearAdvice =
      userLang === 'hi'
        ? isWindy
          ? `आज के मौसम के अनुसार रेनकोट (Raincoat) बेहतर विकल्प है। हवा की गति लगभग ${Math.round(windKmh)} किमी/घंटा और झोंके तेज़ रहने की संभावना है, जिससे तेज़ हवा में छाता पलटने या टूटने का डर रहता है। रेनकोट आपको पूरी तरह सूखा रखेगा और दोनों हाथ खाली रहेंगे।`
          : `हल्की बारिश और सामान्य हवा (${Math.round(windKmh)} किमी/घंटा) में छाता (Umbrella) काफी सुविधाजनक रहेगा। यदि आप कम समय के लिए बाहर जा रहे हैं तो छाता अच्छा है, परंतु लंबे समय या बाइक चलाने के लिए रेनकोट चुनें।`
        : userLang === 'hinglish'
          ? isWindy
            ? `Aaj ke mausam ke hisaab se Raincoat better rahega. Hawa ki speed lagbhag ${Math.round(windKmh)} km/h hai aur tez jhonke expected hain, jismein umbrella sambhalna mushkil hota hai. Raincoat aapko hands-free protection dega.`
            : `Halki showers aur normal wind (${Math.round(windKmh)} km/h) mein Umbrella zyada convenient hai. Agar lambe time tak bahar rehna ho ya two-wheeler chalana ho to Raincoat best hai.`
          : isWindy
            ? `A raincoat is the better choice in today's weather. With wind speeds around ${Math.round(windKmh)} km/h and gusty conditions, umbrellas tend to invert and become difficult to manage. A raincoat provides full coverage and keeps your hands free.`
            : `An umbrella is convenient for light showers with moderate wind (${Math.round(windKmh)} km/h). However, if you are commuting on a two-wheeler or outdoors for an extended period, a raincoat is more protective.`

    const draftAnswer = {
      summary: gearAdvice,
      speech: gearAdvice,
      gloss: userLang === 'en' ? null : gearAdvice,
      language: userLang,
      recommendedActions: [
        userLang === 'hi' ? 'हवा की तीव्रता को देखते हुए वाटरप्रूफ फुटवियर पहनें' : 'Wear waterproof footwear if heading out into wet areas',
      ],
      sources: ['Open-Meteo Wind & Rain Dynamics'],
      composer: 'deterministic',
    }

    const { answer: worded, composer, rejected } = await gemini.explain(
      draftAnswer,
      {
        question: message,
        intent: INTENTS.RAIN_GEAR,
        location: base.location,
        current: base.current,
        forecast: base.forecast,
      },
      { lang: userLang },
    )

    saveTurn(storeConvId, {
      text: message,
      intent: INTENTS.RAIN_GEAR,
      summary: worded?.summary,
    })

    return res.json({
      ...base,
      conversationId: activeConvId,
      intent: INTENTS.RAIN_GEAR,
      answer: {
        ...worded,
        speech: worded?.speech || worded?.summary,
        riskBand: null,
      },
      risk: null,
      highestWarning: null,
      warnings: [],
      composer,
      llmRejected: rejected,
      geminiConfigured: geminiConfigured(),
    })
  }

  // -------------------------------------------------------------
  // HANDLER E: Crop Sowing Farm Memory Event (e.g. "मैंने आज खेत में गेहूं बोए हैं।")
  // -------------------------------------------------------------
  if (intentInfo.intent === INTENTS.CROP_SOWING) {
    const cropName = intentInfo.crop || 'wheat'
    const cropDisplay = cropName.charAt(0).toUpperCase() + cropName.slice(1)

    if (farm) {
      try {
        if (!farm.crops) farm.crops = []
        const existing = farm.crops.find((c) => c.name.toLowerCase() === cropName.toLowerCase())
        if (existing) {
          existing.sownAt = new Date()
          existing.stageOverride = 'sowing'
        } else {
          farm.crops.push({ name: cropDisplay, sownAt: new Date(), stageOverride: 'sowing' })
        }
        await farm.save()
        log.info('Farm memory updated with sowing event', { farmId: farm._id, crop: cropDisplay })
      } catch (err) {
        log.warn('Could not persist sowing to farm model', { error: err.message })
      }
    }

    const base = await answerQuestion({
      text: message,
      lang: userLang,
      conversationId: activeConvId,
      lat,
      lon,
      name,
      district,
      state,
      q: q || farm?.district || undefined,
      userId: req.user?.id,
    })

    const sowingAdvice =
      userLang === 'hi'
        ? `आपने बताया कि आज ${cropDisplay} (गेहूं) की बुवाई की गई है — इसे आपके फार्म रिकॉर्ड में संज्ञान में ले लिया गया है। बुवाई के बाद सबसे महत्वपूर्ण बात यह है कि बीज की गहराई पर हल्की नमी बनी रहे परंतु खेत में कहीं भी पानी का ठहराव (waterlogging) न हो। सामान्य तापमान में 5 से 7 दिनों में अंकुरण (germination) शुरू हो जाता है। आगामी दिनों के मौसम को देखते हुए सिंचाई तभी करें जब ऊपरी 2 इंच मिट्टी सूखने लगे।`
        : userLang === 'hinglish'
          ? `Aapne bataya ki aaj ${cropDisplay} ki buwai ki gayi hai — yeh aapke farm context mein note kar liya gaya hai. Sowing ke baad sabse zaroori hai ki seedbed mein adequate moisture rahe aur pani jama na ho. Normal temp par 5-7 dino mein germination shuru ho jata hai. Forecast ke mutabik agle kuch din moisture monitor karein.`
          : `Noted: You have sown ${cropDisplay} today — this has been recorded in your farm context. For newly sown seeds, maintaining optimum seedbed moisture is critical while preventing waterlogging or surface crusting. Germination typically begins in 5 to 7 days. We will monitor conditions and guide your upcoming irrigation.`

    const draftAnswer = {
      summary: sowingAdvice,
      speech: sowingAdvice,
      gloss: userLang === 'en' ? null : sowingAdvice,
      language: userLang,
      recommendedActions: [
        userLang === 'hi' ? 'खेत में उचित जल निकासी (drainage) सुनिश्चित करें ताकि पानी जमा न हो' : 'Ensure proper furrow drainage so water does not pool on seedbed',
        userLang === 'hi' ? 'अगले 5-7 दिनों तक अंकुरण (germination) की निगरानी करें' : 'Monitor seedbed for emergence over the next 5-7 days',
      ],
      sources: ['Farm Memory Engine', 'ICAR Crop Agronomy Guidelines'],
      composer: 'deterministic',
    }

    const { answer: worded, composer, rejected } = await gemini.explain(
      draftAnswer,
      {
        question: message,
        intent: INTENTS.CROP_SOWING,
        entities: intentInfo,
        crop: cropDisplay,
        location: base.location,
        forecast: base.forecast,
        current: base.current,
        userObservation: true,
      },
      { lang: userLang },
    )

    saveTurn(storeConvId, {
      text: message,
      intent: INTENTS.CROP_SOWING,
      crop: cropName,
      activity: 'sowing',
      summary: worded?.summary,
    })

    return res.json({
      ...base,
      conversationId: activeConvId,
      intent: INTENTS.CROP_SOWING,
      answer: {
        ...worded,
        speech: worded?.speech || worded?.summary,
        riskBand: null,
      },
      risk: null,
      highestWarning: null,
      composer,
      llmRejected: rejected,
      geminiConfigured: geminiConfigured(),
    })
  }

  // -------------------------------------------------------------
  // HANDLER F: Contextual Follow-Up ("Then what should I do?")
  // -------------------------------------------------------------
  if (intentInfo.intent === INTENTS.FOLLOW_UP) {
    const lastTurn = history.length > 0 ? history[history.length - 1] : null
    const base = await answerQuestion({
      text: message,
      lang: userLang,
      conversationId: activeConvId,
      lat,
      lon,
      name,
      district,
      state,
      q: q || farm?.district || undefined,
      userId: req.user?.id,
    })

    const followUpAdvice =
      userLang === 'hi'
        ? `पिछले संदर्भ को देखते हुए, आपके लिए मुख्य कदम यह हैं: 1. खेत में जल निकासी व्यवस्था की जाँच करें ताकि अतिरिक्त पानी निकल सके। 2. जब तक मिट्टी में पर्याप्त नमी है, सिंचाई टालें और मौसम साफ होने पर ही अगला कदम उठाएं।`
        : userLang === 'hinglish'
          ? `Pichhle sandarbh ke mutabik aapke key steps: 1. Field drainage channels check karein taaki excess water nikal sake. 2. Jab tak soil mein adequate moisture hai, sinchai hold karein aur mausam clear hone ka wait karein.`
          : `Based on our previous discussion, here are your key next steps: 1. Inspect field drainage to prevent standing water accumulation. 2. Hold off on additional irrigation while soil moisture remains high, and re-evaluate once weather clears.`

    const draftAnswer = {
      summary: followUpAdvice,
      speech: followUpAdvice,
      gloss: userLang === 'en' ? null : followUpAdvice,
      language: userLang,
      recommendedActions: [
        userLang === 'hi' ? 'खेत की जल निकासी नालियों को साफ़ रखें' : 'Keep field drainage furrows clean and clear',
        userLang === 'hi' ? 'मौसम सामान्य होने तक निगरानी बनाए रखें' : 'Monitor conditions until the weather normalizes',
      ],
      sources: ['Aakrishi Conversational Context Engine'],
      composer: 'deterministic',
    }

    const { answer: worded, composer, rejected } = await gemini.explain(
      draftAnswer,
      {
        question: message,
        intent: INTENTS.FOLLOW_UP,
        lastTurn,
        location: base.location,
        forecast: base.forecast,
      },
      { lang: userLang },
    )

    saveTurn(storeConvId, {
      text: message,
      intent: INTENTS.FOLLOW_UP,
      summary: worded?.summary,
    })

    return res.json({
      ...base,
      conversationId: activeConvId,
      intent: INTENTS.FOLLOW_UP,
      answer: {
        ...worded,
        speech: worded?.speech || worded?.summary,
      },
      composer,
      llmRejected: rejected,
      geminiConfigured: geminiConfigured(),
    })
  }

  // -------------------------------------------------------------
  // HANDLER G: Targeted Weather & Agriculture Queries
  // -------------------------------------------------------------
  // Check if this is a follow-up irrigation question to a recent sowing
  const isFollowUpToSowing =
    (intentInfo.intent === INTENTS.IRRIGATION || intentInfo.isFollowUp) &&
    history.some((h) => h.intent === INTENTS.CROP_SOWING || h.activity === 'sowing')
  const activeCrop = intentInfo.crop || (isFollowUpToSowing ? 'wheat' : farm?.crops?.[0]?.name || 'crop')

  // Step 2: Fetch deterministic base answer
  const base = await answerQuestion({
    text: message,
    lang: userLang,
    conversationId: activeConvId,
    lat,
    lon,
    name,
    district,
    state,
    q: q || farm?.district || undefined,
    userId: req.user?.id,
  })

  // Step 3: Fetch agricultural brief ONLY when relevant to the intent
  let agriculture = null
  const needsAgriBrief = [
    INTENTS.FARM_STATUS,
    INTENTS.IRRIGATION,
    INTENTS.SPRAY_WINDOW,
    INTENTS.CROP_HEALTH,
    INTENTS.WEATHER_IMPACT_ON_CROP,
  ].includes(intentInfo.intent)

  if (needsAgriBrief && base.location?.lat != null) {
    try {
      const b = await buildBrief({
        location: base.location,
        farm: farm ? farm.toObject() : {},
      })
      agriculture = b.agriculture
    } catch (err) {
      log.warn('farm context unavailable', { error: String(err?.message || err) })
    }
  }

  const answer = { ...base.answer }
  if (agriculture?.irrigation) {
    answer.irrigation = agriculture.irrigation.recommendation
    answer.irrigationReason = agriculture.irrigation.reason
  }

  // Step 3b: Fetch Farm Management context (fields, tasks, finances, livestock) if relevant
  let farmManagement = null
  const needsFarmManagement = [
    INTENTS.FARM_STATUS,
    INTENTS.FARM_TASKS,
    INTENTS.FARM_FINANCE,
    INTENTS.FARM_FIELDS,
    INTENTS.LIVESTOCK,
  ].includes(intentInfo.intent)

  if (needsFarmManagement) {
    try {
      const farmTargetId = farm?._id || farmId || 'f_default'
      const [flds, tsks, fins, lvs] = await Promise.all([
        Field.find({ $or: [{ farmId: farmTargetId }, { userId: req.user?.id }] }).limit(10).lean(),
        FarmTask.find({ $or: [{ farmId: farmTargetId }, { userId: req.user?.id }], status: { $ne: 'completed' } }).sort({ dueDate: 1 }).limit(8).lean(),
        FarmFinance.find({ $or: [{ farmId: farmTargetId }, { userId: req.user?.id }] }).sort({ date: -1 }).limit(10).lean(),
        Livestock.find({ $or: [{ farmId: farmTargetId }, { userId: req.user?.id }] }).limit(10).lean(),
      ])

      const totalExpenses = fins.filter((f) => f.type === 'expense').reduce((sum, f) => sum + (f.amount || 0), 0)
      const recordedIncome = fins.filter((f) => f.type === 'income').reduce((sum, f) => sum + (f.amount || 0), 0)

      farmManagement = {
        fields: flds.length ? flds : undefined,
        tasks: tsks.length ? tsks : undefined,
        finances: fins.length ? { totalExpenses, recordedIncome, recentExpenses: fins.slice(0, 5) } : undefined,
        livestock: lvs.length ? lvs : undefined,
      }
    } catch (e) {
      log.warn('Could not load farmManagement models for prompt', { error: e.message })
    }
  }

  // Pre-seed grounded answer draft for farm management queries
  if (intentInfo.intent === INTENTS.FARM_FINANCE) {
    const exp = farmManagement?.finances?.totalExpenses || 0
    const inc = farmManagement?.finances?.recordedIncome || 0
    answer.summary = `Based on your recorded farm entries, total input expenses stand at ₹${exp}, and recorded income is ₹${inc}.`
    answer.speech = answer.summary
    answer.recommendedActions = ['Review input cost breakdown in your Farm Finance Insights tab.']
  } else if (intentInfo.intent === INTENTS.FARM_TASKS) {
    const taskCount = farmManagement?.tasks?.length || 0
    const topTask = farmManagement?.tasks?.[0]?.title || 'Routine field check'
    answer.summary = `You have ${taskCount} active farm task(s) scheduled. Primary priority: ${topTask}.`
    answer.speech = answer.summary
  } else if (intentInfo.intent === INTENTS.FARM_FIELDS) {
    const fCount = farmManagement?.fields?.length || 0
    answer.summary = `You have ${fCount} registered field parcel(s) in your farm profile.`
    answer.speech = answer.summary
  } else if (intentInfo.intent === INTENTS.LIVESTOCK) {
    const lCount = farmManagement?.livestock?.length || 0
    answer.summary = `You have ${lCount} livestock group(s) registered on your farm.`
    answer.speech = answer.summary
  }

  // Selective output decisions based on intent
  const isTravelOrAlert = [INTENTS.TRAVEL_SAFETY, INTENTS.ALERT].includes(intentInfo.intent)
  const isSpecificWeather = [
    INTENTS.TEMPERATURE,
    INTENTS.RAIN_TIMING,
    INTENTS.RAINFALL_AMOUNT,
    INTENTS.WEATHER_CURRENT,
  ].includes(intentInfo.intent)

  // Step 4: Gemini prose explanation with intent-specific grounding
  const { answer: worded, composer, rejected } = await gemini.explain(
    answer,
    {
      question: message,
      intent: intentInfo.intent,
      entities: intentInfo,
      crop: activeCrop,
      audience: isFarm ? 'farm' : 'general',
      isNewlySown: isFollowUpToSowing,
      location: base.location,
      forecast: base.forecast,
      current: base.current,
      weather: base.weather ?? agriculture?.weather ?? base.current,
      agriculture: needsAgriBrief ? agriculture : null,
      farmManagement,
      risk: isTravelOrAlert || needsAgriBrief ? base.risk : null,
      confidence: isTravelOrAlert || needsAgriBrief ? base.confidence : null,
      warnings: isTravelOrAlert || needsAgriBrief ? base.warnings : [],
    },
    { lang: userLang },
  )

  saveTurn(storeConvId, {
    text: message,
    intent: intentInfo.intent,
    crop: activeCrop,
    summary: worded?.summary,
  })

  if (req.user) {
    AIInference.create({
      model: composer === 'gemini' ? 'gemini' : 'deterministic',
      task: 'chat',
      inputType: 'text',
      ok: true,
      prediction: composer,
      latencyMs: Date.now() - started,
      farmId: farm?._id ?? undefined,
      fusedBand: agriculture?.farm_risk?.overall || undefined,
    }).catch(() => {})
  }

  // Strip extraneous risk badges and action lists for simple queries
  const finalAnswer = {
    ...worded,
    speech: worded?.speech || worded?.summary,
    riskBand: isSpecificWeather ? null : worded?.riskBand,
    recommendedActions: isSpecificWeather ? [] : worded?.recommendedActions || [],
  }

  return res.json({
    ...base,
    conversationId: activeConvId,
    intent: intentInfo.intent,
    answer: finalAnswer,
    agriculture,
    risk: isSpecificWeather ? null : base.risk,
    highestWarning: isSpecificWeather ? null : base.highestWarning,
    warnings: isSpecificWeather ? [] : base.warnings,
    composer,
    llmRejected: rejected,
    geminiConfigured: geminiConfigured(),
  })
}

export default { chat, chatSchema }
