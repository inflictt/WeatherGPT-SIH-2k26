"""
Sentence templates, as data.

Three languages ship: English, Hindi (Devanagari) and Hinglish (romanised
Hindi). They are three columns of one table, not three code paths — which is
what makes the PRD's claim true that adding Marathi is a config entry rather
than a rewrite. Add a `"mr"` key to each dict below and Marathi works.

Two rules the tables encode:

  * **Hinglish is Hindi.** Its templates are the romanisation of the Hindi ones,
    not a separate register. That is why `speech` for a Hinglish answer is the
    Hindi string: the browser's `hi-IN` voice pronounces "बारिश" correctly and
    "barish" badly.

  * **Weather terminology is never translated.** `mm`, `km/h` and `°C` stay as
    they are in every language, because a farmer who has seen "115.6 mm" on a
    government bulletin needs to recognise the same unit here. This is the
    glossary the PRD asks for, applied by simply not translating.
"""
from __future__ import annotations

from typing import Any

#: Shipping languages. Adding one is an entry here plus keys in the tables
#: below — no code path changes, which is the PRD's claim and is checked by
#: tests/test_phrases.py rather than asserted.
LANGUAGES = ("en", "hi", "hinglish", "mr", "bn", "ta", "te")
DEFAULT_LANGUAGE = "en"

#: Languages complete enough to offer in the interface. A partially translated
#: language still *works* — `say()` falls back per string — but offering it
#: before it is complete means showing someone a mix of their language and
#: English, which reads as broken rather than as progress.
#:
#: §2 of the PRD is explicit about why the remaining four are not enabled:
#: "Three modes done well beats ten done by machine translation with broken
#: weather terminology." These carry safety instructions; a plausible-looking
#: mistranslation of "move indoors during lightning" is worse than English.
SHIPPING = ("en", "hi", "hinglish")

#: Units and technical tokens that stay identical in every language.
GLOSSARY = ("mm", "km/h", "°C", "%", "CAP", "IMD", "NDMA")


def lang_or_default(language: str | None) -> str:
    """Anything not shipping degrades to English rather than raising.

    Gated on SHIPPING and not LANGUAGES, deliberately. A language that is
    registered but not yet translated would otherwise return English *text*
    tagged with that language code — and the client would then hand it to a
    text-to-speech voice for a language the words are not in. Better to be
    honestly English than to be mislabelled.

    A user whose stored preference is a language we have not shipped yet gets a
    correct English answer, not an error page.
    """
    return language if language in SHIPPING else DEFAULT_LANGUAGE


def say(table: dict, language: str, *, key: str | None = None):
    """Read one phrase, falling back *per string* rather than per language.

    This is what lets a translation land incrementally. Without it, a language
    is all-or-nothing: one missing sentence and either the whole language has
    to wait, or the answer raises a KeyError mid-request. With it, a
    half-translated Marathi shows Marathi where it exists and English where it
    does not — and the coverage report says exactly which strings are left.

    English is the final fallback because it is the only table guaranteed
    complete; `tests/test_phrases.py` fails the build if it ever is not.
    """
    entry = table.get(language)
    if entry is None:
        entry = table.get(DEFAULT_LANGUAGE)
    if key is None:
        return entry
    if isinstance(entry, dict):
        found = entry.get(key)
        if found is not None:
            return found
    fallback = table.get(DEFAULT_LANGUAGE)
    return fallback.get(key, key) if isinstance(fallback, dict) else key


def coverage(language: str) -> dict:
    """How complete a language is, table by table. Used by the tests and by
    anyone deciding whether a language is ready to add to SHIPPING."""
    tables = {
        name: value
        for name, value in globals().items()
        if name.isupper() and isinstance(value, dict) and DEFAULT_LANGUAGE in value
    }
    missing = [name for name, table in tables.items() if language not in table]
    actions_missing = [
        a["key"] for a in ACTIONS if language not in a["text"]
    ]
    total = len(tables) + len(ACTIONS)
    done = total - len(missing) - len(actions_missing)
    return {
        "language": language,
        "complete": not missing and not actions_missing,
        "percent": round(done / total * 100, 1) if total else 100.0,
        "missing_tables": sorted(missing),
        "missing_actions": sorted(actions_missing),
    }


# --------------------------------------------------------------------------
# Summaries
# --------------------------------------------------------------------------
#: {band} is a phrase from RAIN_BAND_PHRASE; {mm}, {place}, {when} are slots.
RAIN_YES: dict[str, str] = {
    "en": "Yes — {band} is likely in {place} {when}, around {mm} mm.",
    "hi": "हाँ — {place} में {when} {band} की संभावना है, लगभग {mm} मिमी।",
    "hinglish": "Haan — {place} mein {when} {band} ki sambhavna hai, lagbhag {mm} mm.",
}

RAIN_NO: dict[str, str] = {
    "en": "No — only about {mm} mm is expected in {place} {when}.",
    "hi": "नहीं — {place} में {when} केवल लगभग {mm} मिमी वर्षा की संभावना है।",
    "hinglish": "Nahin — {place} mein {when} sirf lagbhag {mm} mm barish ki ummeed hai.",
}

RAIN_NONE: dict[str, str] = {
    "en": "No — no significant rain is expected in {place} {when}.",
    "hi": "नहीं — {place} में {when} उल्लेखनीय वर्षा की संभावना नहीं है।",
    "hinglish": "Nahin — {place} mein {when} koi khaas barish ki ummeed nahin hai.",
}

TEMPERATURE: dict[str, str] = {
    "en": "{place} {when}: a high of {tmax} °C and a low of {tmin} °C.",
    "hi": "{place} में {when}: अधिकतम {tmax} °C और न्यूनतम {tmin} °C।",
    "hinglish": "{place} mein {when}: adhiktam {tmax} °C aur nyuntam {tmin} °C.",
}

WIND: dict[str, str] = {
    "en": "{place} {when}: winds around {wind} km/h, gusting to {gust} km/h.",
    "hi": "{place} में {when}: हवा लगभग {wind} km/h, झोंके {gust} km/h तक।",
    "hinglish": "{place} mein {when}: hawa lagbhag {wind} km/h, jhonke {gust} km/h tak.",
}

WARNING_ONLY: dict[str, str] = {
    "en": "There is an active {colour} warning for {place}: {event}.",
    "hi": "{place} के लिए एक सक्रिय {colour} चेतावनी है: {event}।",
    "hinglish": "{place} ke liye ek active {colour} warning hai: {event}.",
}

NO_WARNING: dict[str, str] = {
    "en": "There is no active official warning for {place} right now.",
    "hi": "इस समय {place} के लिए कोई सक्रिय आधिकारिक चेतावनी नहीं है।",
    "hinglish": "Is samay {place} ke liye koi active official warning nahin hai.",
}

#: §10: missing data produces "I don't know", never an estimate. The English
#: phrasing is fixed because a test asserts on it — this sentence is a contract.
NO_DATA: dict[str, str] = {
    "en": "I don't have reliable forecast data for {place} right now.",
    "hi": "इस समय मेरे पास {place} के लिए भरोसेमंद पूर्वानुमान नहीं है।",
    "hinglish": "Is samay mere paas {place} ke liye bharosemand forecast nahin hai.",
}

#: IMD's categories, phrased. The mm boundaries live in thresholds.py; these are
#: only the words for them.
RAIN_BAND_PHRASE: dict[str, dict[str, str]] = {
    "en": {
        "LOW": "light to moderate rain",
        "MODERATE": "heavy rain",
        "HIGH": "very heavy rain",
        "EXTREME": "extremely heavy rain",
    },
    "hi": {
        "LOW": "हल्की से मध्यम बारिश",
        "MODERATE": "तेज़ बारिश",
        "HIGH": "बहुत तेज़ बारिश",
        "EXTREME": "अत्यंत भारी बारिश",
    },
    "hinglish": {
        "LOW": "halki se madhyam barish",
        "MODERATE": "tez barish",
        "HIGH": "bahut tez barish",
        "EXTREME": "atyant bhaari barish",
    },
}

#: Window labels. The parser returns "tomorrow evening"; this renders it.
WHEN: dict[str, dict[str, str]] = {
    "en": {
        "today": "today", "tomorrow": "tomorrow",
        "the day after tomorrow": "the day after tomorrow",
        "morning": "in the morning", "afternoon": "in the afternoon",
        "evening": "this evening", "night": "tonight",
        "today morning": "this morning", "today afternoon": "this afternoon",
        "today evening": "this evening", "today night": "tonight",
        "tomorrow morning": "tomorrow morning",
        "tomorrow afternoon": "tomorrow afternoon",
        "tomorrow evening": "tomorrow evening",
        "tomorrow night": "tomorrow night",
    },
    "hi": {
        "today": "आज", "tomorrow": "कल",
        "the day after tomorrow": "परसों",
        "morning": "सुबह", "afternoon": "दोपहर", "evening": "शाम", "night": "रात",
        "today morning": "आज सुबह", "today afternoon": "आज दोपहर",
        "today evening": "आज शाम", "today night": "आज रात",
        "tomorrow morning": "कल सुबह", "tomorrow afternoon": "कल दोपहर",
        "tomorrow evening": "कल शाम", "tomorrow night": "कल रात",
    },
    "hinglish": {
        "today": "aaj", "tomorrow": "kal",
        "the day after tomorrow": "parso",
        "morning": "subah", "afternoon": "dopahar", "evening": "shaam", "night": "raat",
        "today morning": "aaj subah", "today afternoon": "aaj dopahar",
        "today evening": "aaj shaam", "today night": "aaj raat",
        "tomorrow morning": "kal subah", "tomorrow afternoon": "kal dopahar",
        "tomorrow evening": "kal shaam", "tomorrow night": "kal raat",
    },
}

#: IMD colour names, so a Hindi answer says "नारंगी" and not "orange".
COLOUR_WORD: dict[str, dict[str, str]] = {
    "en": {"green": "green", "yellow": "yellow", "orange": "orange", "red": "red"},
    "hi": {"green": "हरी", "yellow": "पीली", "orange": "नारंगी", "red": "लाल"},
    "hinglish": {"green": "green", "yellow": "yellow", "orange": "orange", "red": "red"},
}

#: What each colour asks of the reader. Mirrors constants.js on the client.
COLOUR_ACTION: dict[str, dict[str, str]] = {
    "en": {"green": "no action needed", "yellow": "be aware",
           "orange": "be prepared", "red": "take action"},
    "hi": {"green": "कोई कार्रवाई आवश्यक नहीं", "yellow": "सतर्क रहें",
           "orange": "तैयार रहें", "red": "कार्रवाई करें"},
    "hinglish": {"green": "koi karyavahi zaroori nahin", "yellow": "satark rahein",
                 "orange": "taiyar rahein", "red": "karyavahi karein"},
}

#: The plain-language gloss that sits *beside* official text, never in place of
#: it (invariant 2). {sender} and {action} are slots.
WARNING_GLOSS: dict[str, str] = {
    "en": "{sender} has an active {colour} alert for this area — {action}.",
    "hi": "{sender} ने इस क्षेत्र के लिए {colour} अलर्ट जारी किया है — {action}।",
    "hinglish": "{sender} ne is ilake ke liye {colour} alert jari kiya hai — {action}.",
}

#: Note the absent denominator. "scored 74 out of 100" would put a literal 100
#: into the prose, and 100 is not a fetched value — the validator rejects it,
#: correctly. Rather than carve an exception into the grounding check for a
#: number that carries no information, the scale is left to the risk card, which
#: renders it visually anyway.
RISK_SENTENCE: dict[str, str] = {
    "en": "Overall risk is {band}, with a score of {score}.",
    "hi": "कुल जोखिम {band} है, स्कोर {score}।",
    "hinglish": "Kul jokhim {band} hai, score {score}.",
}

RISK_FLOOR_SENTENCE: dict[str, str] = {
    "en": " An active {colour} alert raised it from {from_band} — an official warning can raise the level but never lower it.",
    "hi": " एक सक्रिय {colour} अलर्ट ने इसे {from_band} से बढ़ाया — आधिकारिक चेतावनी स्तर बढ़ा सकती है, घटा नहीं सकती।",
    "hinglish": " Ek active {colour} alert ne ise {from_band} se badhaya — official warning level badha sakti hai, ghata nahin sakti.",
}

CONFIDENCE_SENTENCE: dict[str, str] = {
    "en": "Forecast confidence is {level}.",
    "hi": "पूर्वानुमान का भरोसा {level} है।",
    "hinglish": "Forecast ka bharosa {level} hai.",
}

CONFIDENCE_WORD: dict[str, dict[str, str]] = {
    "en": {"HIGH": "high", "MEDIUM": "medium", "LOW": "low"},
    "hi": {"HIGH": "अधिक", "MEDIUM": "मध्यम", "LOW": "कम"},
    "hinglish": {"HIGH": "zyada", "MEDIUM": "madhyam", "LOW": "kam"},
}

RISK_WORD: dict[str, dict[str, str]] = {
    "en": {"LOW": "LOW", "MODERATE": "MODERATE", "HIGH": "HIGH", "EXTREME": "EXTREME"},
    "hi": {"LOW": "कम", "MODERATE": "मध्यम", "HIGH": "अधिक", "EXTREME": "अत्यधिक"},
    "hinglish": {"LOW": "kam", "MODERATE": "madhyam", "HIGH": "adhik", "EXTREME": "atyadhik"},
}


# --------------------------------------------------------------------------
# Recommended actions
# --------------------------------------------------------------------------
#: Each entry is (key, persona, condition-name, text-per-language). The
#: condition names are evaluated in compose.py against the real fetched values,
#: which is why a calm day never advises covering a harvest.
ACTIONS: tuple[dict[str, Any], ...] = (
    # --- farmer -----------------------------------------------------------
    {
        "key": "cover_harvest", "persona": "farmer", "when": "rain_heavy",
        "text": {
            "en": "Cover harvested produce before the rain begins.",
            "hi": "बारिश शुरू होने से पहले कटी हुई फ़सल को ढक दें।",
            "hinglish": "Barish shuru hone se pehle kati hui fasal dhak dein.",
        },
    },
    {
        "key": "delay_irrigation", "persona": "farmer", "when": "rain_any",
        "text": {
            "en": "Delay irrigation — the soil will take up this rain.",
            "hi": "सिंचाई टाल दें — मिट्टी यह पानी सोख लेगी।",
            "hinglish": "Sinchai taal dein — mitti yeh paani sokh legi.",
        },
    },
    {
        "key": "no_spray", "persona": "farmer", "when": "rain_any",
        "text": {
            "en": "Do not spray today; rain will wash it off.",
            "hi": "आज छिड़काव न करें; बारिश उसे बहा देगी।",
            "hinglish": "Aaj chhidkav na karein; barish use baha degi.",
        },
    },
    {
        "key": "irrigate_ok", "persona": "farmer", "when": "dry",
        "text": {
            "en": "Conditions are suitable for irrigation and field work.",
            "hi": "सिंचाई और खेत के काम के लिए स्थिति अनुकूल है।",
            "hinglish": "Sinchai aur khet ke kaam ke liye sthiti anukool hai.",
        },
    },
    # --- traveller --------------------------------------------------------
    {
        "key": "delay_travel", "persona": "traveller", "when": "rain_heavy",
        "text": {
            "en": "Delay non-essential travel through low-lying stretches.",
            "hi": "निचले इलाकों से होकर ग़ैर-ज़रूरी यात्रा टाल दें।",
            "hinglish": "Nichle ilakon se hokar gair-zaroori yatra taal dein.",
        },
    },
    {
        "key": "watch_visibility", "persona": "traveller", "when": "wind_strong",
        "text": {
            "en": "Expect reduced visibility and crosswinds on open roads.",
            "hi": "खुली सड़कों पर कम दृश्यता और तेज़ हवा की आशंका है।",
            "hinglish": "Khuli sadkon par kam drishyata aur tez hawa ki aashanka hai.",
        },
    },
    {
        "key": "travel_ok", "persona": "traveller", "when": "dry",
        "text": {
            "en": "Road conditions look normal for travel.",
            "hi": "यात्रा के लिए सड़क की स्थिति सामान्य लग रही है।",
            "hinglish": "Yatra ke liye sadak ki sthiti samanya lag rahi hai.",
        },
    },
    # --- local admin ------------------------------------------------------
    {
        "key": "brief_blocks", "persona": "official", "when": "warning_active",
        "text": {
            "en": "Brief block-level staff and check low-lying settlements.",
            "hi": "ब्लॉक स्तर के कर्मचारियों को सूचित करें और निचली बस्तियों की जाँच करें।",
            "hinglish": "Block star ke karmchariyon ko soochit karein aur nichli bastiyon ki jaanch karein.",
        },
    },
    {
        "key": "check_drainage", "persona": "official", "when": "rain_heavy",
        "text": {
            "en": "Verify pump and drainage readiness before the peak window.",
            "hi": "पीक समय से पहले पंप और जल-निकासी की तैयारी जाँच लें।",
            "hinglish": "Peak samay se pehle pump aur jal-nikasi ki taiyari jaanch lein.",
        },
    },
    {
        "key": "monitor", "persona": "official", "when": "always",
        "text": {
            "en": "Keep monitoring the Sachet feed for updates.",
            "hi": "अपडेट के लिए सचेत फ़ीड पर नज़र रखें।",
            "hinglish": "Update ke liye Sachet feed par nazar rakhein.",
        },
    },
    # --- general ----------------------------------------------------------
    {
        "key": "carry_cover", "persona": "general", "when": "rain_any",
        "text": {
            "en": "Carry rain protection if you are going out.",
            "hi": "बाहर जा रहे हों तो बारिश से बचाव साथ रखें।",
            "hinglish": "Bahar ja rahe hon to barish se bachav saath rakhein.",
        },
    },
    {
        "key": "avoid_waterlogging", "persona": "general", "when": "rain_heavy",
        "text": {
            "en": "Avoid waterlogged underpasses and low-lying roads.",
            "hi": "जलभराव वाले अंडरपास और निचली सड़कों से बचें।",
            "hinglish": "Jalbharav wale underpass aur nichli sadkon se bachein.",
        },
    },
    {
        "key": "nothing_needed", "persona": "general", "when": "dry",
        "text": {
            "en": "Nothing to plan around — conditions look ordinary.",
            "hi": "कुछ ख़ास तैयारी की ज़रूरत नहीं — स्थिति सामान्य है।",
            "hinglish": "Kuch khaas taiyari ki zaroorat nahin — sthiti samanya hai.",
        },
    },
    # --- applies to everyone when an official warning is active -----------
    {
        "key": "follow_official", "persona": "*", "when": "warning_active",
        "text": {
            "en": "Follow the official instruction shown above.",
            "hi": "ऊपर दिए गए आधिकारिक निर्देश का पालन करें।",
            "hinglish": "Upar diye gaye official nirdesh ka palan karein.",
        },
    },
)

PERSONAS = ("general", "farmer", "traveller", "official")
DEFAULT_PERSONA = "general"


def persona_or_default(persona: str | None) -> str:
    return persona if persona in PERSONAS else DEFAULT_PERSONA
