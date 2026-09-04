import { RISK_TONE } from './constants'
import { t } from './i18n'

/**
 * The daily brief, composed deterministically from numerical thresholds.
 * Fully localized for English ('en'), Hindi ('hi'), and Hinglish ('hinglish').
 */

/** IMD 24-hour rainfall categories, in mm. */
const RAIN = { light: 64.5, heavy: 115.6, veryHeavy: 204.5 }
/** IMD wind advisory thresholds, km/h. */
const WIND = { breezy: 20, strong: 40, squall: 62 }

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n))

export function greeting(now = new Date(), lang = 'en') {
  const h = now.getHours()
  if (h < 12) return t('goodMorning', lang)
  if (h < 17) return t('goodAfternoon', lang)
  return t('goodEvening', lang)
}

/**
 * The headline sentence and its supporting line.
 */
export function statement({ current, summary24h, daily, audience = 'everyone', fmt, lang = 'en' }) {
  if (!current || current.tempC == null) {
    return {
      headline: t('headNoConditions', lang),
      sub: t('subNoConditions', lang),
      unknown: true,
    }
  }

  const mm = summary24h?.rainMm ?? daily?.[0]?.mm ?? 0
  const wind = current.windKmh ?? 0
  const gust = current.gustKmh ?? wind
  const temp = current.tempC
  const prob = current.rainProb ?? 0

  // --- first half: what the weather is doing ---
  let headKey
  if (mm >= RAIN.veryHeavy) headKey = 'headExtremelyHeavy'
  else if (mm >= RAIN.heavy) headKey = 'headVeryHeavy'
  else if (mm >= RAIN.light) headKey = 'headHeavyRain'
  else if (prob >= 0.6) headKey = 'headRainLikely'
  else if (gust >= WIND.squall) headKey = 'headSquallyWinds'
  else if (temp >= 40) headKey = 'headDangerousHeat'
  else if (temp >= 35) headKey = 'headHotDry'
  else if (prob >= 0.3) headKey = 'headMixedShowers'
  else headKey = 'headDryBright'

  // --- second half: what it means for the person asking ---
  let tailKey
  if (audience === 'farm') {
    if (mm >= RAIN.heavy) tailKey = 'tailHoldOffSpraying'
    else if (mm >= RAIN.light) tailKey = 'tailDelayIrrigation'
    else if (wind >= WIND.strong) tailKey = 'tailTooWindySpray'
    else if (prob >= 0.5) tailKey = 'tailNarrowSprayWindow'
    else if (wind <= WIND.breezy && temp < 35) tailKey = 'tailGoodSprayWindow'
    else tailKey = 'tailCheckIrrigation'
  } else if (mm >= RAIN.heavy) tailKey = 'tailAvoidLowLying'
  else if (mm >= RAIN.light) tailKey = 'tailTravelDisruption'
  else if (gust >= WIND.squall) tailKey = 'tailSecureLoose'
  else if (temp >= 40) tailKey = 'tailStayOutHeat'
  else if (prob >= 0.5) tailKey = 'tailCarryUmbrella'
  else tailKey = 'tailGoodOutdoors'

  // Sub line with data points
  const bits = []
  if (mm > 0) {
    const rainVal = fmt ? fmt.rain(mm) : Math.round(mm)
    const unit = fmt ? fmt.rainUnit : 'mm'
    bits.push(`${rainVal} ${unit} ${t('expectedIn24h', lang)}`)
  } else {
    bits.push(`${Math.round(prob * 100)}% ${t('rainChance', lang)}`)
  }
  const speedVal = fmt ? fmt.speed(wind) : Math.round(wind)
  const speedUnit = fmt ? fmt.speedUnit : 'km/h'
  bits.push(`${t('winds', lang)} ${speedVal} ${speedUnit}`)

  return {
    headline: t(headKey, lang),
    sub: `${t(tailKey, lang)} · ${bits.join(' · ')}.`,
    unknown: false,
  }
}

/** The four status tiles under the hero. */
export function briefTiles({ current, summary24h, risk, daily, audience, fmt, lang = 'en' }) {
  const mm = summary24h?.rainMm ?? daily?.[0]?.mm ?? null
  const wind = current?.windKmh ?? null
  const band = risk?.overall || null
  const tone = band ? RISK_TONE[band] || 'green' : null

  const rainTone =
    mm == null ? null : mm >= RAIN.veryHeavy ? 'red' : mm >= RAIN.heavy ? 'orange' : mm >= RAIN.light ? 'yellow' : 'green'

  const weatherValue = current?.condition ? current.condition : t('condUnknown', lang)

  const tiles = [
    {
      key: 'weather',
      label: t('tileWeather', lang),
      value: weatherValue,
      note:
        mm == null
          ? t('noneExpected', lang)
          : `${fmt ? fmt.rain(mm) : Math.round(mm)} ${fmt ? fmt.rainUnit : 'mm'} ${t('in24h', lang)}`,
      tone: rainTone,
    },
    {
      key: 'risk',
      label: audience === 'farm' ? t('tileFarmRisk', lang) : t('tileRisk', lang),
      value: band || t('none', lang),
      note: risk?.score != null ? `${t('compositeRisk', lang)} ${risk.score}/100` : '—',
      tone,
    },
  ]

  if (audience === 'farm') {
    const irr = irrigation({ current, summary24h, daily, lang })
    tiles.push({
      key: 'irrigation',
      label: t('irrigationTitle', lang),
      value: irr.recommendation,
      note: irr.reason,
      tone: irr.tone,
    })
    tiles.push({
      key: 'crop',
      label: t('tileCropHealth', lang),
      value: t('tileNotScanned', lang),
      note: t('tileRunScan', lang),
      tone: null,
    })
  } else {
    tiles.push({
      key: 'wind',
      label: t('wind', lang),
      value: wind == null ? '—' : `${fmt ? fmt.speed(wind) : Math.round(wind)} ${fmt ? fmt.speedUnit : 'km/h'}`,
      note: current?.windDir ? `${current.windDir}` : '—',
      tone: wind == null ? null : wind >= WIND.squall ? 'orange' : wind >= WIND.strong ? 'yellow' : 'green',
    })
    tiles.push({
      key: 'visibility',
      label: t('visibility', lang),
      value:
        current?.visibilityKm == null
          ? '—'
          : `${fmt ? fmt.distance(current.visibilityKm) : current.visibilityKm} ${fmt ? fmt.distanceUnit : 'km'}`,
      note: current?.humidity != null ? `${current.humidity}% ${t('humidity', lang)}` : '—',
      tone: current?.visibilityKm == null ? null : current.visibilityKm < 2 ? 'orange' : 'green',
    })
  }

  return tiles
}

/**
 * Irrigation advice with multi-language support.
 */
export function irrigation({ current, summary24h, daily, lang = 'en' }) {
  const mm = summary24h?.rainMm ?? daily?.[0]?.mm ?? null
  const soon = daily?.slice(0, 2).reduce((a, d) => a + (d.mm || 0), 0) ?? null

  if (mm == null) {
    return {
      recommendation: t('irrCheckSoil', lang),
      band: t('irrRainBased', lang),
      tone: null,
      reason: t('irrDisclaimer', lang),
      confidence: 'LOW',
      inputs: [],
      missing: ['rainfall', 'soil type', 'crop stage'],
    }
  }

  let recommendation
  let tone
  let reason
  if (mm >= RAIN.heavy) {
    recommendation = t('irrDoNotIrrigate', lang)
    tone = 'orange'
    reason = lang === 'hi' 
      ? `अगले 24 घंटों में ${Math.round(mm)} मिमी बारिश का अनुमान है — मिट्टी की क्षमता से अधिक।`
      : lang === 'hinglish'
        ? `Agle 24 ghante mein ${Math.round(mm)} mm barish expected hai — sinchai rok dein.`
        : `${Math.round(mm)} mm is forecast in 24 h — soil will be saturated.`
  } else if (mm >= RAIN.light) {
    recommendation = t('irrWait', lang)
    tone = 'yellow'
    reason = lang === 'hi'
      ? `24 घंटों में लगभग ${Math.round(mm)} मिमी वर्षा संभावित है। वर्षा से पूर्ति होगी।`
      : lang === 'hinglish'
        ? `24 ghante mein ${Math.round(mm)} mm barish ki ummeed hai. Baarish ka paani kaafi hoga.`
        : `${Math.round(mm)} mm rain expected within 24 hours. The rain will do the work.`
  } else if (soon != null && soon >= 20) {
    recommendation = t('irrWait', lang)
    tone = 'yellow'
    reason = lang === 'hi'
      ? `अगले दो दिनों में लगभग ${Math.round(soon)} मिमी बारिश संभावित है।`
      : lang === 'hinglish'
        ? `Agle 2 din mein lagbhag ${Math.round(soon)} mm barish expected hai.`
        : `About ${Math.round(soon)} mm is expected over the next two days.`
  } else if ((current?.tempC ?? 0) >= 35 && mm < 5) {
    recommendation = t('irrigateNow', lang)
    tone = 'green'
    reason = lang === 'hi'
      ? `तापमान ${Math.round(current.tempC)} °C के करीब है और बारिश का अनुमान नहीं है।`
      : lang === 'hinglish'
        ? `Temperature ${Math.round(current.tempC)} °C ke paas hai aur barish nahi hai.`
        : `Little rain forecast and temperatures near ${Math.round(current.tempC)} °C.`
  } else {
    recommendation = t('irrCheckSoil', lang)
    tone = null
    reason = lang === 'hi'
      ? 'निर्णय लेने से पहले जड़ की गहराई पर मिट्टी की नमी जाँचें।'
      : lang === 'hinglish'
        ? 'Sinchai se pehle jadon ke paas mitti ki nami check karein.'
        : 'Feel the soil at root depth before deciding.'
  }

  return {
    recommendation,
    band: mm >= RAIN.light ? t('irrRainLimited', lang) : t('irrRainBased', lang),
    tone,
    reason,
    confidence: mm >= RAIN.light || mm < 2 ? 'MEDIUM' : 'LOW',
    inputs: ['24 h rainfall', '48 h rainfall', 'temperature'],
    missing: ['soil moisture', 'crop stage', 'last irrigation'],
  }
}

/** Today's actions, fully translated. */
export function actions({ current, summary24h, daily, audience, lang = 'en' }) {
  const mm = summary24h?.rainMm ?? daily?.[0]?.mm ?? 0
  const wind = current?.windKmh ?? 0
  const gust = current?.gustKmh ?? wind
  const out = []

  if (audience === 'farm') {
    if (mm >= RAIN.light) {
      out.push({
        text: t('actCoverProduce', lang),
        why: lang === 'hi' ? `24 घंटे में ${Math.round(mm)} मिमी बारिश संभावित` : `${Math.round(mm)} mm forecast in 24 h`,
      })
      out.push({
        text: t('actCheckDrainage', lang),
        why: lang === 'hi' ? 'निचले खेतों में जलभराव की रोकथाम' : 'Standing water prevention',
      })
      out.push({
        text: t('actDelayIrrigation', lang),
        why: lang === 'hi' ? 'मिट्टी वर्षा का जल सोख लेगी' : 'Soil will absorb rain',
      })
    }
    if (mm < RAIN.light && wind <= WIND.breezy) {
      out.push({
        text: t('actSprayWindowOpen', lang),
        why: lang === 'hi' ? `हवा की गति ${Math.round(wind)} किमी/घंटा, सुरक्षित सीमा में` : `Winds ${Math.round(wind)} km/h, below 20 km/h`,
      })
    }
    if (wind >= WIND.strong) {
      out.push({
        text: t('actDoNotSpray', lang),
        why: lang === 'hi' ? `हवा की गति ${Math.round(wind)} किमी/घंटा — दवा उड़ने का खतरा` : `Winds ${Math.round(wind)} km/h — drift risk`,
      })
    }
  } else {
    if (mm >= RAIN.light) {
      out.push({
        text: t('actAvoidRoads', lang),
        why: lang === 'hi' ? `24 घंटे में ${Math.round(mm)} मिमी बारिश की संभावना` : `${Math.round(mm)} mm forecast in 24 h`,
      })
    }
    if (gust >= WIND.squall) {
      out.push({
        text: t('actSecureOutdoors', lang),
        why: lang === 'hi' ? `झक्कड़ हवाएँ ${Math.round(gust)} किमी/घंटा` : `Gusts to ${Math.round(gust)} km/h`,
      })
    }
    if ((current?.rainProb ?? 0) >= 0.5) {
      out.push({
        text: t('actCarryUmbrella', lang),
        why: lang === 'hi' ? `${Math.round((current.rainProb || 0) * 100)}% वर्षा की संभावना` : `${Math.round((current.rainProb || 0) * 100)}% chance of rain`,
      })
    }
    if ((current?.tempC ?? 0) >= 38) {
      out.push({
        text: t('actMiddaySun', lang),
        why: lang === 'hi' ? `${Math.round(current.tempC)} °C भीषण तापमान अनुमानित` : `${Math.round(current.tempC)} °C expected`,
      })
    }
  }

  return out.slice(0, 4)
}

export { RAIN, WIND, clamp }
