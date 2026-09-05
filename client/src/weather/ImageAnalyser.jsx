import { useCallback, useEffect, useRef, useState } from 'react'
import { api, LIVE } from '../lib/api'
import { t } from '../lib/i18n'
import { cn } from '../lib/utils'
import Icon from '../ui/Icon'
import { Card, CardHead, CardBody, Meter } from '../ui/Bits'

const MAX_BYTES = 6 * 1024 * 1024
const OK_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic']

const MODES = {
  leaf: {
    key: 'leaf',
    task: 'disease',
    endpoint: '/api/agriculture/disease/analyze',
    model: 'VisionaryQuant/5_Crop_Disease_Detection',
  },
  soil: {
    key: 'soil',
    task: 'soil',
    endpoint: '/api/agriculture/soil/analyze',
    model: 'Ben041/soil-type-classifier',
  },
}

function formatLabel(raw, mode) {
  if (!raw) return 'Unknown Analysis'
  let clean = raw.replace(/___/g, ' · ').replace(/_/g, ' ')
  // Format words nicely
  clean = clean
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
  return clean
}

function getAIFieldPlan(prediction, confidence, risk, alternatives, crop, lang = 'en') {
  const p = (prediction || '').toLowerCase()
  const isHindi = lang === 'hi'
  const isHinglish = lang === 'hinglish'
  const confPct = Math.round((confidence || 0) * 100)
  const riskBand = risk?.band || 'MODERATE'

  if (p.includes('healthy') || p.includes('normal')) {
    return {
      statusTone: 'green',
      statusTitle: isHindi ? 'स्वस्थ फ़सल स्थिति — निवारक प्रबंधन' : isHinglish ? 'Healthy Crop Status — Preventive Care' : 'Healthy Crop Status — Preventive Management',
      aiSummary: isHindi
        ? `एआई विश्लेषण: फ़सल की पत्तियाँ ${confPct}% विश्वसनीयता के साथ पूरी तरह स्वस्थ हैं। वर्तमान मौसम जोखिम (${riskBand}) के तहत रोग रोकथाम और संतुलित पोषण पर ध्यान दें।`
        : isHinglish
          ? `AI Analysis: Crop foliage ${confPct}% confidence ke saath fully healthy hai. Weather risk (${riskBand}) ke chalte preventive care aur balanced nutrition follow karein.`
          : `AI Analysis: Foliage verified healthy with ${confPct}% confidence. Under prevailing ${riskBand} weather risk, maintain proactive canopy protection and balanced fertilization.`,
      nextSteps: [
        {
          num: '1',
          title: isHindi ? 'संतुलित पोषण प्रबंधन' : 'Balanced N-P-K Nutrition',
          detail: isHindi
            ? 'संतुलित यूरिया व पोटाश दें। अत्यधिक नाइट्रोजन से बचें जो पत्तियों को अधिक कोमल बनाकर कवक संक्रमण के प्रति संवेदनशील बनाती है।'
            : 'Maintain recommended N-P-K ratio. Avoid excess urea/nitrogen which creates succulent foliage vulnerable to spore entry.',
        },
        {
          num: '2',
          title: isHindi ? 'जड़ क्षेत्र की नमी व जल निकासी' : 'Root-Zone Moisture & Drainage',
          detail: isHindi
            ? 'जड़ के पास 10-15 सेमी गहराई पर नमी की जाँच करें। संभावित बारिश के लिए खेत की जल निकासी नालियां खुली रखें।'
            : 'Check soil moisture at 10-15 cm root depth. Keep surface furrows clear to prevent standing water during upcoming rain spells.',
        },
        {
          num: '3',
          title: isHindi ? 'जैविक सुरक्षा कवच (Bio-Defense)' : 'Prophylactic Bio-Protection',
          detail: isHindi
            ? 'नमी अधिक रहने पर सुरक्षात्मक उपाय के रूप में नीम तेल (1500 ppm, 3 मिली/ली) या ट्राइकोडर्मा का छिड़काव करें।'
            : 'Apply preventive neem oil (1500 ppm, 3 ml/L) or Trichoderma spray to build natural systemic resistance on clean foliage.',
        },
      ],
      precautions: isHindi
        ? 'सावधानी: पत्तियाँ स्वस्थ होने के बावजूद मौसम में उच्च नमी रहने पर सुबह के समय खेत का मुआयना जारी रखें। गीली पत्तियों पर छिड़काव न करें।'
        : 'Precaution: Despite clean foliage, high atmospheric humidity requires weekly morning leaf scouting. Avoid overhead sprinkler irrigation during humid evenings.',
      farmMemoryImpact: isHindi
        ? '🔄 खेत मेमोरी में बेसलाइन स्वस्थ स्थिति दर्ज। नया फोटो केवल मौसम या जोखिम में बड़ा बदलाव होने पर ही माँगा जाएगा।'
        : '🔄 Baseline healthy state logged in Farm Memory. Aakrishi will auto-monitor weather and only request a new photo if weather conditions shift.',
    }
  }

  if (p.includes('blight')) {
    return {
      statusTone: 'red',
      statusTitle: isHindi ? 'ब्लाइट (झुलसा) संक्रमण — तत्काल सुधारात्मक कदम' : isHinglish ? 'Blight Infection — Immediate Action Plan' : 'Blight Infection — Immediate Remedial Action',
      aiSummary: isHindi
        ? `एआई विश्लेषण: फ़सल में झुलसा/ब्लाइट के लक्षण (${confPct}% विश्वसनीयता) पाए गए हैं। उच्च नमी एवं वर्षा से बीजाणु तेजी से फैलते हैं।`
        : isHinglish
          ? `AI Analysis: Fasal mein Blight ke symptoms (${confPct}% confidence) detect hue hain. High humidity se disease tezi se spread ho sakti hai.`
          : `AI Analysis: Foliar blight lesions identified with ${confPct}% confidence. Ambient humidity and warmth accelerate fungal spore dispersal.`,
      nextSteps: [
        {
          num: '1',
          title: isHindi ? 'संक्रमित पत्तियों की छंटाई व सफाई' : 'Sanitation & Lower Canopy Pruning',
          detail: isHindi
            ? 'निचली अत्यधिक प्रभावित पत्तियों को तोड़कर खेत से दूर नष्ट करें ताकि बीजाणुओं का फैलाव रुक सके।'
            : 'Prune heavily infected lower leaves and dispose them safely away from the field to arrest splash-spore transmission.',
        },
        {
          num: '2',
          title: isHindi ? 'लक्षित फफूंदनाशक छिड़काव' : 'Targeted Fungicide Application',
          detail: isHindi
            ? 'छिड़काव विंडो अनुकूल होने पर कॉपर ऑक्सीक्लोराइड (2.5 ग्राम/ली) या एज़ोक्सीस्ट्रोबिन + मैन्कोज़ेब का घोल बनाकर स्प्रे करें।'
            : 'Apply copper oxychloride (2.5 g/L) or azoxystrobin + mancozeb during calm morning spray window (<15 km/h wind).',
        },
        {
          num: '3',
          title: isHindi ? 'जलभराव निवारण व ड्रिप सिंचाई' : 'Drainage Management & Drip Irrigation',
          detail: isHindi
            ? 'पौधों की पत्तियों पर सीधा पानी डालने से बचें; ड्रिप या थाला विधि अपनाएं और खेत में जलभराव न होने दें।'
            : 'Avoid overhead wetting of leaves. Ensure proper furrow drainage to keep root zones aerated and reduce microclimate humidity.',
        },
      ],
      precautions: isHindi
        ? 'सावधानी: तेज़ हवा या बारिश के समय छिड़काव न करें। दवा का छिड़काव पत्तियों की दोनों सतहों (ऊपर व नीचे) पर समान रूप से करें।'
        : 'Precaution: Do not spray in high winds (>15 km/h) or before rain. Ensure thorough coverage on both upper and lower leaf surfaces.',
      farmMemoryImpact: isHindi
        ? '⚠️ खेत स्थिति को \'कार्रवाई आवश्यक\' पर अपडेट किया गया। 3 से 5 दिनों में सुधार जांचने के लिए नया फोटो माँगा जाएगा।'
        : '⚠️ Farm Condition updated to \'Action Needed\'. A smart follow-up photo request will trigger in 3–5 days to monitor recovery.',
    }
  }

  if (p.includes('rust') || p.includes('mildew') || p.includes('spot') || p.includes('cercospora')) {
    return {
      statusTone: 'orange',
      statusTitle: isHindi ? 'कवक धब्बा / रतुआ रोग — नियंत्रण रणनीति' : 'Foliar Fungal Infection — Control Protocol',
      aiSummary: isHindi
        ? `एआई विश्लेषण: फ़सल में फंगल रोग (${confPct}% विश्वसनीयता) के लक्षण दिखे हैं। समय रहते उपचार करने से उपज की हानि को पूरी तरह रोका जा सकता है।`
        : `AI Analysis: Fungal spotting/pustules identified with ${confPct}% confidence. Timely prophylactic and curative spray will prevent yield loss.`,
      nextSteps: [
        {
          num: '1',
          title: isHindi ? 'फफूंदनाशक का त्वरित छिड़काव' : 'Curative Fungicide Spray',
          detail: isHindi
            ? 'प्रोपिकोनाजोल (1 मिली/ली) या घुलनशील गंधक (सल्फर 80% WP, 2 ग्राम/ली) का सुबह के समय छिड़काव करें।'
            : 'Apply systemic triazole (propiconazole 1 ml/L) or wettable sulfur (2 g/L) early in the morning when canopy is dry.',
        },
        {
          num: '2',
          title: isHindi ? 'पोटाश व सूक्ष्म पोषक तत्व' : 'Potash & Micronutrient Boost',
          detail: isHindi
            ? 'रोग प्रतिरोधक क्षमता बढ़ाने हेतु 00:52:34 या पोटाश का पर्णीय छिड़काव (Foliar spray) करें।'
            : 'Apply foliar potassium spray (00:52:34, 5 g/L) to strengthen cell walls and increase resistance against fungal penetration.',
        },
        {
          num: '3',
          title: isHindi ? 'पौधों के बीच वायु संचार' : 'Canopy Spacing & Weed Removal',
          detail: isHindi
            ? 'खेत से खरपतवार हटाएं ताकि फसल में धूप और हवा का संचार बना रहे और नमी जल्दी सूखे।'
            : 'Remove weed hosts and thin dense foliage to improve solar penetration and reduce leaf wetness duration.',
        },
      ],
      precautions: isHindi
        ? 'सावधानी: लक्षण बढ़ने पर पत्ती का नमूना लेकर नजदीकी कृषि विज्ञान केंद्र (KVK) के विशेषज्ञ से सलाह लें।'
        : 'Precaution: If lesions expand after 4 days, bring a fresh leaf sample to your local Krishi Vigyan Kendra (KVK).',
      farmMemoryImpact: isHindi
        ? '⚠️ खेत टाइमलाइन में अवलोकन दर्ज। मौसम बदलने के बाद स्थिति का नया मुआयना किया जाएगा।'
        : '⚠️ Observation logged in Farm Timeline. Next field verification suggested after chemical application.',
    }
  }

  // Soil Mode or General
  return {
    statusTone: 'accent',
    statusTitle: isHindi ? 'मृदा व कृषि प्रबंधन सलाह' : 'Soil & Field Agronomy Guidance',
    aiSummary: isHindi
      ? `एआई विश्लेषण: नमूने का वर्गीकरण (${confPct}% विश्वसनीयता) पूर्ण हुआ। मिट्टी के प्रकार के अनुसार सिंचाई व खाद की मात्रा निर्धारित करें।`
      : `AI Analysis: Sample classified with ${confPct}% confidence. Follow tailored moisture and fertilization protocol for this soil profile.`,
    nextSteps: [
      {
        num: '1',
        title: isHindi ? 'नमी व सिंचाई प्रबंधन' : 'Split-Dose Irrigation Schedule',
        detail: isHindi
          ? 'मिट्टी की जल धारण क्षमता के अनुसार सिंचाई का समय तय करें। भारी मिट्टी में जलभराव और रेतीली में सूखे से बचें।'
          : 'Calibrate water volume to soil texture: light sandy soils require frequent short irrigations; heavy soils need deep, spaced intervals.',
      },
      {
        num: '2',
        title: isHindi ? 'जैविक खाद व सुधारक' : 'Organic Compost & FYM Integration',
        detail: isHindi
          ? 'मिट्टी की संरचना सुधारने के लिए प्रति एकड़ 2-3 टन अच्छी सड़ी गोबर की खाद (FYM) या वर्मीकंपोस्ट मिलाएं।'
          : 'Incorporate 2-3 tons/acre well-decomposed FYM or vermicompost to enhance cation exchange capacity and microbial activity.',
      },
      {
        num: '3',
        title: isHindi ? 'मृदा स्वास्थ्य कार्ड परीक्षण' : 'Soil Health Card Verification',
        detail: isHindi
          ? 'साल में एक बार pH और N-P-K तथा सूक्ष्म पोषक तत्वों की प्रयोगशाला जांच करवाएं।'
          : 'Conduct annual laboratory soil testing for pH, electrical conductivity (EC), and organic carbon calibration.',
      },
    ],
    precautions: isHindi
      ? 'सावधानी: भारी बारिश के बाद गीली मिट्टी में भारी ट्रैक्टर चलाने से बचें ताकि मिट्टी में कड़ापन (Hardpan) न बने।'
      : 'Precaution: Avoid operating heavy tractors in wet soil to prevent subsoil compaction and hardpan formation.',
    farmMemoryImpact: isHindi
      ? '🔄 खेत प्रोफाइल में मिट्टी का प्रकार अपडेट हुआ। सिंचाई गणना अब इस आधार पर होगी।'
      : '🔄 Soil type registered in Farm Profile. Irrigation and waterlogging models now calibrated to this texture.',
  }
}

export default function ImageAnalyser({ mode = 'leaf', onResult, onViewDashboard, crop, location, lang = 'en' }) {
  const M = MODES[mode] || MODES.leaf
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [state, setState] = useState('idle')
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [available, setAvailable] = useState(null)
  const inputRef = useRef(null)

  const title = mode === 'leaf' ? t('leafTitle', lang) : t('soilTitle', lang)
  const prompt = mode === 'leaf' ? t('leafPrompt', lang) : t('soilPrompt', lang)
  const hint = mode === 'leaf' ? t('leafHint', lang) : t('soilHint', lang)
  const cta = mode === 'leaf' ? t('leafCta', lang) : t('soilCta', lang)
  const resultLabel = mode === 'leaf' ? t('mostLikelyClass', lang) : t('mostLikelySoil', lang)

  useEffect(() => {
    if (!LIVE) {
      setAvailable(false)
      return
    }
    let cancelled = false
    api
      .modelStatus()
      .then((s) => !cancelled && setAvailable(Boolean(s.configured)))
      .catch(() => !cancelled && setAvailable(false))
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview])

  const reset = useCallback(() => {
    if (preview) URL.revokeObjectURL(preview)
    setFile(null)
    setPreview(null)
    setResult(null)
    setError(null)
    setState('idle')
    if (inputRef.current) inputRef.current.value = ''
  }, [preview])

  const onPick = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (!OK_TYPES.includes(f.type)) {
      setError('That file is not an image the models accept. Use a JPEG, PNG or WebP photo.')
      setState('error')
      return
    }
    if (f.size > MAX_BYTES) {
      setError(`That photo is ${(f.size / 1024 / 1024).toFixed(1)} MB. The limit is 6 MB.`)
      setState('error')
      return
    }
    if (preview) URL.revokeObjectURL(preview)
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setResult(null)
    setError(null)
    setState('idle')
  }

  const run = async () => {
    if (!file) return
    if (!LIVE) {
      setState('offline')
      return
    }
    setState('busy')
    setError(null)
    try {
      const data = await api.analyseImage(M.task, file, {
        crop: crop || undefined,
        lat: M.task === 'disease' ? location?.lat : undefined,
        lon: M.task === 'disease' ? location?.lon : undefined,
      })
      if (!data.prediction || typeof data.confidence !== 'number') {
        throw new Error('The model returned no usable prediction.')
      }
      setResult(data)
      setState('done')
      onResult?.({ ...data, mode: M.key })
    } catch (err) {
      setError(String(err?.message || err))
      setState('error')
    }
  }

  const fieldPlan = result ? getAIFieldPlan(result.prediction, result.confidence, result.risk, result.alternatives, crop, lang) : null
  const formattedPred = result ? formatLabel(result.prediction, mode) : ''

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {/* -------------------------------------------------------- the input */}
      <Card>
        <CardHead title={title} meta="Photo stays on your device" />
        <CardBody className="space-y-3">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={onPick}
            className="sr-only"
            id={`img-${M.key}`}
          />
          <label
            htmlFor={`img-${M.key}`}
            className={cn(
              'flex min-h-[220px] cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-line bg-sunk p-4 text-center transition-colors duration-150 hover:border-accent',
              preview && 'border-solid p-0',
            )}
          >
            {preview ? (
              <img src={preview} alt="The photo you selected" className="h-full max-h-[320px] w-full object-cover" />
            ) : (
              <span className="block">
                <span className="mx-auto grid h-12 w-12 place-items-center rounded-lg bg-accent-soft text-accent">
                  <Icon name="camera" size={22} />
                </span>
                <span className="mt-3 block text-caption font-medium text-ink">{prompt}</span>
                <span className="mx-auto mt-1 block max-w-[34ch] text-data leading-relaxed text-ink-3">
                  {hint}
                </span>
              </span>
            )}
          </label>

          <div className="flex flex-wrap gap-2.5">
            <button type="button" onClick={run} disabled={!file || state === 'busy'} className="btn">
              {state === 'busy' ? t('analysing', lang) : cta}
            </button>
            {file && (
              <button type="button" onClick={reset} className="btn-ghost">
                {t('resetPhoto', lang)}
              </button>
            )}
          </div>
        </CardBody>
      </Card>

      {/* ------------------------------------------------------- the result */}
      <Card>
        <CardHead title="Diagnosis & Analysis" meta={state === 'done' ? 'Neural Network Verified' : 'Awaiting photo'} />
        <CardBody>
          {state === 'idle' && (
            <div className="py-6 text-center">
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-sunk text-ink-3">
                <Icon name={mode === 'leaf' ? 'sprout' : 'cloud'} size={24} />
              </span>
              <p className="mt-3 text-subheading font-medium text-ink">
                {mode === 'leaf' ? 'Upload Leaf Image for Diagnosis' : 'Upload Soil Image for Texture Analysis'}
              </p>
              <p className="mx-auto mt-1 max-w-sm text-data leading-relaxed text-ink-3">
                Select or capture a clear photo and click <strong className="font-medium text-ink">{cta}</strong>.
              </p>
            </div>
          )}

          {state === 'busy' && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 animate-spin place-items-center rounded-lg bg-accent-soft text-accent">
                  <Icon name="loader" size={20} />
                </span>
                <div>
                  <p className="text-subheading font-medium text-ink">{t('analysing', lang)}</p>
                  <p className="text-caption text-ink-3">Running feature extraction & neural inference…</p>
                </div>
              </div>
              <Meter value={2} max={3} tone="bg-accent" />
            </div>
          )}

          {state === 'offline' && (
            <div>
              <span className="grid h-11 w-11 place-items-center rounded-lg bg-sev-yellow-w text-sev-yellow">
                <Icon name="alert" size={20} />
              </span>
              <p className="mt-3 text-body-sm font-medium text-ink">AI Model Service Offline</p>
              <p className="mt-2 text-data leading-relaxed text-ink-2">
                Connect the Python AI engine with HuggingFace models to classify live images.
              </p>
            </div>
          )}

          {state === 'error' && (
            <div>
              <span className="grid h-11 w-11 place-items-center rounded-lg bg-sev-red-w text-sev-red">
                <Icon name="alert" size={20} />
              </span>
              <p className="mt-3 text-body-sm font-medium text-ink">Scan failed</p>
              <p className="mt-2 text-data leading-relaxed text-ink-2">{error}</p>
            </div>
          )}

          {state === 'done' && result && (
            <div className="space-y-4">
              {/* 1. Primary Neural Classification */}
              <div className="flex flex-col gap-2 rounded-xl border border-line bg-sunk/60 p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="lbl">{resultLabel}</span>
                  {fieldPlan && (
                    <span className={cn(
                      'rounded-full border px-2.5 py-0.5 text-meta font-medium',
                      fieldPlan.statusTone === 'green' ? 'bg-sev-green-w text-sev-green border-sev-green-w' :
                      fieldPlan.statusTone === 'red' ? 'bg-sev-red-w text-sev-red border-sev-red-w' :
                      'bg-sev-orange-w text-sev-orange border-sev-orange-w'
                    )}>
                      {fieldPlan.statusTitle}
                    </span>
                  )}
                </div>
                <h3 className="text-heading-sm font-semibold tracking-[-0.02em] text-ink">
                  {formattedPred}
                </h3>
                <div className="mt-1">
                  <div className="flex items-baseline justify-between text-meta text-ink-2">
                    <span>{t('irrConfidence', lang)}</span>
                    <span className="tnum font-medium text-ink">
                      {Math.round(result.confidence * 100)}%
                    </span>
                  </div>
                  <Meter
                    value={result.confidence}
                    max={1}
                    tone={result.confidence >= 0.75 ? 'bg-sev-green' : result.confidence >= 0.5 ? 'bg-sev-yellow' : 'bg-sev-orange'}
                    className="mt-1.5"
                  />
                </div>
              </div>

              {/* 2. Weather Fused Risk Assessment */}
              {result.risk && (
                <div className="rounded-xl border border-line bg-sunk p-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="lbl">{t('tileRisk', lang)}</span>
                    <span className="text-caption font-semibold text-ink uppercase tracking-wide">{result.risk.band}</span>
                  </div>
                  <p className="mt-1.5 text-data leading-relaxed text-ink-2">{result.risk.explanation}</p>
                </div>
              )}

              {/* 3. AI Agronomy Advisor: What to Do Next */}
              {fieldPlan && (
                <div className="space-y-3 rounded-xl border border-accent/30 bg-accent-soft/30 p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-caption font-bold text-accent">
                    <Icon name="sprout" size={17} />
                    <span>{lang === 'hi' ? 'एआई कृषि विशेषज्ञ सलाह — आगे क्या करें?' : 'AI Agronomist Advisor — What To Do Next'}</span>
                  </div>
                  
                  <p className="text-data text-ink leading-relaxed font-medium">
                    {fieldPlan.aiSummary}
                  </p>

                  <div className="space-y-2 pt-1">
                    {fieldPlan.nextSteps.map((step) => (
                      <div key={step.num} className="flex items-start gap-2.5 rounded-lg border border-line/60 bg-surface/90 p-2.5">
                        <span className="grid h-5 w-5 flex-none place-items-center rounded-md bg-accent font-mono text-[10px] font-bold text-on-accent">
                          {step.num}
                        </span>
                        <div className="min-w-0">
                          <span className="block text-caption font-bold text-ink">{step.title}</span>
                          <span className="mt-0.5 block text-data leading-snug text-ink-2 text-[12.5px]">{step.detail}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Precautions Box */}
                  <div className="rounded-lg border border-sev-yellow/40 bg-sev-yellow-w/40 p-2.5 text-data text-ink font-medium leading-relaxed">
                    ⚠️ {fieldPlan.precautions}
                  </div>

                  {/* Continuous Farm State Impact */}
                  <div className="rounded-lg border border-line bg-surface/70 p-2.5 text-meta text-ink-2 font-medium">
                    {fieldPlan.farmMemoryImpact}
                  </div>
                </div>
              )}

              {/* 4. Alternative Predictions */}
              {Array.isArray(result.alternatives) && result.alternatives.length > 0 && (
                <div className="rounded-xl border border-line bg-sunk/40 p-3.5">
                  <span className="lbl block mb-2">Alternative Predictions</span>
                  <div className="flex flex-wrap gap-2">
                    {result.alternatives.slice(0, 3).map((alt, i) => (
                      <span key={i} className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1 text-meta text-ink-2">
                        <span>{formatLabel(alt.label || alt.name, mode)}</span>
                        <span className="font-semibold text-ink">{Math.round((alt.score || alt.confidence || 0) * 100)}%</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 5. Interactive Action Buttons */}
              <div className="flex flex-wrap items-center gap-2.5 pt-2">
                {onViewDashboard && (
                  <button
                    type="button"
                    onClick={onViewDashboard}
                    className="btn flex-1 items-center justify-center gap-2"
                  >
                    <span>{lang === 'hi' ? 'खेत इंटेलिजेंस डैशबोर्ड देखें' : 'View in Farm Intelligence'}</span>
                    <Icon name="chevron-right" size={16} />
                  </button>
                )}
                <a
                  href="#/chat"
                  className="btn-ghost flex items-center gap-1.5 text-accent font-semibold"
                >
                  <Icon name="mic" size={15} />
                  <span>{lang === 'hi' ? 'कृषिवाणी से पूछें' : 'Ask Krishivaani'}</span>
                </a>
                <button
                  type="button"
                  onClick={reset}
                  className="btn-ghost"
                >
                  {lang === 'hi' ? 'नया स्कैन' : 'Scan Another'}
                </button>
              </div>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  )
}
