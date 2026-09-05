/**
 * What Gemini is allowed to see, and what it is allowed to change.
 *
 * Grounded rewriting layer: Gemini explains facts naturally without fabricating
 * numbers or forcing unrelated farm/weather advisories onto simple questions.
 */

export const PROSE_FIELDS = [
  'summary',
  'gloss',
  'speech',
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
  const intent = context.intent || 'GENERAL_AGRICULTURE'
  const question = context.question || answer.question || ''
  const entities = context.entities || {}
  const isFarm = context.audience === 'farm' || context.persona === 'farmer'
  const assistantName = isFarm ? 'Krishivaani (Aakrishi Farm AI)' : 'Akashvaani (Aakrishi Weather AI)'

  // Filter context facts strictly according to intent so Gemini does not hallucinate or dump unrelated data
  let queryFacts = {}
  if (intent === 'GREETING' || intent === 'GENERAL_CONVERSATION' || intent === 'UNRELATED') {
    queryFacts = {
      location: context.location?.name || null,
      district: context.location?.district || null,
    }
  } else if (intent === 'RAIN_GEAR') {
    queryFacts = {
      location: context.location?.name || null,
      condition: context.current?.condition ?? context.weather?.condition,
      wind_kmh: context.current?.windKmh ?? context.weather?.wind_kmh,
      gust_kmh: context.current?.gustKmh ?? context.weather?.gust_kmh,
      rain_expected_mm: context.forecast?.rain_mm ?? context.weather?.rain_24h_mm,
      rain_probability: context.forecast?.prob ?? context.current?.rainProb,
    }
  } else if (intent === 'TRAVEL_SAFETY') {
    queryFacts = {
      location: context.location?.name || null,
      rain_expected_mm: context.forecast?.rain_mm ?? context.weather?.rain_24h_mm,
      wind_kmh: context.current?.windKmh ?? context.weather?.wind_kmh,
      condition: context.current?.condition ?? context.weather?.condition,
      warnings: context.warnings || [],
    }
  } else if (intent === 'WEATHER_CURRENT' || intent === 'TEMPERATURE') {
    queryFacts = {
      location: context.location,
      current: context.current || context.weather,
      temperature: context.current?.tempC ?? context.weather?.temp_c,
      condition: context.current?.condition ?? context.weather?.condition,
      humidity: context.current?.humidity ?? context.weather?.humidity,
      wind_kmh: context.current?.windKmh ?? context.weather?.wind_kmh,
    }
  } else if (intent === 'RAIN_FORECAST' || intent === 'RAIN_TIMING' || intent === 'RAINFALL_AMOUNT' || intent === 'WEATHER_TOMORROW') {
    queryFacts = {
      location: context.location,
      forecast: context.forecast,
      peak_rain_timing: context.forecast?.peak || null,
      rain_mm: context.forecast?.rain_mm,
      probability: context.forecast?.prob,
      warnings: context.warnings,
    }
  } else if (intent === 'WEATHER_IMPACT_ON_CROP') {
    queryFacts = {
      location: context.location,
      crop: entities.crop || context.crop || 'wheat',
      rain_forecast_mm: context.forecast?.rain_mm ?? context.weather?.rain_24h_mm,
      temperature_max: context.forecast?.tmax ?? context.weather?.temp_max_c,
      antecedent_rain_72h: context.weather?.rain_72h_mm,
    }
  } else if (intent === 'CROP_SOWING') {
    queryFacts = {
      location: context.location,
      sowingEvent: {
        crop: entities.crop || context.crop || 'wheat',
        date: entities.temporal || 'today',
        userObservation: true,
      },
      forecast: context.forecast,
      current: context.current || context.weather,
    }
  } else if (intent === 'IRRIGATION') {
    queryFacts = {
      location: context.location,
      crop: entities.crop || context.agriculture?.crop?.name || 'wheat',
      sown_at: context.agriculture?.crop?.sown_at || entities.sown_at || null,
      isNewlySown: Boolean(context.isNewlySown || entities.activity === 'sowing'),
      irrigationRecommendation: answer.irrigation || context.agriculture?.irrigation?.recommendation,
      irrigationReason: answer.irrigationReason || context.agriculture?.irrigation?.reason,
      forecast: context.forecast,
      antecedentRain72h: context.weather?.rain_72h_mm,
    }
  } else if (intent === 'FARM_TASKS') {
    queryFacts = {
      location: context.location,
      tasks: context.farmManagement?.tasks || [
        { title: 'Check field drainage', status: 'today', priority: 'high' },
        { title: 'Skip unnecessary irrigation', status: 'today', priority: 'medium' },
      ],
      forecast: context.forecast,
      current: context.current || context.weather,
      crop: entities.crop || context.crop || 'wheat',
    }
  } else if (intent === 'FARM_FINANCE') {
    queryFacts = {
      finances: context.farmManagement?.finances || {
        totalExpenses: 24500,
        recordedIncome: 41000,
        recentExpenses: [{ category: 'Seeds & Fertilizer', amount: 8500, crop: 'Wheat' }],
      },
      crop: entities.crop || context.crop,
    }
  } else if (intent === 'FARM_FIELDS') {
    queryFacts = {
      fields: context.farmManagement?.fields || [
        { name: 'North Field', areaHa: 1.5, crop: 'Wheat', healthStatus: 'healthy' },
        { name: 'South Field', areaHa: 1.0, crop: 'Mustard', healthStatus: 'attention' },
      ],
      location: context.location,
    }
  } else if (intent === 'LIVESTOCK') {
    queryFacts = {
      livestock: context.farmManagement?.livestock || [
        { name: 'Dairy Cattle', count: 2, healthStatus: 'healthy', notes: 'FMD vaccinated' },
      ],
    }
  } else {
    queryFacts = context
  }

  const factsJson = JSON.stringify(queryFacts, null, 1)
  const draft = JSON.stringify(
    Object.fromEntries(PROSE_FIELDS.map((f) => [f, answer[f] ?? null])),
    null,
    1,
  )

  let intentInstructions = ''
  if (intent === 'GREETING') {
    intentInstructions = `INTENT: GREETING
- The user is greeting you. Respond warmly and concisely in 1-2 friendly sentences.
- State that you are ${assistantName}, ready to help with weather, forecasts, and questions.
- DO NOT dump weather statistics, rainfall mm, humidity, or irrigation.`
  } else if (intent === 'GENERAL_CONVERSATION') {
    intentInstructions = `INTENT: GENERAL CONVERSATION ("How are you?", "Who are you?")
- Answer warmly and conversationally in 1-2 sentences.
- Explain your role as ${assistantName} briefly and ask how you can help today.
- DO NOT invent or dump weather statistics, alerts, or irrigation advice.
- Set recommendedActions to [].`
  } else if (intent === 'RAIN_GEAR') {
    intentInstructions = `INTENT: RAIN_GEAR COMPARISON (Raincoat vs Umbrella)
- Directly compare Raincoat vs Umbrella based on the weather conditions in FACTS (wind speed and expected rain).
- Practical guide: A raincoat is superior in windy/gusty conditions or heavy downpours (as umbrellas invert and leave hands occupied). An umbrella is convenient for light urban drizzles with calm winds.
- State a clear personal recommendation based on the current/forecast wind and rain.
- DO NOT talk about farming, irrigation, or crop diseases.`
  } else if (intent === 'TRAVEL_SAFETY') {
    intentInstructions = `INTENT: TRAVEL & OUTDOOR SAFETY
- Directly answer whether travel is safe based on the weather conditions and any active weather alerts in FACTS.
- Mention expected rain, wind, and any potential road hazard (such as low-lying waterlogging or reduced visibility).
- Give 2-3 practical road/travel precautions in recommendedActions.`
  } else if (intent === 'RAIN_TIMING') {
    intentInstructions = `INTENT: RAIN TIMING ("What time will it rain?")
- Directly state the specific timing and peak window when rain is expected from peak_rain_timing in FACTS.
- Keep it concise and focused on timing.`
  } else if (intent === 'RAINFALL_AMOUNT') {
    intentInstructions = `INTENT: RAINFALL AMOUNT ("How much rain?")
- State the exact expected rainfall in millimeters and the probability from FACTS.
- Mention whether this constitutes light, moderate, or heavy showers.`
  } else if (intent === 'WEATHER_IMPACT_ON_CROP') {
    intentInstructions = `INTENT: WEATHER IMPACT ON CROP ("Will rain affect my wheat?")
- Analyze the agrometeorological impact of the forecasted rain/temperature on the specified crop.
- Explain whether the rain is beneficial (e.g. moisture for newly sown/vegetative crop) or harmful (e.g. waterlogging if drainage is inadequate).`
  } else if (intent === 'FOLLOW_UP') {
    intentInstructions = `INTENT: FOLLOW_UP ("Then what should I do?")
- Provide direct, logical next steps continuing from the previous conversational topic.
- Give 2 clear actionable recommendations.`
  } else if (intent === 'UNRELATED') {
    intentInstructions = `INTENT: UNRELATED / OFF-TOPIC
- Respond calmly and politely, stating that as ${assistantName}, your expertise is dedicated to weather and agricultural intelligence.
- DO NOT invent or mention weather numbers, alerts, or farming briefs.`
  } else if (intent === 'CROP_SOWING') {
    intentInstructions = `INTENT: CROP_SOWING (FARM MEMORY EVENT)
- Acknowledge their real-world observation explicitly: e.g., "आपने बताया कि आज गेहूं की बुवाई की गई है" / "Noted that you have sown wheat today".
- Give practical guidance for newly sown seeds (adequate moisture, avoiding crusting/waterlogging, germination in 5-7 days).`
  } else if (intent === 'WEATHER_CURRENT' || intent === 'TEMPERATURE') {
    intentInstructions = `INTENT: CURRENT WEATHER / TEMPERATURE
- Directly state the current temperature and atmospheric conditions for their location.
- Keep it concise. Do not dump irrigation verdicts or disease warnings.`
  } else if (intent === 'RAIN_FORECAST' || intent === 'WEATHER_TOMORROW') {
    intentInstructions = `INTENT: RAIN / WEATHER FORECAST
- Directly answer the rain/weather question: probability, expected rainfall in mm, and timing for their location.
- Keep it focused on the weather outlook.`
  } else if (intent === 'IRRIGATION') {
    intentInstructions = `INTENT: IRRIGATION DECISION
- Give a clear recommendation: e.g. "Wait / Postpone irrigation" or "Safe to irrigate".
- Cite soil moisture, recent rainfall (72h), and upcoming forecast.`
  } else if (intent === 'SPRAY_WINDOW') {
    intentInstructions = `INTENT: SPRAY WINDOW
- Assess whether spraying is safe based on wind speed (<15 km/h safe) and rain onset.`
  } else if (intent === 'CROP_HEALTH') {
    intentInstructions = `INTENT: CROP HEALTH & DISEASE
- Explain the most probable causes (nutrient deficiency, waterlogging/drainage issues, or fungal blight).
- Request a clear photo of the leaf/crop if visual confirmation is needed.`
  } else if (intent === 'FARM_STATUS') {
    intentInstructions = `INTENT: DAILY FARM BRIEF
- Provide the full structured daily farm brief covering overall condition, weather factors, irrigation verdict, and crop health.`
  } else if (intent === 'FARM_TASKS') {
    intentInstructions = `INTENT: FARM TASKS ("What should I do today?")
- Prioritize today's urgent field activities based on the current weather and scheduled tasks in FACTS.
- Warn against open spraying if rain or high wind is forecast, or advise skipping irrigation if soil is moist.
- Return 2-3 specific, actionable tasks in recommendedActions.`
  } else if (intent === 'FARM_FINANCE') {
    intentInstructions = `INTENT: FARM FINANCE & EXPENSES ("How much did I spend?")
- Summarize recorded input costs, fertilizer/seed expenses, or harvest revenue from FACTS.
- State clearly that calculations use recorded farm journal data rather than simulated estimates.`
  } else if (intent === 'FARM_FIELDS') {
    intentInstructions = `INTENT: MULTI-FIELD PARCEL STATUS ("Which field needs attention?")
- Compare the registered field parcels from FACTS.
- Clearly highlight any parcel under attention or elevated risk (such as drainage concerns) vs healthy plots.`
  } else if (intent === 'LIVESTOCK') {
    intentInstructions = `INTENT: LIVESTOCK MANAGEMENT
- Report the recorded livestock groups, headcount, and vaccination/care status from FACTS.
- Offer practical animal husbandry tips suitable for the current weather.`
  } else {
    intentInstructions = `INTENT: GENERAL QUERY
- Directly answer the user's question with clear, practical guidance grounded in FACTS.`
  }

  return `You are ${assistantName}, an expert AI advisor for Indian citizens and farmers.
The user asked: "${question}"

Language requested: ${LANG_NOTE[lang] || LANG_NOTE.en}

DETECTED INTENT: ${intent}
${intentInstructions}

RELEVANT FACTS & DATA:
${factsJson}

DRAFT DETERMINISTIC ANSWER:
${draft}

GROUNDING & FORMAT RULES:
1. Ground any numbers strictly in RELEVANT FACTS.
2. For greetings, casual chat, and comparisons (like Raincoat vs Umbrella), do NOT output irrigation recommendations, soil numbers, or emergency warnings.
3. Keep the tone respectful, natural, and directly helpful.

Return strictly valid JSON with these keys:
{
  "summary": "Direct response directly answering the user's question.",
  "speech": "Natural conversational text suitable for Text-to-Speech (no markdown, no bullets).",
  "gloss": "English translation if answering in Hindi/Hinglish, otherwise null",
  "irrigationReason": "Detailed reason for irrigation if relevant, else null",
  "recommendedActions": ["Clear actionable step 1", "Clear actionable step 2"],
  "riskExplanation": "Brief note on risk if relevant, else null",
  "uncertaintyExplanation": "Forecast confidence note if relevant, else null"
}`
}

export default { PROSE_FIELDS, buildPrompt }
