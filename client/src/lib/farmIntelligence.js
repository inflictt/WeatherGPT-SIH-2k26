import { daysSince, stageFor } from './useFarm'
import { t } from './i18n'

/**
 * Continuous Farm Condition & Intelligence Engine.
 *
 * Grounded in numerical weather data (Open-Meteo), official CAP warnings (NDMA Sachet),
 * farm profile context (soil, irrigation, crop stage), and farmer ground-truth photos.
 */

export function evaluateFarmIntelligence({
  farm,
  current,
  daily,
  summary24h,
  hourly,
  warnings = [],
  lang = 'en',
}) {
  const mm24 = summary24h?.rainMm ?? daily?.[0]?.mm ?? 0
  const rainProb = current?.rainProb ?? 0
  const temp = current?.tempC ?? 28
  const wind = current?.windKmh ?? 10
  const humidity = current?.humidity ?? 50
  const soilType = farm?.soilType || 'Loamy'
  const primaryCrop = farm?.crops?.[0] || null
  const cropStage = primaryCrop ? stageFor(primaryCrop) : null
  const observations = farm?.observations || []
  const lastObs = observations[0] || null

  // -------------------------------------------------------------------------
  // 1. Core Farm Parameter Calculations
  // -------------------------------------------------------------------------

  // 1.1 Water / Soil Moisture
  let waterStatus = 'adequate'
  let waterLabel = lang === 'hi' ? 'पर्याप्त' : lang === 'hinglish' ? 'Adequate' : 'Adequate'
  let waterTone = 'green'
  let waterDesc = lang === 'hi' ? 'मिट्टी में अनुकूल नमी स्तर' : 'Moisture is in optimal range'

  if (mm24 >= 64.5 || (summary24h?.rainMm ?? 0) >= 80) {
    waterStatus = 'saturated'
    waterLabel = lang === 'hi' ? 'अत्यधिक / जलभराव' : lang === 'hinglish' ? 'High / Saturated' : 'High / Saturated'
    waterTone = 'orange'
    waterDesc = lang === 'hi' ? 'निचले खेतों में जलभराव की संभावना' : 'Standing water risk on low plots'
  } else if (mm24 >= 25) {
    waterStatus = 'high'
    waterLabel = lang === 'hi' ? 'भरपूर' : lang === 'hinglish' ? 'High' : 'High'
    waterTone = 'green'
    waterDesc = lang === 'hi' ? 'हालिया वर्षा से नमी भरपूर' : 'Well hydrated from recent rain'
  } else if (temp >= 36 && mm24 < 2) {
    waterStatus = 'deficit'
    waterLabel = lang === 'hi' ? 'कमी' : lang === 'hinglish' ? 'Deficit' : 'Deficit'
    waterTone = 'yellow'
    waterDesc = lang === 'hi' ? 'तेज़ धूप के कारण नमी में गिरावट' : 'Soil drying rapidly under high heat'
  }

  // 1.2 Rain Impact
  let rainImpact = 'none'
  let rainLabel = lang === 'hi' ? 'कोई नहीं' : lang === 'hinglish' ? 'No Rain' : 'No Rain'
  let rainTone = 'green'
  let rainDesc = lang === 'hi' ? 'शुष्क मौसम की स्थिति' : 'Dry conditions prevail'

  if (mm24 >= 115.6) {
    rainImpact = 'excessive'
    rainLabel = lang === 'hi' ? 'अत्यंत भारी वर्षा' : lang === 'hinglish' ? 'Excessive' : 'Excessive Rain'
    rainTone = 'red'
    rainDesc = lang === 'hi' ? 'खेतों में जल निकासी आवश्यक' : 'Drainage required immediately'
  } else if (mm24 >= 64.5) {
    rainImpact = 'heavy'
    rainLabel = lang === 'hi' ? 'भारी वर्षा' : lang === 'hinglish' ? 'Heavy Rain' : 'Heavy Rain'
    rainTone = 'orange'
    rainDesc = lang === 'hi' ? 'कटी फ़सल ढकें और सुरक्षा करें' : 'Cover produce, hold irrigation'
  } else if (mm24 >= 10 || rainProb >= 0.6) {
    rainImpact = 'beneficial'
    rainLabel = lang === 'hi' ? 'लाभकारी वर्षा' : lang === 'hinglish' ? 'Beneficial Rain' : 'Beneficial Rain'
    rainTone = 'green'
    rainDesc = lang === 'hi' ? 'फ़सलों के लिए अनुकूल वर्षा' : 'Beneficial moisture for crops'
  } else if (rainProb >= 0.3) {
    rainImpact = 'possible'
    rainLabel = lang === 'hi' ? 'संभावित' : lang === 'hinglish' ? 'Showers Possible' : 'Showers Possible'
    rainTone = 'yellow'
    rainDesc = lang === 'hi' ? 'हल्की बौछारों का अनुमान' : 'Scattered light showers'
  }

  // 1.3 Irrigation Guidance
  let irrigationStatus = 'not_needed'
  let irrigationLabel = lang === 'hi' ? 'आवश्यक नहीं' : lang === 'hinglish' ? 'Not Needed' : 'Not Needed'
  let irrigationTone = 'green'
  let irrigationAction = lang === 'hi' ? 'बारिश के पानी से पूर्ति होगी' : 'Recent/expected rain is sufficient'

  if (mm24 >= 25 || rainProb >= 0.6) {
    irrigationStatus = 'hold'
    irrigationLabel = lang === 'hi' ? 'स्थगित रखें' : lang === 'hinglish' ? 'Hold Off' : 'Hold Off'
    irrigationTone = 'yellow'
    irrigationAction = lang === 'hi' ? 'बारिश आने वाली है, पानी न लगाएँ' : 'Rain expected, save water and power'
  } else if (temp >= 35 && mm24 < 3) {
    irrigationStatus = 'recommended'
    irrigationLabel = lang === 'hi' ? 'सिंचाई अनुशंसित' : lang === 'hinglish' ? 'Irrigate Now' : 'Recommended'
    irrigationTone = 'green'
    irrigationAction = lang === 'hi' ? 'शाम के समय सिंचाई करना उचित' : 'Irrigate during cooler evening hours'
  } else {
    irrigationStatus = 'check'
    irrigationLabel = lang === 'hi' ? 'नमी जाँचें' : lang === 'hinglish' ? 'Check Soil' : 'Check Soil'
    irrigationTone = 'yellow'
    irrigationAction = lang === 'hi' ? 'जड़ के पास नमी देखकर निर्णय लें' : 'Check moisture at 10cm depth before watering'
  }

  // 1.4 Spray Window Suitability
  let sprayStatus = 'optimal'
  let sprayLabel = lang === 'hi' ? 'अनुकूल समय' : lang === 'hinglish' ? 'Window Open' : 'Ideal Window'
  let sprayTone = 'green'
  let sprayDesc = lang === 'hi' ? 'हवा शांत है (<20 किमी/घं) और बारिश नहीं है' : 'Winds calm (<20 km/h) with zero rain risk'

  if (mm24 >= 10 || rainProb >= 0.5) {
    sprayStatus = 'rain_delay'
    sprayLabel = lang === 'hi' ? 'छिड़काव टालें (बारिश)' : lang === 'hinglish' ? 'Rain Delay' : 'Rain Delay'
    sprayTone = 'orange'
    sprayDesc = lang === 'hi' ? 'बारिश से दवा धुलने का खतरा' : 'Washout risk from upcoming precipitation'
  } else if (wind >= 20) {
    sprayStatus = 'windy'
    sprayLabel = lang === 'hi' ? 'हवा तेज़ है' : lang === 'hinglish' ? 'Too Windy' : 'Too Windy'
    sprayTone = 'yellow'
    sprayDesc = lang === 'hi' ? `हवा ${Math.round(wind)} किमी/घंटा — दवा उड़ने का खतरा` : `Winds ${Math.round(wind)} km/h exceed 20 km/h drift threshold`
  } else if (temp >= 35) {
    sprayStatus = 'heat_delay'
    sprayLabel = lang === 'hi' ? 'धूप में न करें' : lang === 'hinglish' ? 'Midday Heat' : 'Midday Heat'
    sprayTone = 'yellow'
    sprayDesc = lang === 'hi' ? 'सुबह 6-9 बजे या शाम 5 बजे के बाद करें' : 'Optimal spray time: early morning 06:00-09:00'
  }

  // 1.5 Thermal Stress
  let stressStatus = 'optimal'
  let stressLabel = lang === 'hi' ? 'सामान्य' : lang === 'hinglish' ? 'Normal' : 'Normal'
  let stressTone = 'green'
  let stressDesc = lang === 'hi' ? 'तापमान फ़सलों के लिए अनुकूल' : 'Comfortable growth temperature'

  if (temp >= 40) {
    stressStatus = 'severe_heat'
    stressLabel = lang === 'hi' ? 'अत्यधिक लू / गर्मी' : lang === 'hinglish' ? 'Severe Heat' : 'Severe Heat Stress'
    stressTone = 'red'
    stressDesc = lang === 'hi' ? 'लू से बचाव हेतु हल्की सिंचाई करें' : 'Extreme heat stress. Provide light evening irrigation'
  } else if (temp >= 35) {
    stressStatus = 'mild_heat'
    stressLabel = lang === 'hi' ? 'गर्मी' : lang === 'hinglish' ? 'Heat Stress' : 'Heat Stress'
    stressTone = 'yellow'
    stressDesc = lang === 'hi' ? 'दोपहर में धूप तेज़ रहेगी' : 'Monitor leaf wilting during peak afternoon'
  } else if (temp <= 6) {
    stressStatus = 'frost'
    stressLabel = lang === 'hi' ? 'पाले का खतरा' : lang === 'hinglish' ? 'Frost Risk' : 'Frost Risk'
    stressTone = 'orange'
    stressDesc = lang === 'hi' ? 'पाले से बचाव के उपाय करें' : 'Near-freezing temperatures threaten tender crops'
  }

  // 1.6 Field Workability
  let workStatus = 'good'
  let workLabel = lang === 'hi' ? 'उत्तम' : lang === 'hinglish' ? 'Good' : 'Good'
  let workTone = 'green'
  let workDesc = lang === 'hi' ? 'ट्रैक्टर व जुताई के लिए अनुकूल' : 'Ideal for tractor and manual field operations'

  if (mm24 >= 40) {
    workStatus = 'mud'
    workLabel = lang === 'hi' ? 'कीचड़ / रुकावट' : lang === 'hinglish' ? 'Wet / Muddy' : 'Wet / Muddy'
    workTone = 'orange'
    workDesc = lang === 'hi' ? 'खेत में पानी भरने से जुताई संभव नहीं' : 'Heavy machinery may get stuck in saturated soil'
  } else if (mm24 >= 15) {
    workStatus = 'fair'
    workLabel = lang === 'hi' ? 'मध्यम' : lang === 'hinglish' ? 'Moderate' : 'Moderate'
    workTone = 'yellow'
    workDesc = lang === 'hi' ? 'सतह गीली है, हल्के कार्य करें' : 'Surface is damp; delay deep tilling'
  }

  // 1.7 Weather-Based Disease Risk
  let diseaseRisk = 'low'
  let diseaseLabel = lang === 'hi' ? 'कम' : lang === 'hinglish' ? 'Low' : 'Low'
  let diseaseTone = 'green'
  let diseaseDesc = lang === 'hi' ? 'मौसम कवक/फफूंद के अनुकूल नहीं है' : 'Dry conditions inhibit foliar pathogens'

  if (humidity >= 80 && (temp >= 20 && temp <= 32) && (mm24 >= 10 || rainProb >= 0.4)) {
    diseaseRisk = 'high'
    diseaseLabel = lang === 'hi' ? 'उच्च (सावधानी)' : lang === 'hinglish' ? 'High Risk' : 'High Risk'
    diseaseTone = 'orange'
    diseaseDesc = lang === 'hi'
      ? 'उच्च नमी (>80%) और वर्षा कवक रोगों (ब्लाइट/रस्ट) के प्रसार के अनुकूल है'
      : 'High humidity (>80%) + warm rain accelerates fungal spore germination'
  } else if (humidity >= 70 && (mm24 >= 5 || rainProb >= 0.3)) {
    diseaseRisk = 'moderate'
    diseaseLabel = lang === 'hi' ? 'मध्यम' : lang === 'hinglish' ? 'Moderate' : 'Moderate'
    diseaseTone = 'yellow'
    diseaseDesc = lang === 'hi' ? 'नमी से पत्तियों पर धब्बों की निगरानी करें' : 'Elevated humidity may trigger leaf spots'
  }

  // -------------------------------------------------------------------------
  // 2. Overall Farm Condition Summary
  // -------------------------------------------------------------------------
  let overallCondition = 'good'
  let conditionLabel = lang === 'hi' ? 'उत्तम (Good)' : 'Good'
  let conditionTone = 'green'
  let headline = lang === 'hi'
    ? 'खेत की समग्र स्थिति अनुकूल और सुरक्षित है।'
    : lang === 'hinglish'
      ? 'Khet ki overall condition acchi aur safe hai.'
      : 'Farm condition is healthy and in optimal range.'

  if (warnings.length > 0 || mm24 >= 115.6 || temp >= 40) {
    overallCondition = 'critical'
    conditionLabel = lang === 'hi' ? 'चेतावनी (Alert)' : 'Action Needed'
    conditionTone = 'red'
    headline = lang === 'hi'
      ? 'मौसम चेतावनी या अत्यधिक वर्षा के कारण सुरक्षात्मक कदम उठाएँ।'
      : lang === 'hinglish'
        ? 'Mausam alert ya heavy rain ke kaaran precautions zaroori hain.'
        : 'Active weather hazard requires immediate farm precautions.'
  } else if (diseaseRisk === 'high' || sprayStatus === 'rain_delay' || waterStatus === 'saturated') {
    overallCondition = 'attention'
    conditionLabel = lang === 'hi' ? 'ध्यान दें (Attention)' : 'Attention'
    conditionTone = 'yellow'
    headline = lang === 'hi'
      ? 'नमी और वर्षा के कारण फ़सल रोग जोखिम और जल निकासी पर ध्यान दें।'
      : lang === 'hinglish'
        ? 'Nami aur barish ki wajah se fasal bimari aur jal nikasi par dhyan dein.'
        : 'High humidity and rainfall require disease scouting and drainage checks.'
  }

  // -------------------------------------------------------------------------
  // 3. Intelligent Photo Request Trigger Logic
  // -------------------------------------------------------------------------
  let photoRecommended = false
  let photoUrgency = 'routine'
  let photoTitle = ''
  let photoReason = ''

  const daysSinceLastObs = lastObs ? daysSince(lastObs.at) : 999

  if (diseaseRisk === 'high') {
    photoRecommended = true
    photoUrgency = 'recommended'
    photoTitle = lang === 'hi' ? '📸 फ़सल पत्ती जाँच अनुशंसित' : '📸 Crop Foliage Check Recommended'
    photoReason = lang === 'hi'
      ? `उच्च नमी (${humidity}%) और ${Math.round(mm24)} मिमी वर्षा के बाद कवक रोग का जोखिम बढ़ गया है। पत्ती की ताज़ा फ़ोटो लेकर जाँचें।`
      : lang === 'hinglish'
        ? `High humidity (${humidity}%) aur ${Math.round(mm24)}mm barish ke baad fungal disease risk badh gaya hai. Photo lekar check karein.`
        : `Recent rainfall (${Math.round(mm24)} mm) and ${humidity}% humidity create ideal conditions for foliar pathogens. Take a photo to verify.`
  } else if (mm24 >= 40) {
    photoRecommended = true
    photoUrgency = 'recommended'
    photoTitle = lang === 'hi' ? '📸 भारी वर्षा बाद खेत जाँच' : '📸 Post-Rain Field Verification'
    photoReason = lang === 'hi'
      ? 'भारी वर्षा के बाद खेत में जलभराव और मिट्टी की स्थिति देखने के लिए फ़ोटो स्कैन करें।'
      : 'Verify soil saturation and drainage status with a fresh soil/crop photo.'
  } else if (lastObs && lastObs.prediction && !/healthy/i.test(lastObs.prediction) && daysSinceLastObs >= 3) {
    photoRecommended = true
    photoUrgency = 'recommended'
    photoTitle = lang === 'hi' ? '📸 रोग सुधार फ़ॉलो-अप' : '📸 Disease Follow-Up Scan'
    photoReason = lang === 'hi'
      ? `पिछली जाँच में (${lastObs.prediction}) पाया गया था। 3 दिन बाद सुधार देखने के लिए नया स्कैन लें।`
      : `Previous scan detected ${lastObs.prediction}. Take a follow-up photo to track recovery progress.`
  } else if (daysSinceLastObs >= 7) {
    photoRecommended = true
    photoUrgency = 'routine'
    photoTitle = lang === 'hi' ? '📸 नियमित फ़सल स्वास्थ्य जाँच' : '📸 Routine Field Check'
    photoReason = lang === 'hi'
      ? 'पिछले स्कैन को 7 दिन हो चुके हैं। फ़सल विकास का नया फोटो रिकॉर्ड जोड़ें।'
      : '7 days since your last observation. Capture a new image to update your farm timeline.'
  }

  // -------------------------------------------------------------------------
  // 4. Farm Memory & Timeline Stream
  // -------------------------------------------------------------------------
  const timeline = []

  // Add weather event entries
  if (mm24 >= 5) {
    timeline.push({
      id: 'rain-event',
      type: 'weather',
      icon: 'cloudRain',
      tone: mm24 >= 64.5 ? 'orange' : 'green',
      time: lang === 'hi' ? 'आज 24 घंटे में' : 'Today (24h Total)',
      title: lang === 'hi' ? `${Math.round(mm24)} मिमी वर्षा दर्ज` : `${Math.round(mm24)} mm Rainfall Observed`,
      desc: lang === 'hi'
        ? `मिट्टी में नमी की स्थिति बदलकर '${waterLabel}' हुई।`
        : `Soil water condition updated to '${waterLabel}'.`,
    })
  }

  if (temp >= 38) {
    timeline.push({
      id: 'heat-event',
      type: 'weather',
      icon: 'sun',
      tone: 'orange',
      time: lang === 'hi' ? 'आज दोपहर' : 'Today (Midday)',
      title: lang === 'hi' ? `तापमान ${Math.round(temp)} °C पहुँचा` : `Peak Heat ${Math.round(temp)} °C`,
      desc: lang === 'hi' ? 'लू का हल्का असर — शाम को सिंचाई का सुझाव।' : 'Thermal stress active. Light evening irrigation advised.',
    })
  }

  // Add farmer photo observations
  observations.slice(0, 5).forEach((obs) => {
    const isSoil = obs.mode === 'soil'
    timeline.push({
      id: obs.id,
      type: 'observation',
      icon: isSoil ? 'flask' : 'leaf',
      tone: isSoil ? 'accent' : /healthy|normal/i.test(obs.prediction) ? 'green' : 'orange',
      time: new Date(obs.at).toLocaleString(lang === 'hi' ? 'hi-IN' : 'en-IN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      title: isSoil
        ? (lang === 'hi' ? `मिट्टी परीक्षण: ${obs.prediction}` : `Soil Check: ${obs.prediction}`)
        : (lang === 'hi' ? `क्रॉप डॉक्टर स्कैन: ${obs.prediction}` : `Crop Doctor: ${obs.prediction}`),
      desc: lang === 'hi'
        ? `विश्वास स्तर: ${Math.round((obs.confidence || 0) * 100)}% · कैमरा अवलोकन दर्ज`
        : `Confidence: ${Math.round((obs.confidence || 0) * 100)}% · Ground-truth photo logged`,
    })
  })

  // Sort timeline chronologically (newest first)
  timeline.sort((a, b) => (a.id === 'rain-event' ? -1 : 1))

  // -------------------------------------------------------------------------
  // 5. Visual Comparison & Progress (Image-to-Image Tracking)
  // -------------------------------------------------------------------------
  let comparison = null
  const leafScans = observations.filter((o) => o.mode === 'leaf')
  if (leafScans.length >= 2) {
    const currentScan = leafScans[0]
    const previousScan = leafScans[1]
    const isSame = currentScan.prediction === previousScan.prediction
    comparison = {
      current: currentScan,
      previous: previousScan,
      daysApart: daysSince(previousScan.at) - daysSince(currentScan.at),
      insight: isSame
        ? (lang === 'hi'
            ? `फ़सल की स्थिति '${currentScan.prediction}' पर स्थिर है।`
            : `Foliage condition is consistent at '${currentScan.prediction}'.`)
        : (lang === 'hi'
            ? `परिवर्तन दर्ज: पहले '${previousScan.prediction}' था, अब '${currentScan.prediction}' है।`
            : `Foliage change detected: Shifted from '${previousScan.prediction}' to '${currentScan.prediction}'.`),
      weatherCorrelation: mm24 >= 15 || humidity >= 75
        ? (lang === 'hi'
            ? `हालिया वर्षा (${Math.round(mm24)} मिमी) और नमी (${humidity}%) ने इस स्थिति को प्रभावित किया है।`
            : `Recent precipitation (${Math.round(mm24)} mm) and humidity (${humidity}%) correlated with this shift.`)
        : null,
    }
  }

  // -------------------------------------------------------------------------
  // 6. Actionable Today's Farm Recommendations
  // -------------------------------------------------------------------------
  const actionsList = []
  if (sprayStatus === 'optimal') {
    actionsList.push({
      text: lang === 'hi' ? 'कीटनाशक/दवा छिड़काव का उत्तम समय' : 'Spray window is open and safe',
      why: sprayDesc,
    })
  } else {
    actionsList.push({
      text: sprayLabel,
      why: sprayDesc,
    })
  }

  if (irrigationStatus === 'hold') {
    actionsList.push({
      text: lang === 'hi' ? 'सिंचाई रोके रखें' : 'Hold off on irrigation',
      why: irrigationAction,
    })
  } else if (irrigationStatus === 'recommended') {
    actionsList.push({
      text: lang === 'hi' ? 'शाम को सिंचाई करें' : 'Irrigate during evening',
      why: irrigationAction,
    })
  }

  if (diseaseRisk === 'high') {
    actionsList.push({
      text: lang === 'hi' ? 'कवक रोग की रोकथाम हेतु खेत का मुआयना करें' : 'Scout foliage for fungal infection',
      why: diseaseDesc,
    })
  }

  return {
    overall: {
      status: overallCondition,
      label: conditionLabel,
      tone: conditionTone,
      headline,
    },
    matrix: [
      {
        key: 'water',
        title: lang === 'hi' ? '💧 जल व नमी (Water)' : '💧 Water Status',
        value: waterLabel,
        desc: waterDesc,
        tone: waterTone,
      },
      {
        key: 'rain',
        title: lang === 'hi' ? '🌧️ वर्षा प्रभाव (Rain)' : '🌧️ Rain Impact',
        value: rainLabel,
        desc: rainDesc,
        tone: rainTone,
      },
      {
        key: 'spray',
        title: lang === 'hi' ? '🧪 छिड़काव (Spray)' : '🧪 Spray Window',
        value: sprayLabel,
        desc: sprayDesc,
        tone: sprayTone,
      },
      {
        key: 'disease',
        title: lang === 'hi' ? '🦠 रोग जोखिम (Disease)' : '🦠 Disease Risk',
        value: diseaseLabel,
        desc: diseaseDesc,
        tone: diseaseTone,
      },
      {
        key: 'work',
        title: lang === 'hi' ? '🚜 जुताई/कार्य (Work)' : '🚜 Field Workability',
        value: workLabel,
        desc: workDesc,
        tone: workTone,
      },
      {
        key: 'stress',
        title: lang === 'hi' ? '🌡️ ताप तनाव (Stress)' : '🌡️ Thermal Stress',
        value: stressLabel,
        desc: stressDesc,
        tone: stressTone,
      },
    ],
    photoRequest: {
      recommended: photoRecommended,
      urgency: photoUrgency,
      title: photoTitle,
      reason: photoReason,
    },
    timeline,
    comparison,
    actions: actionsList,
    cropStage,
  }
}

export default evaluateFarmIntelligence
