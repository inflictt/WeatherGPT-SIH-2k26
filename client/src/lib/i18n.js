/**
 * Interface strings and translations for English, Hindi, and Hinglish.
 * Provides a comprehensive dictionary across all screens, tabs, brief generator,
 * weather metrics, alerts, farm connect, AI chat, and settings.
 */

export const LANGS = ['en', 'hi', 'hinglish']
export const FALLBACK = 'en'

/**
 * BCP-47 tags for Web Speech. Hinglish speech is spoken in Hindi (hi-IN).
 */
export const SPEECH_LOCALE = { en: 'en-IN', hi: 'hi-IN', hinglish: 'hi-IN' }

const S = {
  // --- Navigation & Branding -------------------------------------------
  appName: { en: 'Aakrishi', hi: 'आकृषि', hinglish: 'Aakrishi' },
  appTagline: {
    en: 'Weather & Agricultural Intelligence Platform',
    hi: 'मौसम एवं कृषि आसूचना मंच',
    hinglish: 'Mausam aur Krishi Intelligence Platform',
  },
  tabToday: { en: 'Today', hi: 'आज', hinglish: 'Aaj' },
  tabForecast: { en: 'Forecast', hi: 'पूर्वानुमान', hinglish: 'Forecast' },
  tabAlerts: { en: 'Alerts', hi: 'चेतावनियाँ', hinglish: 'Alerts' },
  tabFarm: { en: 'My Farm', hi: 'मेरा खेत', hinglish: 'Mera Farm' },
  tabFarmShort: { en: 'Farm', hi: 'खेती', hinglish: 'Farm' },
  tabTasks: { en: 'Tasks', hi: 'कार्य', hinglish: 'Tasks' },
  tabTasksShort: { en: 'Tasks', hi: 'कार्य', hinglish: 'Tasks' },
  tabJournal: { en: 'Activities', hi: 'गतिविधियाँ', hinglish: 'Activities' },
  tabJournalShort: { en: 'Log', hi: 'लॉग', hinglish: 'Log' },
  tabInsights: { en: 'Insights', hi: 'विश्लेषण', hinglish: 'Insights' },
  tabInsightsShort: { en: 'Insights', hi: 'विश्लेषण', hinglish: 'Insights' },
  tabAkashvaani: { en: 'Akashvaani', hi: 'आकाशवाणी', hinglish: 'Akashvaani' },
  tabKrishivaani: { en: 'Krishivaani', hi: 'कृषिवाणी', hinglish: 'Krishivaani' },
  tabAskShortGeneral: { en: 'Akash', hi: 'आकाश', hinglish: 'Akash' },
  tabAskShortFarmer: { en: 'Krishi', hi: 'कृषि', hinglish: 'Krishi' },
  warningMap: { en: 'Warning map', hi: 'चेतावनी मानचित्र', hinglish: 'Warning map' },
  settings: { en: 'Settings', hi: 'सेटिंग्स', hinglish: 'Settings' },
  changeLocation: { en: 'Change location', hi: 'स्थान बदलें', hinglish: 'Location badlein' },
  searchPlaceholder: {
    en: 'Search village, district or city',
    hi: 'गाँव, ज़िला या शहर खोजें',
    hinglish: 'Gaon, zila ya shehar search karein',
  },
  bundledGazetteer: { en: 'Bundled gazetteer', hi: 'संबद्ध स्थान सूची', hinglish: 'Matched locations' },
  apiUnreachableSample: {
    en: 'Connecting to live services… showing offline intelligence.',
    hi: 'लाइव सेवाओं से संपर्क हो रहा है… ऑफ़लाइन आसूचना प्रदर्शित है।',
    hinglish: 'Live server se connect ho raha hai… offline intelligence dikhaya ja raha hai.',
  },
  noMatch: { en: 'No match found', hi: 'कोई परिणाम नहीं मिला', hinglish: 'Koi match nahi mila' },
  noMatchDetail: {
    en: 'Nothing bundled matches that. Connect the API for village-level search.',
    hi: 'कोई मिलान नहीं मिला। गाँव स्तर की खोज के लिए एपीआई कनेक्ट करें।',
    hinglish: 'Koi match nahi mila. Village-level search ke liye API connect karein.',
  },

  // --- Greetings & Times of Day ----------------------------------------
  goodMorning: { en: 'Good morning', hi: 'शुभ प्रभात', hinglish: 'Shubh prabhat' },
  goodAfternoon: { en: 'Good afternoon', hi: 'शुभ दोपहर', hinglish: 'Shubh dopahar' },
  goodEvening: { en: 'Good evening', hi: 'शुभ संध्या', hinglish: 'Shubh sandhya' },

  // --- Common Weather Metrics & Cards ----------------------------------
  rainChance: { en: 'Rain chance', hi: 'बारिश की संभावना', hinglish: 'Barish ka chance' },
  wind: { en: 'Wind', hi: 'हवा की गति', hinglish: 'Hawa ki speed' },
  humidity: { en: 'Humidity', hi: 'आर्द्रता / नमी', hinglish: 'Nami / Humidity' },
  visibility: { en: 'Visibility', hi: 'दृश्यता', hinglish: 'Visibility' },
  pressure: { en: 'Pressure', hi: 'वायुदाब', hinglish: 'Pressure' },
  feelsLike: { en: 'Feels like', hi: 'महसूस हो रहा', hinglish: 'Feels like' },
  uvIndex: { en: 'UV Index', hi: 'यूवी इंडेक्स', hinglish: 'UV Index' },
  rainfall: { en: 'Rainfall', hi: 'वर्षा', hinglish: 'Barish' },
  precipitation: { en: 'Precipitation', hi: 'वर्षापात', hinglish: 'Precipitation' },
  sunset: { en: 'Sunset', hi: 'सूर्यास्त', hinglish: 'Sooryast' },
  sunrise: { en: 'Sunrise', hi: 'सूर्योदय', hinglish: 'Sooryoday' },
  high: { en: 'High', hi: 'अधिकतम', hinglish: 'Zyada' },
  low: { en: 'Low', hi: 'न्यूनतम', hinglish: 'Kam' },
  chance: { en: 'Chance', hi: 'संभावना', hinglish: 'Sambhavna' },
  noneExpected: { en: 'None expected', hi: 'कोई संभावना नहीं', hinglish: 'Koi ummeed nahi' },
  expectedIn24h: { en: 'expected in 24 h', hi: '24 घंटे में संभावित', hinglish: '24 ghante mein expected' },
  in24h: { en: 'in 24 h', hi: '24 घंटे में', hinglish: '24 ghante mein' },
  winds: { en: 'winds', hi: 'हवाएँ', hinglish: 'hawayein' },

  // --- Weather Conditions ----------------------------------------------
  condMainlyClear: { en: 'Mainly clear', hi: 'मुख्यतः साफ', hinglish: 'Mainly clear' },
  condClearSky: { en: 'Clear sky', hi: 'साफ आसमान', hinglish: 'Saaf aasmaan' },
  condPartlyCloudy: { en: 'Partly cloudy', hi: 'आंशिक रूप से बादल', hinglish: 'Thode baadal' },
  condOvercast: { en: 'Overcast', hi: 'बादल छाए रहेंगे', hinglish: 'Baadal chhaaye rahenge' },
  condFog: { en: 'Fog / Mist', hi: 'कोहरा / धुंध', hinglish: 'Kohra / Dhundh' },
  condLightRain: { en: 'Light rain', hi: 'हल्की बारिश', hinglish: 'Halki barish' },
  condModerateRain: { en: 'Moderate rain', hi: 'मध्यम बारिश', hinglish: 'Madhyam barish' },
  condHeavyRain: { en: 'Heavy rain', hi: 'भारी बारिश', hinglish: 'Bhaari barish' },
  condVeryHeavyRain: { en: 'Very heavy rain', hi: 'अत्यंत भारी बारिश', hinglish: 'Bahut tez barish' },
  condThunderstorm: { en: 'Thunderstorm', hi: 'गरज-चमक के साथ बौछारें', hinglish: 'Garaj ke saath toofan' },
  condShowers: { en: 'Showers', hi: 'बौछारें', hinglish: 'Bauchharein' },
  condDrizzle: { en: 'Drizzle', hi: 'हल्की बूँदाबाँदी', hinglish: 'Boondabaandi' },
  condUnknown: { en: 'Current weather', hi: 'वर्तमान मौसम', hinglish: 'Mausam' },

  // --- Headlines & Brief Sentences -------------------------------------
  headExtremelyHeavy: { en: 'Extremely heavy rain is coming.', hi: 'अत्यंत भारी बारिश आने वाली है।', hinglish: 'Atyant bhaari barish aane wali hai.' },
  headVeryHeavy: { en: 'Very heavy rain is coming.', hi: 'बहुत भारी बारिश आने वाली है।', hinglish: 'Bahut bhaari barish aane wali hai.' },
  headHeavyRain: { en: 'Heavy rain is on the way.', hi: 'भारी बारिश का अनुमान है।', hinglish: 'Bhaari barish aane wali hai.' },
  headRainLikely: { en: 'Rain is likely today.', hi: 'आज बारिश होने की पूरी संभावना है।', hinglish: 'Aaj barish hone ki sambhavna hai.' },
  headSquallyWinds: { en: 'Squally winds today.', hi: 'आज तेज़ झक्कड़ हवाएँ चलेंगी।', hinglish: 'Aaj tez toofani hawayein chalengi.' },
  headDangerousHeat: { en: 'A dangerously hot day.', hi: 'आज अत्यधिक भीषण गर्मी रहेगी।', hinglish: 'Aaj bahut zyada garmi rahegi.' },
  headHotDry: { en: 'A hot, dry day.', hi: 'गर्म और शुष्क दिन।', hinglish: 'Garam aur dry din.' },
  headMixedShowers: { en: 'A mixed day — showers possible.', hi: 'मिला-जुला मौसम — बौछारें संभव हैं।', hinglish: 'Mila-jula mausam — bauchharein sambhav hain.' },
  headDryBright: { en: 'A dry, bright day.', hi: 'साफ, शुष्क एवं चमकदार दिन।', hinglish: 'Saaf aur dry din.' },
  headNoConditions: { en: "I don't have current conditions for this place.", hi: 'इस स्थान की वर्तमान स्थिति उपलब्ध नहीं है।', hinglish: 'Is jagah ka current data available nahi hai.' },
  subNoConditions: { en: 'Nothing here is estimated. Connect the API, or pick another location.', hi: 'यहाँ कुछ भी अनुमानित नहीं है। एपीआई जोड़ें या अन्य स्थान चुनें।', hinglish: 'Kuch bhi andaaze se nahi hai. API connect karein ya doosri jagah chunein.' },

  // --- Tail Statements (Farm vs General) --------------------------------
  tailHoldOffSpraying: { en: 'Hold off on spraying and irrigation.', hi: 'कीटनाशक छिड़काव व सिंचाई स्थगित रखें।', hinglish: 'Spray aur sinchai abhi rok dein.' },
  tailDelayIrrigation: { en: 'Delay irrigation and secure loose cover.', hi: 'सिंचाई टालें और कटी फ़सल सुरक्षित ढकें।', hinglish: 'Sinchai taalein aur fasal dhak dein.' },
  tailTooWindySpray: { en: 'Too windy to spray.', hi: 'हवा तेज़ है, छिड़काव न करें।', hinglish: 'Hawa tez hai, spray na karein.' },
  tailNarrowSprayWindow: { en: 'Narrow window for spraying.', hi: 'छिड़काव के लिए सीमित समय उपलब्ध है।', hinglish: 'Spray ke liye kam time window hai.' },
  tailGoodSprayWindow: { en: 'Good window for spraying.', hi: 'कीटनाशक छिड़काव के लिए अनुकूल समय है।', hinglish: 'Spray ke liye accha time hai.' },
  tailCheckIrrigation: { en: 'Irrigation may be worth checking.', hi: 'खेत में नमी की स्थिति जाँचें।', hinglish: 'Khet mein nami check karein.' },
  tailAvoidLowLying: { en: 'Avoid low-lying routes.', hi: 'जलभराव वाले निचले रास्तों से बचें।', hinglish: 'Pani bhare nichle raaston se bachein.' },
  tailTravelDisruption: { en: 'Expect travel disruption.', hi: 'सड़क यात्रा में रुकावट की संभावना है।', hinglish: 'Travel mein dikkat ho sakti hai.' },
  tailSecureLoose: { en: 'Secure anything loose outdoors.', hi: 'खुले में रखी वस्तुओं को सुरक्षित बाँधें।', hinglish: 'Khule mein rakhi cheezon ko baandh lein.' },
  tailStayOutHeat: { en: 'Stay out of the afternoon sun.', hi: 'दोपहर की कड़ी धूप में बाहर न निकलें।', hinglish: 'Dopahar ki tez dhoop se bachein.' },
  tailCarryUmbrella: { en: 'Carry an umbrella.', hi: 'बाहर जाते समय छाता साथ रखें।', hinglish: 'Bahar jaate waqt chhaata saath rakhein.' },
  tailGoodOutdoors: { en: 'Good day to be outdoors.', hi: 'बाहरी कार्यों के लिए अनुकूल दिन।', hinglish: 'Bahar ke kaamo ke liye accha din hai.' },

  // --- Action Recommendations -----------------------------------------
  actCoverProduce: { en: 'Cover harvested produce', hi: 'कटी हुई फ़सल को सुरक्षित ढकें', hinglish: 'Kati hui fasal ko dhak dein' },
  actCheckDrainage: { en: 'Check drainage on low-lying plots', hi: 'निचले खेतों में जल निकासी की व्यवस्था करें', hinglish: 'Nichle kheton mein jal nikasi check karein' },
  actSprayWindowOpen: { en: 'Spray window is open', hi: 'कीटनाशक छिड़काव का अनुकूल समय', hinglish: 'Spray window open hai' },
  actDoNotSpray: { en: 'Do not spray today', hi: 'आज कीटनाशक छिड़काव न करें', hinglish: 'Aaj spray mat karein' },
  actDelayIrrigation: { en: 'Delay irrigation', hi: 'सिंचाई स्थगित करें', hinglish: 'Sinchai taal dein' },
  actAvoidRoads: { en: 'Avoid low-lying roads', hi: 'निचली सड़कों पर जाने से बचें', hinglish: 'Nichli sadkon par jaane se bachein' },
  actSecureOutdoors: { en: 'Secure loose items outdoors', hi: 'बाहर रखी वस्तुओं को सुरक्षित करें', hinglish: 'Bahar rakhi cheezon ko baandh lein' },
  actMiddaySun: { en: 'Stay out of the midday sun', hi: 'दोपहर की धूप से बचें', hinglish: 'Dopahar ki dhoop se bachein' },

  // --- Today Screen Sections & Buttons ---------------------------------
  askAkashvaani: { en: 'Ask Akashvaani', hi: 'आकाशवाणी से पूछें', hinglish: 'Akashvaani se poochhein' },
  askKrishivaani: { en: 'Ask Krishivaani', hi: 'कृषिवाणी से पूछें', hinglish: 'Krishivaani se poochhein' },
  fullForecast: { en: 'Full forecast', hi: 'संपूर्ण पूर्वानुमान', hinglish: 'Pura forecast' },
  whatThisMeans: { en: 'What this means', hi: 'इसका क्या अर्थ है', hinglish: 'Iska kya matlab hai' },
  todaysActions: { en: "Today's actions", hi: 'आज के मुख्य कार्य', hinglish: 'Aaj ke zaroori kaam' },
  fromTodaysFigures: { en: 'from today’s figures', hi: 'आज के आँकड़ों पर आधारित', hinglish: 'aaj ke data par aadharit' },
  noActionsNeeded: {
    en: 'Nothing to plan around today — conditions are inside every safe threshold.',
    hi: 'आज किसी विशेष एहतियात की आवश्यकता नहीं है — मौसम सामान्य और सुरक्षित सीमा में है।',
    hinglish: 'Aaj koi special precaution ki zaroorat nahi hai — mausam safe limit mein hai.',
  },
  irrigationTitle: { en: 'Irrigation', hi: 'सिंचाई सलाह', hinglish: 'Sinchai guidance' },
  irrigationMeta: { en: 'Computed · not generated', hi: 'गणना आधारित · गैर-अनुमानित', hinglish: 'Computed data' },
  irrDoNotIrrigate: { en: 'Do not irrigate', hi: 'सिंचाई न करें', hinglish: 'Sinchai mat karein' },
  irrWait: { en: 'Wait', hi: 'प्रतीक्षा करें', hinglish: 'Wait karein' },
  irrigateNow: { en: 'Irrigate', hi: 'सिंचाई करें', hinglish: 'Sinchai karein' },
  irrCheckSoil: { en: 'Check the soil', hi: 'मिट्टी की नमी जाँचें', hinglish: 'Mitti ki nami check karein' },
  irrRainLimited: { en: 'Rain-limited', hi: 'वर्षा-सीमित', hinglish: 'Rain-limited' },
  irrRainBased: { en: 'Rainfall-based', hi: 'वर्षा-आधारित', hinglish: 'Rain-based' },
  irrConfidence: { en: 'Confidence', hi: 'विश्वसनीयता', hinglish: 'Confidence' },
  irrUsed: { en: 'Used', hi: 'प्रयुक्त इनपुट', hinglish: 'Used inputs' },
  irrNotUsed: { en: 'Not used', hi: 'अनुपलब्ध इनपुट', hinglish: 'Missing inputs' },
  irrDisclaimer: {
    en: 'Rainfall-based guidance only. Feel soil moisture at root depth before final decision.',
    hi: 'केवल वर्षा आधारित मार्गदर्शन। अंतिम निर्णय से पूर्व जड़ स्तर पर मिट्टी की नमी अवश्य जाँचें।',
    hinglish: 'Rainfall based guidance hai. Final decision se pehle mitti ki nami zaroor check karein.',
  },

  // --- Tiles & Status --------------------------------------------------
  tileWeather: { en: 'Weather', hi: 'मौसम', hinglish: 'Mausam' },
  tileRisk: { en: 'Risk', hi: 'जोखिम', hinglish: 'Risk' },
  tileFarmRisk: { en: 'Farm risk', hi: 'कृषि जोखिम', hinglish: 'Farm risk' },
  tileCropHealth: { en: 'Crop health', hi: 'फ़सल स्वास्थ्य', hinglish: 'Fasal health' },
  tileNotScanned: { en: 'Not scanned', hi: 'स्कैन नहीं किया गया', hinglish: 'Not scanned' },
  tileRunScan: { en: 'Run a scan in Crop Doctor', hi: 'क्रॉप डॉक्टर में पत्ती स्कैन करें', hinglish: 'Crop Doctor mein scan karein' },
  compositeRisk: { en: 'Composite risk', hi: 'समग्र जोखिम स्तर', hinglish: 'Overall risk score' },
  forecastConfidence: { en: 'Forecast confidence', hi: 'पूर्वानुमान विश्वसनीयता', hinglish: 'Forecast confidence' },
  modelSpread: { en: 'Model spread', hi: 'मौसम मॉडल तुलना', hinglish: 'Model comparison' },
  safetyFloorApplied: { en: 'Safety floor applied', hi: 'सुरक्षा स्तर लागू', hinglish: 'Safety floor active' },
  hoursAhead: { en: 'h ahead', hi: 'घंटे आगे', hinglish: 'hours aage' },
  farmConnectCardTitle: { en: 'Farm Connect', hi: 'फार्म कनेक्ट', hinglish: 'Farm Connect' },
  farmConnectCardSub: { en: 'Your plots, crops and scans', hi: 'आपके खेत, फ़सलें और रोग जाँच', hinglish: 'Aapke khet, fasal aur scans' },
  farmConnectCardDesc: {
    en: 'Soil check, Crop Doctor and the season planner live here.',
    hi: 'मिट्टी परीक्षण, फसल डॉक्टर और मौसमी योजनाकार यहाँ उपलब्ध हैं।',
    hinglish: 'Soil test, Crop Doctor aur planner yahan hain.',
  },

  // --- Forecast Screen -------------------------------------------------
  forecastTitle: { en: 'Forecast', hi: 'विस्तृत पूर्वानुमान', hinglish: 'Detailed Forecast' },
  next12Hours: { en: 'Next 12 hours', hi: 'अगले 12 घंटे', hinglish: 'Agle 12 ghante' },
  sevenDayForecast: { en: '7-day forecast', hi: '7 दिनों का पूर्वानुमान', hinglish: '7-din ka forecast' },
  imdRainfallBands: { en: 'IMD rainfall bands', hi: 'आईएमडी वर्षा श्रेणियाँ', hinglish: 'IMD rain categories' },
  twentyFourHourTotals: { en: '24-hour totals', hi: '24 घंटे का कुल योग', hinglish: '24 ghante ka total' },
  observedAgo: { en: 'Observed', hi: 'अपडेटेड', hinglish: 'Updated' },
  readFullInstruction: { en: 'Read full instruction', hi: 'पूरा निर्देश पढ़ें', hinglish: 'Poora instruction padhein' },
  dismiss: { en: 'Dismiss', hi: 'हटाएँ', hinglish: 'Dismiss' },
  none: { en: 'None', hi: 'कोई नहीं', hinglish: 'Kuch nahi' },

  // --- Alerts Screen ---------------------------------------------------
  warningsTitle: { en: 'Warnings', hi: 'आपदा एवं मौसम चेतावनियाँ', hinglish: 'Weather & Disaster Warnings' },
  tabActiveAlerts: { en: 'Active', hi: 'सक्रिय', hinglish: 'Active' },
  tabExpiredAlerts: { en: 'Expired', hi: 'समाप्त', hinglish: 'Expired' },
  officialTextUnedited: { en: 'Official text — unedited', hi: 'आधिकारिक सरकारी संदेश — मूल रूप में', hinglish: 'Official text — unedited' },
  officialHeadline: { en: 'Headline', hi: 'शीर्षक', hinglish: 'Headline' },
  officialDescription: { en: 'Description', hi: 'विवरण', hinglish: 'Description' },
  officialInstruction: { en: 'Instruction', hi: 'सुरक्षा निर्देश', hinglish: 'Instruction' },
  plainLanguageAdded: { en: 'Plain language · added by Aakrishi', hi: 'सरल भाषा सार · आकृषि द्वारा व्याख्या', hinglish: 'Simple summary · by Aakrishi' },
  sender: { en: 'Sender', hi: 'जारीकर्ता', hinglish: 'Sender' },
  severity: { en: 'Severity', hi: 'गंभीरता', hinglish: 'Severity' },
  urgency: { en: 'Urgency', hi: 'तात्कालिकता', hinglish: 'Urgency' },
  certainty: { en: 'Certainty', hi: 'निश्चितता', hinglish: 'Certainty' },
  issued: { en: 'Issued', hi: 'जारी हुआ', hinglish: 'Issued' },
  expires: { en: 'Expires', hi: 'समाप्ति समय', hinglish: 'Expires' },
  viewOnSachet: { en: 'View on NDMA Sachet', hi: 'राष्ट्रीय सचेत पोर्टल पर देखें', hinglish: 'NDMA Sachet par dekhein' },
  noAlertsMsg: { en: 'No active warnings for your location.', hi: 'आपके स्थान के लिए कोई सक्रिय आपदा चेतावनी नहीं है।', hinglish: 'Aapki location ke liye koi active alert nahi hai.' },
  noAlertsSub: { en: 'The NDMA Sachet feed is checked every five minutes.', hi: 'सचेत आपदा पोर्टल की हर पाँच मिनट में जाँच की जाती है।', hinglish: 'Sachet disaster portal har 5 minute mein check hota hai.' },
  imdColourCode: { en: 'IMD colour code', hi: 'मौसम विभाग रंग कोड', hinglish: 'IMD color code' },
  whatEachBandAsks: { en: 'What each band asks of you', hi: 'प्रत्येक रंग कोड का निर्देश', hinglish: 'Har color code ka action' },

  // --- Severity Levels -------------------------------------------------
  sevGreenLabel: { en: 'Green', hi: 'हरा', hinglish: 'Green' },
  sevGreenAction: { en: 'No action needed', hi: 'किसी कार्रवाई की आवश्यकता नहीं', hinglish: 'Koi action zaroori nahi' },
  sevYellowLabel: { en: 'Yellow', hi: 'पीला', hinglish: 'Yellow' },
  sevYellowAction: { en: 'Be aware', hi: 'सचेत रहें', hinglish: 'Be aware' },
  sevOrangeLabel: { en: 'Orange', hi: 'नारंगी', hinglish: 'Orange' },
  sevOrangeAction: { en: 'Be prepared', hi: 'तैयार रहें', hinglish: 'Taiyar rahein' },
  sevRedLabel: { en: 'Red', hi: 'लाल', hinglish: 'Red' },
  sevRedAction: { en: 'Take action', hi: 'तत्काल सुरक्षात्मक कदम उठाएँ', hinglish: 'Immediate action lein' },

  // --- Farm Connect Screen ---------------------------------------------
  farmConnectTitle: { en: 'Farm Connect', hi: 'फार्म कनेक्ट · खेत प्रबंधन', hinglish: 'Farm Connect' },
  farmConnectEyebrow: { en: 'Agricultural Intelligence', hi: 'कृषि आसूचना', hinglish: 'Krishi Intelligence' },
  subTabMyFarm: { en: 'My farm', hi: 'मेरा खेत', hinglish: 'Mera Farm' },
  subTabCropDoctor: { en: 'Crop doctor', hi: 'क्रॉप डॉक्टर', hinglish: 'Crop Doctor' },
  subTabSoilCheck: { en: 'Soil check', hi: 'मिट्टी परीक्षण', hinglish: 'Soil Check' },
  subTabPlanner: { en: 'Planner', hi: 'फ़सल योजना', hinglish: 'Crop Planner' },
  farmName: { en: 'Farm name', hi: 'खेत का नाम', hinglish: 'Farm ka naam' },
  areaUnderCrop: { en: 'Area under crop', hi: 'बोया गया रकबा', hinglish: 'Crop area' },
  soilType: { en: 'Soil type', hi: 'मिट्टी का प्रकार', hinglish: 'Mitti ka type' },
  irrigationSource: { en: 'Irrigation source', hi: 'सिंचाई का साधन', hinglish: 'Sinchai ka saadhan' },
  waterAvailability: { en: 'Water availability', hi: 'पानी की उपलब्धता', hinglish: 'Paani ki availability' },
  seasonLabel: { en: 'Season', hi: 'मौसम / सत्र', hinglish: 'Season (Rabi/Kharif)' },
  cropsThisSeason: { en: 'Crops this season', hi: 'इस मौसम की फ़सलें', hinglish: 'Is season ki faslein' },
  addCrop: { en: 'Add crop', hi: 'फ़सल जोड़ें', hinglish: 'Fasal add karein' },
  cropName: { en: 'Crop name', hi: 'फ़सल का नाम', hinglish: 'Fasal ka naam' },
  sownOn: { en: 'Sown on', hi: 'बुवाई की तारीख', hinglish: 'Buwayi ki date' },
  observationLog: { en: 'Observation log', hi: 'जाँच इतिहास', hinglish: 'Scan history' },
  noObservationsYet: { en: 'Nothing scanned yet. Leaf and soil scans appear here.', hi: 'अभी कोई स्कैन नहीं किया गया है। पत्ती व मिट्टी की रिपोर्ट यहाँ दिखेगी।', hinglish: 'Abhi koi scan nahi hua hai.' },
  switchToFarmerMode: { en: '🌾 Switch to Farmer View / किसान मोड', hi: '🌾 किसान मोड चालू करें', hinglish: '🌾 Switch to Farmer View' },
  farmerViewNotice: {
    en: 'Switch to Farmer mode to access Crop Doctor, Soil test & Farm Connect.',
    hi: 'क्रॉप डॉक्टर, मिट्टी परीक्षण और फार्म कनेक्ट के लिए किसान मोड चुनें।',
    hinglish: 'Crop Doctor, Soil test aur Farm Connect ke liye Farmer mode chunein.',
  },

  // --- Image Analyser (Crop Doctor & Soil Check) -----------------------
  leafTitle: { en: 'Crop Doctor Leaf Scanner', hi: 'क्रॉप डॉक्टर · पत्ती रोग स्कैनर', hinglish: 'Crop Doctor Leaf Scanner' },
  soilTitle: { en: 'Soil Type Classifier', hi: 'मिट्टी प्रकार विश्लेषक', hinglish: 'Soil Type Classifier' },
  leafPrompt: { en: 'Add a photo of the affected leaf', hi: 'रोगग्रस्त पत्ती की फ़ोटो जोड़ें', hinglish: 'Bimaar patte ki photo add karein' },
  soilPrompt: { en: 'Add a photo of bare soil', hi: 'खेत की खुली मिट्टी की फ़ोटो जोड़ें', hinglish: 'Khet ki mitti ki photo add karein' },
  leafHint: { en: 'Fill the frame with one leaf, in daylight, against a plain background.', hi: 'दिन की रोशनी में एक पत्ती को साफ फ्रेम में रखकर फ़ोटो खींचें।', hinglish: 'Daylight mein ek patte ki saaf photo lein.' },
  soilHint: { en: 'Dig a shallow scrape, photograph exposed soil in daylight.', hi: 'ऊपरी सतह हटाकर ताज़ा निकली मिट्टी की दिन में फ़ोटो लें।', hinglish: 'Upar ki layer hatakar mitti ki photo lein.' },
  leafCta: { en: 'Scan leaf for disease', hi: 'पत्ती रोग की जाँच करें', hinglish: 'Patti ki jaanch karein' },
  soilCta: { en: 'Classify soil type', hi: 'मिट्टी का प्रकार पहचानें', hinglish: 'Mitti ka type classify karein' },
  analysing: { en: 'Analysing image…', hi: 'चित्र का विश्लेषण हो रहा है…', hinglish: 'Photo analyse ho rahi hai…' },
  resetPhoto: { en: 'Reset', hi: 'बदलें', hinglish: 'Reset' },
  mostLikelyClass: { en: 'Most likely diagnosis', hi: 'संभावित रोग / निदान', hinglish: 'Predicted disease' },
  mostLikelySoil: { en: 'Most likely soil type', hi: 'संभावित मिट्टी प्रकार', hinglish: 'Predicted soil type' },

  // --- Ask / AI Assistant Screen ---------------------------------------
  askTitleGeneral: { en: 'Akashvaani · आकाशवाणी', hi: 'आकाशवाणी · एआई मौसम सहायक', hinglish: 'Akashvaani AI Weather Assistant' },
  askTitleFarmer: { en: 'Krishivaani · कृषिवाणी', hi: 'कृषिवाणी · एआई कृषि व मौसम मित्र', hinglish: 'Krishivaani AI Farm & Weather Friend' },
  askBlurbGeneral: {
    en: 'Ask about live rain forecasts, NDMA storm warnings, temperature outlook, and daily travel safety.',
    hi: 'बारिश, आंधी-तूफान चेतावनी, तापमान और यात्रा सुरक्षा के बारे में बोलकर या लिखकर पूछें।',
    hinglish: 'Barish, storm warnings, temperature aur travel safety ke baare mein poochhein.',
  },
  askBlurbFarmer: {
    en: 'Ask about irrigation timing, spraying windows, crop disease identification, and local rainfall.',
    hi: 'सिंचाई समय, दवा छिड़काव, फसल रोग और गाँव की वर्षा के बारे में बोलकर या लिखकर पूछें।',
    hinglish: 'Sinchai time, spray windows, fasal rog aur gaon ki barish ke baare mein poochhein.',
  },
  placeholder: {
    en: 'Ask about the weather or crops…',
    hi: 'मौसम या फ़सल के बारे में पूछें…',
    hinglish: 'Mausam ya fasal ke baare mein poochhein…',
  },
  composerHint: {
    en: 'Ask in English, हिन्दी or Hinglish…',
    hi: 'अंग्रेज़ी, हिन्दी या हिंग्लिश में पूछें…',
    hinglish: 'English, Hindi ya Hinglish mein poochhein…',
  },
  listening: { en: 'Listening…', hi: 'सुन रहा हूँ…', hinglish: 'Sun raha hoon…' },
  send: { en: 'Send', hi: 'भेजें', hinglish: 'Bhejein' },
  emptyThread: {
    en: 'Ask a question or tap a suggestion below.',
    hi: 'शुरू करने के लिए एक सवाल पूछें या नीचे दिए सुझाव पर टैप करें।',
    hinglish: 'Shuru karne ke liye sawaal poochhein ya suggestion par tap karein.',
  },
  grounding: {
    en: 'Answers are grounded in live verified data · never hallucinated',
    hi: 'उत्तर लाइव सत्यापित आँकड़ों पर आधारित हैं · काल्पनिक नहीं',
    hinglish: 'Jawab verified live data par aadharit hain',
  },
  answeringFor: { en: 'Answering for', hi: 'स्थान एवं मोड', hinglish: 'Answering for' },
  editFarm: { en: 'Edit farm →', hi: 'खेत विवरण बदलें →', hinglish: 'Farm edit karein →' },
  sources: { en: 'Sources', hi: 'स्रोत', hinglish: 'Sources' },
  speak: { en: 'Read aloud', hi: 'सुनें', hinglish: 'Sunayein' },
  stopSpeaking: { en: 'Stop', hi: 'रोकें', hinglish: 'Rokein' },

  // --- Settings Screen -------------------------------------------------
  preferencesTitle: { en: 'Settings & Preferences', hi: 'सेटिंग्स एवं प्राथमिकताएँ', hinglish: 'Settings & Preferences' },
  preferencesDesc: {
    en: 'Language, view mode, units and alert notification preferences.',
    hi: 'भाषा, दृश्य मोड (नागरिक/किसान), इकाई और सूचना सेटिंग्स।',
    hinglish: 'Language, view mode, units aur notification settings.',
  },
  locationCardTitle: { en: 'Active location', hi: 'सक्रिय स्थान', hinglish: 'Active location' },
  locationCardMeta: { en: 'Everything is computed for this position', hi: 'समस्त आँकड़े इस स्थान के लिए हैं', hinglish: 'Poora data is location ke liye hai' },
  changeBtn: { en: 'Change', hi: 'बदलें', hinglish: 'Badlein' },
  languageCardTitle: { en: 'Interface language', hi: 'ऐप की भाषा', hinglish: 'App Language' },
  languageCardMeta: { en: 'Instant switching across all screens', hi: 'सभी स्क्रीन पर तत्काल बदलाव', hinglish: 'Instant switch on all screens' },
  selectedModeTitle: { en: 'Selected View Mode / भूमिका', hi: 'चयनित दृश्य मोड', hinglish: 'Selected Mode' },
  selectedModeMeta: { en: 'Switch anytime', hi: 'कभी भी बदलें', hinglish: 'Kabhi bhi badlein' },
  notificationsDisplay: { en: 'Notifications & display', hi: 'अधिसूचना एवं प्रदर्शन', hinglish: 'Notifications & display' },
  unitsLabel: { en: 'Units', hi: 'तापमान इकाई', hinglish: 'Units' },
  unitsHint: { en: 'Metric (°C, km/h) or Imperial (°F, mph)', hi: 'मीट्रिक (°C, किमी/घंटा) या इम्पीरियल (°F, मील/घंटा)', hinglish: 'Metric (°C) ya Imperial (°F)' },
  severeOnlyLabel: { en: 'Severe events only', hi: 'केवल गंभीर चेतावनियाँ', hinglish: 'Sirf severe alerts' },
  severeOnlyHint: { en: 'Hide minor yellow advisories from push alerts', hi: 'छोटी पीली सलाहों को पुश सूचनाओं से छिपाएँ', hinglish: 'Minor alerts hide karein' },
  voiceRepliesLabel: { en: 'Speak answers aloud', hi: 'आवाज में उत्तर सुनें', hinglish: 'Awaaz mein jawab sunein' },
  voiceRepliesHint: { en: 'Read out AI answers automatically when voice is used', hi: 'बोलकर पूछने पर एआई स्वचालित रूप से बोलकर उत्तर देगा', hinglish: 'Voice question par awaaz mein jawab milega' },
  dataSaverLabel: { en: 'Data saver', hi: 'डेटा सेवर मोड', hinglish: 'Data saver mode' },
  dataSaverHint: { en: 'Low-bandwidth mode for rural 2G/3G networks', hi: 'कम नेटवर्क में तेज़ लोडिंग के लिए', hinglish: 'Slow network ke liye fast load' },
  farmDataTitle: { en: 'Farm data on device', hi: 'डिवाइस पर सुरक्षित कृषि डेटा', hinglish: 'Device par farm data' },
  clearFarmData: { en: 'Clear farm data', hi: 'कृषि डेटा साफ़ करें', hinglish: 'Farm data clear karein' },
  dataSourcesTitle: { en: 'Verified Data Sources', hi: 'सत्यापित डेटा स्रोत', hinglish: 'Verified Data Sources' },

  // --- 2-Step Gate (Landing) -------------------------------------------
  gateStep1Badge: { en: 'STEP 1 OF 2', hi: 'चरण 1 / 2', hinglish: 'STEP 1 OF 2' },
  gateStep1Title: { en: 'Choose your view mode', hi: 'अपनी आवश्यकता अनुसार मोड चुनें', hinglish: 'Apna View Mode Chunein' },
  gateGeneralTitle: { en: 'General View', hi: 'सामान्य नागरिक दृश्य', hinglish: 'General View' },
  gateGeneralSub: { en: 'Citizen Mode', hi: 'आम नागरिक', hinglish: 'Citizen Mode' },
  gateGeneralAi: { en: 'AI: Akashvaani (आकाशवाणी)', hi: 'एआई: आकाशवाणी', hinglish: 'AI: Akashvaani' },
  gateGeneralDesc1: {
    en: 'Accurate 7-Day & 24h Forecasts, NDMA Disaster Warnings & Travel Safety.',
    hi: 'दैनिक 7-दिवसीय मौसम, वर्षा का समय, एनडीएमए सचेत आपदा चेतावनियाँ एवं सुरक्षित यात्रा गाइड।',
    hinglish: 'Pinpoint 7-Day weather, NDMA disaster alerts aur travel safety.',
  },
  gateGeneralDesc2: {
    en: 'दैनिक मौसम पूर्वानुमान, वर्षा की स्थिति, लू/तूफान आपदा चेतावनी एवं आकाशवाणी एआई सहायक।',
    hi: 'स्वच्छ इंटरफ़ेस बिना किसी कृषि जटिलता के।',
    hinglish: 'Clean interface zero agricultural clutter ke saath.',
  },
  gateKrishiTitle: { en: 'Krishi View', hi: 'कृषि मित्र दृश्य', hinglish: 'Krishi View' },
  gateKrishiSub: { en: 'Farmer & Krishi Friend', hi: 'किसान एवं कृषि मित्र', hinglish: 'Farmer Mode' },
  gateKrishiAi: { en: 'AI: Krishivaani (कृषिवाणी) + Farm', hi: 'एआई: कृषिवाणी + खेत प्रबंधन', hinglish: 'AI: Krishivaani + Farm' },
  gateKrishiDesc1: {
    en: 'Complete Weather + Farm Connect, Crop Doctor Disease Scanner & Soil Test.',
    hi: 'संपूर्ण मौसम + खेत प्रबंधन, पत्ती रोग स्कैनर, मिट्टी विश्लेषण, सिंचाई व कृषिवाणी।',
    hinglish: 'Complete weather + Farm Connect, Crop Doctor leaf scanner aur Soil test.',
  },
  gateKrishiDesc2: {
    en: '5-Day Agro-Risk Matrix, Smart Irrigation alerts, and Crop Lifecycle Planner.',
    hi: '५-दिवसीय कृषि जोखिम मैट्रिक्स, स्मार्ट सिंचाई सलाह और फ़सल चक्र योजना।',
    hinglish: 'Agro-risk matrix, smart irrigation aur crop planner.',
  },
  gateContinueBtn: { en: 'Continue to Location · आगे बढ़ें →', hi: 'स्थान चयन के लिए आगे बढ़ें →', hinglish: 'Location select karne aage badhein →' },
  gateStep2Title: { en: 'Where are you located?', hi: 'आप किस स्थान पर हैं?', hinglish: 'Aap kahan sthit hain?' },
  gateStep2Sub: {
    en: 'Select your village, tehsil, city or GPS position for accurate, hyper-local data.',
    hi: 'सटीक मौसम के लिए अपना गाँव, तहसील, ज़िला चुनें या जीपीएस का उपयोग करें।',
    hinglish: 'Accurate weather ke liye apna gaon, tehsil, zila chunein ya GPS use karein.',
  },
  gateGpsBtn: { en: '1-TAP GPS AUTO DETECT', hi: '1-टैप जीपीएस स्वतः पहचान', hinglish: '1-TAP GPS AUTO DETECT' },
  gateGpsTitle: { en: 'Use current GPS location', hi: 'वर्तमान जीपीएस स्थान का उपयोग करें', hinglish: 'Current GPS location use karein' },
  gateGpsNote: { en: 'High-accuracy satellite coordinate fix.', hi: 'उपग्रह आधारित सटीक निर्देशांक।', hinglish: 'Accurate satellite fix.' },
  gateSearchHeader: { en: 'Search Village, Tehsil, City or Lat,Lon', hi: 'गाँव, तहसील, ज़िला या निर्देशांक खोजें', hinglish: 'Gaon, tehsil, zila ya coordinates search karein' },
  gateLaunchBtn: { en: 'Launch Aakrishi →', hi: 'आकृषि प्रारंभ करें →', hinglish: 'Launch Aakrishi →' },
  backToMode: { en: '← Back to Mode Selection', hi: '← मोड चयन पर वापस जाएँ', hinglish: '← Back to Mode Selection' },
}

/**
 * Translate a key into the chosen language (en | hi | hinglish).
 * Falls back gracefully to English, then to key itself if not found.
 */
export function t(key, lang = FALLBACK) {
  const entry = S[key]
  if (!entry) return key
  return entry[lang] ?? entry[FALLBACK] ?? key
}

export default t
