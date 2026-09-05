/**
 * Agronomic Growth Stage Models for Major Indian Crops.
 * Based on ICAR (Indian Council of Agricultural Research) & IMD Agrometeorological guidelines.
 */

export const CROP_DATABASE = {
  wheat: {
    key: 'wheat',
    name: 'Wheat (गेहूँ)',
    nameHi: 'गेहूँ',
    season: 'Rabi',
    totalDays: 135,
    stages: [
      {
        key: 'germination',
        label: 'Germination & Seedling',
        labelHi: 'अंकुरण एवं प्रारंभिक अवस्था',
        startDay: 0,
        endDay: 18,
        irrigationNeed: 'Light pre-sowing moisture',
        irrigationNeedHi: 'बुवाई पूर्व पलेवा / हल्की नमी',
        criticalIrrigation: false,
        tasks: [
          'Apply Basal Dose: DAP (50 kg/acre) + MOP (20 kg/acre) at sowing.',
          'Ensure seed treatment with Trichoderma or Carboxin before sowing.',
          'Maintain 4-5 cm depth for uniform seedling emergence.',
        ],
        tasksHi: [
          'बुवाई के समय बेसल खुराक: डीएपी (50 किग्रा/एकड़) + पोटाश (20 किग्रा/एकड़) दें।',
          'बीजोपचार ट्राइकोडर्मा या थीरम से अवश्य करें।',
          'समान अंकुरण के लिए बीज 4-5 सेमी गहराई पर बोएं।',
        ],
        weatherSensitivity: 'Avoid waterlogging; cool temperature (18-22°C) is ideal for germination.',
        weatherSensitivityHi: 'जलभराव से बचें; 18-22°C का तापमान अंकुरण के लिए सर्वोत्तम है।',
      },
      {
        key: 'cri',
        label: 'Crown Root Initiation (CRI)',
        labelHi: 'ताज जड़ फुटाव अवस्था (CRI)',
        startDay: 19,
        endDay: 35,
        irrigationNeed: 'CRITICAL — First Irrigation Window',
        irrigationNeedHi: 'अति महत्वपूर्ण — पहली सिंचाई का समय',
        criticalIrrigation: true,
        tasks: [
          'Apply 1st Irrigation strictly at 21–25 DAS (Crown Root Stage).',
          'Apply 1st Urea top-dressing (35 kg/acre) after irrigation when soil is workable.',
          'Perform first weeding or apply recommended post-emergence herbicide if weeds present.',
        ],
        tasksHi: [
          '21-25 दिन पर पहली सिंचाई अवश्य करें — यह उपज के लिए सबसे महत्वपूर्ण है।',
          'सिंचाई के बाद ओट आने पर पहली यूरिया टॉप ड्रेसिंग (35 किग्रा/एकड़) दें।',
          'खरपतवार नियंत्रण के लिए पहली निराई-गुड़ाई करें।',
        ],
        weatherSensitivity: 'Delay irrigation if heavy rainfall (>15 mm) is forecast to prevent root suffocation.',
        weatherSensitivityHi: 'यदि 15 मिमी से अधिक वर्षा का अनुमान हो तो सिंचाई टालें।',
      },
      {
        key: 'tillering',
        label: 'Tillering & Jointing',
        labelHi: 'कल्ले निकलना एवं गांठ बनना (Tillering)',
        startDay: 36,
        endDay: 65,
        irrigationNeed: 'Important — 2nd Irrigation',
        irrigationNeedHi: 'महत्वपूर्ण — दूसरी सिंचाई',
        criticalIrrigation: true,
        tasks: [
          'Apply 2nd irrigation at 40-45 DAS for maximum tiller formation.',
          'Apply Zinc Sulphate spray (0.5% + 2.5% urea) if leaf yellowing/chlorosis appears.',
          'Scout for early signs of yellow rust (पीला रतुआ) on lower leaves.',
        ],
        tasksHi: [
          '40-45 दिन पर अधिकतम कल्ले निकलने के लिए दूसरी सिंचाई करें।',
          'पत्तियों में पीलापन दिखने पर जिंक सल्फेट (0.5%) + यूरिया का छिड़काव करें।',
          'पीला रतुआ के शुरुआती लक्षणों की निगरानी करें।',
        ],
        weatherSensitivity: 'High humidity (>85%) and moderate winds favour foliar fungal rust spores.',
        weatherSensitivityHi: 'उच्च आर्द्रता और तेज हवाएं फफूंद रतुआ रोग को बढ़ावा देती हैं।',
      },
      {
        key: 'booting',
        label: 'Booting & Heading (Ear emergence)',
        labelHi: 'बालियाँ निकलना (Booting / Heading)',
        startDay: 66,
        endDay: 85,
        irrigationNeed: 'Critical — 3rd Irrigation',
        irrigationNeedHi: 'अति महत्वपूर्ण — तीसरी सिंचाई',
        criticalIrrigation: true,
        tasks: [
          'Apply 3rd irrigation at late jointing / boot stage (65-70 DAS).',
          'Avoid heavy irrigation during strong winds (>20 km/h) to prevent crop lodging (गिरना).',
          'Foliar spray of 13-0-45 (Potassium Nitrate 1%) for stronger ear heads.',
        ],
        tasksHi: [
          '65-70 दिन पर बालियाँ निकलने से पूर्व तीसरी सिंचाई करें।',
          'तेज़ हवाओं (>20 किमी/घंटा) के दौरान सिंचाई न करें ताकि फसल गिरे नहीं।',
          'मजबूत बालियों के लिए 13:0:45 (पोटेशियम नाइट्रेट 1%) का छिड़काव करें।',
        ],
        weatherSensitivity: 'Lodging risk is high if irrigated during squally winds or thunderstorms.',
        weatherSensitivityHi: 'तेज़ हवाओं में सिंचाई करने से फसल गिरने का भारी खतरा रहता है।',
      },
      {
        key: 'flowering',
        label: 'Flowering & Anthesis',
        labelHi: 'फूल अवस्था (Flowering)',
        startDay: 86,
        endDay: 105,
        irrigationNeed: 'Moderate — 4th Irrigation at Milk stage',
        irrigationNeedHi: 'मध्यम — दूधिया अवस्था पर चौथी सिंचाई',
        criticalIrrigation: true,
        tasks: [
          'Maintain soil moisture during anthesis and early milk stage (85-90 DAS).',
          'Do not apply chemical sprays during active pollination morning hours.',
          'Monitor for aphid (माहू) infestation on earheads.',
        ],
        tasksHi: [
          'दूधिया अवस्था (85-90 दिन) में खेत में पर्याप्त नमी बनाए रखें।',
          'परागण के दौरान सुबह के समय कीटनाशक स्प्रे न करें।',
          'बालियों पर माहू (चेपा) कीट के प्रकोप की निगरानी रखें।',
        ],
        weatherSensitivity: 'Sudden high temperatures (>32°C) cause terminal heat stress and shrivelled grain.',
        weatherSensitivityHi: 'अचानक तापमान 32°C से ऊपर जाने पर दाना सिकुड़ने (हीट स्ट्रेस) का खतरा होता है।',
      },
      {
        key: 'maturity',
        label: 'Grain Hardening & Harvesting',
        labelHi: 'दाना पकना एवं कटाई (Maturity / Harvest)',
        startDay: 106,
        endDay: 135,
        irrigationNeed: 'Stop All Irrigation',
        irrigationNeedHi: 'सिंचाई पूर्णतः बंद रखें',
        criticalIrrigation: false,
        tasks: [
          'Completely stop irrigation 15 days before harvest.',
          'Harvest when grains become hard and moisture drops below 14%.',
          'Thresh and store grain in dry, pest-free moisture-proof containers.',
        ],
        tasksHi: [
          'कटाई से 15 दिन पूर्व सिंचाई पूरी तरह बंद कर दें।',
          'जब दाना सख्त हो जाए और नमी 14% से कम हो तब कटाई करें।',
          'कटी फसल को बारिश से बचाने के लिए तिरपाल से ढकें।',
        ],
        weatherSensitivity: 'Pre-harvest unseasonal showers cause grain discoloration and shattering.',
        weatherSensitivityHi: 'असामयिक वर्षा से दाने काले पड़ने और झड़ने का नुकसान होता है।',
      },
    ],
  },

  mustard: {
    key: 'mustard',
    name: 'Mustard / Sarson (सरसों)',
    nameHi: 'सरसों',
    season: 'Rabi',
    totalDays: 120,
    stages: [
      {
        key: 'seedling',
        label: 'Seedling & Emergence',
        labelHi: 'अंकुरण एवं प्रारंभिक अवस्था',
        startDay: 0,
        endDay: 20,
        irrigationNeed: 'Moisture conservation',
        irrigationNeedHi: 'नमी संरक्षण',
        criticalIrrigation: false,
        tasks: ['Thinning at 12–15 DAS to keep 10-15 cm spacing between plants.', 'Basal fertilizer with Single Super Phosphate (SSP) for Sulphur.'],
        tasksHi: ['12-15 दिन पर विरलीकरण (Thinning) करें ताकि पौधों की दूरी 10-15 सेमी रहे।', 'सल्फर की पूर्ति के लिए एसएसपी खाद का प्रयोग करें।'],
        weatherSensitivity: 'Protect from seedling rot if soil stays overly wet.',
        weatherSensitivityHi: 'अत्यधिक गीली मिट्टी में अंकुरण सड़न से बचाव रखें।',
      },
      {
        key: 'branching',
        label: 'Vegetative Branching',
        labelHi: 'शाखाएं निकलना (Branching)',
        startDay: 21,
        endDay: 45,
        irrigationNeed: 'CRITICAL — 1st Irrigation at 30-35 DAS',
        irrigationNeedHi: 'अति महत्वपूर्ण — 30-35 दिन पर पहली सिंचाई',
        criticalIrrigation: true,
        tasks: ['Apply first irrigation at pre-flowering stage (30-35 DAS).', 'Apply 1st dose of Urea (30 kg/acre) with irrigation.'],
        tasksHi: ['फूल आने से पहले 30-35 दिन पर पहली सिंचाई करें।', 'सिंचाई के साथ यूरिया (30 किग्रा/एकड़) का छिड़काव करें।'],
        weatherSensitivity: 'Cloudy weather with high humidity encourages White Rust (सफेद रोली) disease.',
        weatherSensitivityHi: 'बादल छाए रहने और नमी से सफेद रोली रोग का जोखिम बढ़ता है।',
      },
      {
        key: 'flowering',
        label: 'Flowering & Pod Formation (Siliqua)',
        labelHi: 'फूल एवं फली विकास (Siliqua)',
        startDay: 46,
        endDay: 85,
        irrigationNeed: 'Important — 2nd Irrigation at 60-65 DAS',
        irrigationNeedHi: 'महत्वपूर्ण — 60-65 दिन पर दूसरी सिंचाई',
        criticalIrrigation: true,
        tasks: ['Apply 2nd irrigation during pod formation if winter rains fail.', 'Scout for Aphids (माहू/चेपा) — install yellow sticky traps.'],
        tasksHi: ['फली बनते समय 60-65 दिन पर दूसरी सिंचाई करें।', 'माहू (चेपा) की रोकथाम के लिए पीले चिपचिपे कार्ड लगाएं।'],
        weatherSensitivity: 'Frost risk (पाला) if night temperatures drop below 4°C during flowering.',
        weatherSensitivityHi: 'रात का तापमान 4°C से नीचे जाने पर पाला पड़ने का खतरा रहता है।',
      },
      {
        key: 'maturity',
        label: 'Pod Filling & Maturity',
        labelHi: 'फली पकना एवं कटाई (Maturity)',
        startDay: 86,
        endDay: 120,
        irrigationNeed: 'No irrigation',
        irrigationNeedHi: 'सिंचाई बंद रखें',
        criticalIrrigation: false,
        tasks: ['Harvest in morning hours when 75% siliquae turn golden yellow to avoid pod shattering.'],
        tasksHi: ['जब 75% फलियां सुनहरी पीली हो जाएं तो फलियां चटकने से बचाने के लिए सुबह कटाई करें।'],
        weatherSensitivity: 'Hot winds cause early pod drying and lower oil content.',
        weatherSensitivityHi: 'गर्म हवाओं से दाना सूखने और तेल प्रतिशत घटने का खतरा होता है।',
      },
    ],
  },

  paddy: {
    key: 'paddy',
    name: 'Paddy / Rice (धान)',
    nameHi: 'धान',
    season: 'Kharif',
    totalDays: 125,
    stages: [
      {
        key: 'transplanting',
        label: 'Nursery & Transplanting',
        labelHi: 'नर्सरी एवं रोपाई',
        startDay: 0,
        endDay: 25,
        irrigationNeed: 'Continuous standing water (2-3 cm)',
        irrigationNeedHi: '2-3 सेमी जलभराव रखें',
        criticalIrrigation: true,
        tasks: ['Transplant 20-25 day old healthy seedlings (2-3 seedlings per hill).', 'Apply Basal NPK + Zinc Sulphate.'],
        tasksHi: ['20-25 दिन की स्वस्थ पौध की रोपाई करें।', 'बेसल खाद में डीएपी और जिंक सल्फेट दें।'],
        weatherSensitivity: 'Heavy rain after transplanting should be drained to avoid seedling submersion.',
        weatherSensitivityHi: 'रोपाई के तुरंत बाद भारी बारिश होने पर अतिरिक्त पानी निकालें।',
      },
      {
        key: 'tillering',
        label: 'Active Tillering & Panicle',
        labelHi: 'कल्ले फूटना एवं बालियां बनना',
        startDay: 26,
        endDay: 65,
        irrigationNeed: 'Intermittent flooding (alternate wetting & drying)',
        irrigationNeedHi: 'नमी बनाए रखें',
        criticalIrrigation: true,
        tasks: ['Split application of Urea at 21 and 42 DAS.', 'Scout for stem borer (तना छेदक) and leaf folder.'],
        tasksHi: ['21 और 42 दिन पर यूरिया की टॉप ड्रेसिंग दें।', 'तना छेदक कीट के लक्षणों की निगरानी करें।'],
        weatherSensitivity: 'High humidity (>90%) with stagnant water promotes Bacterial Leaf Blight.',
        weatherSensitivityHi: '90% से अधिक नमी में जीवाणु पत्ती झुलसा रोग तेजी से फैलता है।',
      },
      {
        key: 'flowering',
        label: 'Heading & Flowering',
        labelHi: 'फूल व दाना भराव अवस्था',
        startDay: 66,
        endDay: 95,
        irrigationNeed: 'Critical — keep 5 cm water level',
        irrigationNeedHi: 'अति महत्वपूर्ण — 5 सेमी पानी बनाए रखें',
        criticalIrrigation: true,
        tasks: ['Do not allow field to dry during flowering and milk stages.', 'Apply potassium spray for bold grains.'],
        tasksHi: ['फूल आने और दूधिया अवस्था में खेत को सूखने न दें।', 'मोटे दाने के लिए पोटाश का छिड़काव करें।'],
        weatherSensitivity: 'Rain during peak flowering causes pollen wash-off and chaffy grains.',
        weatherSensitivityHi: 'फूल खिलने के समय बारिश से पराग धुल जाते हैं और दाने खोखले रह जाते हैं।',
      },
      {
        key: 'maturity',
        label: 'Ripening & Harvesting',
        labelHi: 'दाना पकना एवं कटाई',
        startDay: 96,
        endDay: 125,
        irrigationNeed: 'Drain field 10 days before harvest',
        irrigationNeedHi: 'कटाई से 10 दिन पूर्व पानी निकालें',
        criticalIrrigation: false,
        tasks: ['Drain all standing water 10 days before harvest for uniform ripening.'],
        tasksHi: ['समान रूप से फसल पकने के लिए 10 दिन पहले खेत का पानी निकाल दें।'],
        weatherSensitivity: 'Cyclonic rains / squalls cause heavy lodging losses.',
        weatherSensitivityHi: 'तेज आंधी-तूफान से पकी फसल गिरने का खतरा रहता है।',
      },
    ],
  },

  cotton: {
    key: 'cotton',
    name: 'Cotton (कपास)',
    nameHi: 'कपास',
    season: 'Kharif',
    totalDays: 160,
    stages: [
      {
        key: 'seedling',
        label: 'Emergence & Square Formation',
        labelHi: 'अंकुरण एवं डोडी निर्माण (Square)',
        startDay: 0,
        endDay: 45,
        irrigationNeed: 'Light irrigation',
        irrigationNeedHi: 'हल्की सिंचाई',
        criticalIrrigation: false,
        tasks: ['Thinning and gap filling within 15 DAS.', 'Spray Neem oil for whitefly and sucking pest management.'],
        tasksHi: ['15 दिन में विरलीकरण करें।', 'सफेद मक्खी की रोकथाम के लिए नीम के तेल का छिड़काव करें।'],
        weatherSensitivity: 'Excess rainfall in seedling stage causes damping-off and root rot.',
        weatherSensitivityHi: 'शुरुआत में अधिक बारिश से जड़ गलन रोग हो सकता है।',
      },
      {
        key: 'boll_formation',
        label: 'Flowering & Boll Development',
        labelHi: 'फूल एवं टिंडे का विकास (Boll formation)',
        startDay: 46,
        endDay: 115,
        irrigationNeed: 'CRITICAL — Regular moisture (every 12-15 days)',
        irrigationNeedHi: 'अति महत्वपूर्ण — 12-15 दिन के अंतराल पर सिंचाई',
        criticalIrrigation: true,
        tasks: ['Spray 1% Magnesium Sulphate + 1% Urea to prevent leaf reddening (लाल पत्ती रोग).', 'Scout for Pink Bollworm (गुलाबी सुंडी).'],
        tasksHi: ['पत्तियों को लाल होने से बचाने के लिए मैग्नीशियम सल्फेट (1%) का छिड़काव करें।', 'गुलाबी सुंडी के प्रकोप की जांच करें।'],
        weatherSensitivity: 'Water stress or sudden waterlogging causes square and boll dropping.',
        weatherSensitivityHi: 'नमी की कमी या जलभराव से फूल और टिंडे झड़ने लगते हैं।',
      },
      {
        key: 'maturity',
        label: 'Boll Bursting & Picking',
        labelHi: 'टिंडे खिलना एवं चुनाई (Picking)',
        startDay: 116,
        endDay: 160,
        irrigationNeed: 'Stop irrigation',
        irrigationNeedHi: 'सिंचाई बंद रखें',
        criticalIrrigation: false,
        tasks: ['Pick clean cotton in dry sunny afternoons.', 'Keep picked cotton in dry moisture-free storage.'],
        tasksHi: ['धूप वाले दिनों में साफ कपास की चुनाई करें।', 'कपास को सूखे कमरे में रखें।'],
        weatherSensitivity: 'Rains during boll opening damage lint quality and cause fiber staining.',
        weatherSensitivityHi: 'टिंडे खिलने के समय बारिश से रुई की गुणवत्ता खराब हो जाती है।',
      },
    ],
  },

  bajra: {
    key: 'bajra',
    name: 'Bajra / Pearl Millet (बाजरा)',
    nameHi: 'बाजरा',
    season: 'Kharif',
    totalDays: 85,
    stages: [
      {
        key: 'vegetative',
        label: 'Seedling & Tillering',
        labelHi: 'अंकुरण एवं कल्ले फूटना',
        startDay: 0,
        endDay: 30,
        irrigationNeed: 'Rain-fed / 1 light irrigation if prolonged dry spell',
        irrigationNeedHi: 'वर्षा आधारित / लंबा सूखा होने पर 1 सिंचाई',
        criticalIrrigation: false,
        tasks: ['Gap filling and weeding at 15–20 DAS.', 'Apply Urea top dressing after rain.'],
        tasksHi: ['15-20 दिन पर निराई-गुड़ाई करें।', 'बारिश के बाद यूरिया की पहली खुराक दें।'],
        weatherSensitivity: 'Highly drought-tolerant, but sensitive to water stagnation.',
        weatherSensitivityHi: 'सूखा सहनशील है परंतु खेत में पानी खड़ा न रहने दें।',
      },
      {
        key: 'flowering',
        label: 'Booting & Flowering (Earhead)',
        labelHi: 'सिट्टा निकलना एवं फूल अवस्था',
        startDay: 31,
        endDay: 60,
        irrigationNeed: 'CRITICAL if dry spell persists',
        irrigationNeedHi: 'सूखे की स्थिति में अति आवश्यक',
        criticalIrrigation: true,
        tasks: ['Protect crop moisture during earhead emergence.', 'Monitor for Ergot (अरगट) and Green Ear (जोगिया रोग).'],
        tasksHi: ['सिट्टा निकलते समय खेत में नमी रखें।', 'अरगट व जोगिया रोग के लक्षणों पर ध्यान दें।'],
        weatherSensitivity: 'Continuous humid cloudy weather during flowering causes Ergot fungal infection.',
        weatherSensitivityHi: 'फूल खिलने के समय लगातार बादल व नमी से अरगट (गोंदिया) रोग फैलता है।',
      },
      {
        key: 'maturity',
        label: 'Grain Filling & Harvesting',
        labelHi: 'दाना पकना एवं सिट्टा कटाई',
        startDay: 61,
        endDay: 85,
        irrigationNeed: 'No irrigation',
        irrigationNeedHi: 'सिंचाई बंद',
        criticalIrrigation: false,
        tasks: ['Harvest earheads when grains are hard and dry in sun before threshing.'],
        tasksHi: ['सिट्टे पकने पर कटाई कर धूप में अच्छी तरह सुखाकर गहाई करें।'],
        weatherSensitivity: 'Protect harvested earheads from unexpected rain showers.',
        weatherSensitivityHi: 'कटे हुए सिट्टों को बारिश से बचाएं।',
      },
    ],
  },
}

/** Resolves crop model from a free-text name */
export function getCropProfile(cropName = '') {
  const norm = String(cropName).toLowerCase()
  if (/wheat|gehu|गेहूं|गेहूँ/i.test(norm)) return CROP_DATABASE.wheat
  if (/mustard|sarson|सरसों|rai/i.test(norm)) return CROP_DATABASE.mustard
  if (/paddy|rice|dhan|धान|चावल/i.test(norm)) return CROP_DATABASE.paddy
  if (/cotton|kapas|कपास/i.test(norm)) return CROP_DATABASE.cotton
  if (/bajra|millet|बाजरा/i.test(norm)) return CROP_DATABASE.bajra
  // Default to Wheat rabi model
  return CROP_DATABASE.wheat
}

/** Calculates current stage, progress %, and predicted dates from sowing date */
export function calculateCropLifecycle(cropProfile, sownDateStr) {
  if (!sownDateStr) {
    return {
      hasSownDate: false,
      daysAfterSowing: null,
      currentStageIndex: 0,
      currentStage: cropProfile.stages[0],
      progressPercent: 0,
      expectedHarvestDate: null,
      stagesWithDates: cropProfile.stages.map((s, i) => ({
        ...s,
        index: i,
        status: i === 0 ? 'planning' : 'upcoming',
        dateRangeStr: `${s.startDay}–${s.endDay} DAS`,
      })),
    }
  }

  const sownTimestamp = Date.parse(sownDateStr)
  if (Number.isNaN(sownTimestamp)) {
    return calculateCropLifecycle(cropProfile, null)
  }

  const daysAfterSowing = Math.max(0, Math.round((Date.now() - sownTimestamp) / 86400000))
  const totalDays = cropProfile.totalDays
  const progressPercent = Math.min(100, Math.round((daysAfterSowing / totalDays) * 100))

  const harvestDateObj = new Date(sownTimestamp + totalDays * 86400000)
  const expectedHarvestDate = harvestDateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

  let currentStageIndex = cropProfile.stages.findIndex(
    (s) => daysAfterSowing >= s.startDay && daysAfterSowing <= s.endDay
  )
  if (currentStageIndex === -1) {
    currentStageIndex = daysAfterSowing > totalDays ? cropProfile.stages.length - 1 : 0
  }

  const currentStage = cropProfile.stages[currentStageIndex]

  const stagesWithDates = cropProfile.stages.map((st, idx) => {
    const startDate = new Date(sownTimestamp + st.startDay * 86400000)
    const endDate = new Date(sownTimestamp + st.endDay * 86400000)
    const startStr = startDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    const endStr = endDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })

    let status = 'upcoming'
    if (idx < currentStageIndex) status = 'completed'
    else if (idx === currentStageIndex) status = 'active'

    return {
      ...st,
      index: idx,
      status,
      startDate: startStr,
      endDate: endStr,
      dateRangeStr: `${startStr} – ${endStr} (${st.startDay}–${st.endDay} DAS)`,
    }
  })

  return {
    hasSownDate: true,
    daysAfterSowing,
    currentStageIndex,
    currentStage,
    progressPercent,
    expectedHarvestDate,
    stagesWithDates,
  }
}

export default { CROP_DATABASE, getCropProfile, calculateCropLifecycle }
