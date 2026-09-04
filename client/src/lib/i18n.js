/**
 * Interface strings, as data.
 *
 * One flat table keyed by string then language. Adding Marathi is a new key in
 * each entry — not a new code path — which is the PRD's claim that further
 * languages are "a config entry, not a rewrite", made checkable.
 *
 * Answer *content* is not translated here. The Python composer produces it in
 * the user's language, because it is the only place that knows which numbers
 * are grounded. This file is chrome: labels, buttons, empty states.
 */

export const LANGS = ['en', 'hi', 'hinglish']
export const FALLBACK = 'en'

/**
 * BCP-47 tags for Web Speech. Hinglish speech *is* Hindi speech — a romanised
 * question is spoken in Hindi and must be recognised as `hi-IN`, or every
 * Hinglish user is transcribed as broken English.
 */
export const SPEECH_LOCALE = { en: 'en-IN', hi: 'hi-IN', hinglish: 'hi-IN' }

const S = {
  // --- Ask screen -------------------------------------------------------
  askTitle: {
    en: 'Ask about the weather',
    hi: 'मौसम के बारे में पूछें',
    hinglish: 'Mausam ke baare mein poochhein',
  },
  askBlurb: {
    en: 'By typing or by voice. Every answer carries its risk level, its confidence, and where the numbers came from.',
    hi: 'टाइप करके या बोलकर। हर उत्तर के साथ जोखिम स्तर, भरोसा, और आँकड़ों का स्रोत दिया जाता है।',
    hinglish: 'Type karke ya bolkar. Har jawab ke saath jokhim star, bharosa, aur aankdon ka source diya jata hai.',
  },
  placeholder: {
    en: 'Ask about the weather…',
    hi: 'मौसम के बारे में पूछें…',
    hinglish: 'Mausam ke baare mein poochhein…',
  },
  listening: { en: 'Listening…', hi: 'सुन रहा हूँ…', hinglish: 'Sun raha hoon…' },
  send: { en: 'Send', hi: 'भेजें', hinglish: 'Bhejein' },
  thinking: {
    en: 'Fetching forecast · checking warnings',
    hi: 'पूर्वानुमान लाया जा रहा है · चेतावनियाँ जाँची जा रही हैं',
    hinglish: 'Forecast laaya ja raha hai · warnings jaanchi ja rahi hain',
  },
  grounding: {
    en: "Answers are grounded in fetched data · never generated from the model's own knowledge",
    hi: 'उत्तर लाए गए आँकड़ों पर आधारित हैं · मॉडल की अपनी जानकारी से नहीं',
    hinglish: 'Jawab laaye gaye data par aadharit hain · model ki apni jaankari se nahin',
  },
  emptyThread: {
    en: 'Ask a question to begin.',
    hi: 'शुरू करने के लिए एक सवाल पूछें।',
    hinglish: 'Shuru karne ke liye ek sawaal poochhein.',
  },

  // --- answer blocks ----------------------------------------------------
  officialWarning: {
    en: 'Official warning',
    hi: 'आधिकारिक चेतावनी',
    hinglish: 'Official warning',
  },
  whatThisMeans: {
    en: 'What this means',
    hi: 'इसका मतलब',
    hinglish: 'Iska matlab',
  },
  risk: { en: 'Risk', hi: 'जोखिम', hinglish: 'Jokhim' },
  confidence: { en: 'Confidence', hi: 'भरोसा', hinglish: 'Bharosa' },
  recommended: { en: 'What to do', hi: 'क्या करें', hinglish: 'Kya karein' },
  sources: { en: 'Sources', hi: 'स्रोत', hinglish: 'Sources' },
  speak: { en: 'Read aloud', hi: 'पढ़कर सुनाएँ', hinglish: 'Padhkar sunayein' },
  stopSpeaking: { en: 'Stop', hi: 'रोकें', hinglish: 'Rokein' },

  // --- errors and degraded states --------------------------------------
  noLocation: {
    en: "I couldn't find that place. Try a district or a nearby town.",
    hi: 'वह जगह नहीं मिली। ज़िला या पास का कोई शहर आज़माएँ।',
    hinglish: 'Woh jagah nahin mili. Zila ya paas ka koi shehar aazmayein.',
  },
  offline: {
    en: 'No connection. Showing the last data that loaded.',
    hi: 'कनेक्शन नहीं है। पिछला उपलब्ध डेटा दिखाया जा रहा है।',
    hinglish: 'Connection nahin hai. Pichhla available data dikhaya ja raha hai.',
  },
  failed: {
    en: "That didn't go through. Try again in a moment.",
    hi: 'यह पूरा नहीं हो सका। थोड़ी देर बाद कोशिश करें।',
    hinglish: 'Yeh pura nahin ho saka. Thodi der baad koshish karein.',
  },
  micDenied: {
    en: 'Microphone access is blocked. Allow it in your browser settings, or type instead.',
    hi: 'माइक्रोफ़ोन की अनुमति नहीं है। ब्राउज़र सेटिंग में अनुमति दें, या टाइप करें।',
    hinglish: 'Microphone ki permission nahin hai. Browser settings mein allow karein, ya type karein.',
  },
  micUnsupported: {
    en: 'This browser cannot listen. Try Chrome, or type your question.',
    hi: 'यह ब्राउज़र सुन नहीं सकता। Chrome आज़माएँ, या सवाल टाइप करें।',
    hinglish: 'Yeh browser sun nahin sakta. Chrome aazmayein, ya sawaal type karein.',
  },
  noApi: {
    en: 'No API is configured, so I cannot fetch a real forecast. The Today screen still works on bundled sample data.',
    hi: 'कोई API कॉन्फ़िगर नहीं है, इसलिए वास्तविक पूर्वानुमान नहीं ला सकता। Today स्क्रीन नमूना डेटा पर चल रही है।',
    hinglish: 'Koi API configure nahin hai, isliye asli forecast nahin la sakta. Today screen sample data par chal rahi hai.',
  },
  apiUnreachable: {
    en: "I couldn't reach the server. Check that the API is running, then ask again.",
    hi: 'सर्वर तक नहीं पहुँच सका। जाँचें कि API चल रहा है, फिर दोबारा पूछें।',
    hinglish: 'Server tak nahin pahunch saka. Check karein ki API chal raha hai, phir dobara poochhein.',
  },
  composerHint: {
    en: 'Ask about the weather, your crop or a warning…',
    hi: 'मौसम, फ़सल या चेतावनी के बारे में पूछें…',
    hinglish: 'Mausam, fasal ya warning ke baare mein poochhein…',
  },
  apiUnreachableSample: {
    en: "I couldn't reach the server, so this answer is composed from the bundled sample data — not a live forecast.",
    hi: 'सर्वर तक नहीं पहुँच सका, इसलिए यह उत्तर नमूना डेटा से बना है — वास्तविक पूर्वानुमान नहीं।',
    hinglish: 'Server tak nahin pahunch saka, isliye yeh jawab sample data se bana hai — live forecast nahin.',
  },
  micNoSpeech: {
    en: "I didn't catch that. Tap the mic and try again.",
    hi: 'सुनाई नहीं दिया। माइक दबाकर फिर कोशिश करें।',
    hinglish: 'Sunai nahin diya. Mic dabakar phir koshish karein.',
  },
}

/**
 * `t('askTitle', 'hi')` — falls back language → English → the key itself.
 *
 * Returning the key rather than empty string on a miss is deliberate: a missing
 * string shows up as `askTitle` in the interface, which someone notices, rather
 * than as a blank space, which nobody does.
 */
export function t(key, lang = FALLBACK) {
  const entry = S[key]
  if (!entry) return key
  return entry[lang] ?? entry[FALLBACK] ?? key
}

export default t

/**
 * Example questions offered above the composer.
 *
 * Interface copy, not sample data — which is why they live here rather than in
 * sampleData.js. Each is a real question the pipeline can answer, in all three
 * languages; adding a language means adding a key, same as everything else.
 */
export const SUGGESTIONS = [
  { en: 'Will it rain this evening?', hi: 'आज शाम बारिश होगी?', hinglish: 'Aaj shaam barish hogi?' },
  { en: 'Is there a warning for my district?', hi: 'क्या मेरे ज़िले में चेतावनी है?', hinglish: 'Mere zile mein warning hai kya?' },
  { en: 'Should I irrigate today?', hi: 'क्या आज सिंचाई करूँ?', hinglish: 'Aaj sinchai karun kya?' },
  { en: 'Is it safe to travel tomorrow?', hi: 'क्या कल यात्रा सुरक्षित है?', hinglish: 'Kal safar surakshit hai?' },
]
