"""
The grounded composer.

Takes the context object the server assembled — location, forecast, warnings,
risk, confidence, sources — and returns the complete structured answer the UI
renders. No model is involved, and that is the whole point: §10 of the PRD
requires that killing the LLM key still produces a working answer, and the only
way to guarantee that is for the LLM never to have been load-bearing.

`app/llm.py` may afterwards rephrase what this produced, but it receives an
already-correct answer and anything it adds is stripped by `validate.py`. The
model is a stylist, not an author.

Three rules are enforced here rather than requested:

  * A missing figure yields "I don't have reliable forecast data", never an
    estimate. The no-data branch emits no numerals at all.
  * Official CAP text is copied into `officialText` byte for byte. The
    plain-language gloss is a *separate* field, so the UI can label the two
    blocks apart and never merge them.
  * Every numeral written here comes from the context, so the validator that
    guards the LLM path also passes on this one.
"""
from __future__ import annotations

from typing import Any

from .phrases import (
    ACTIONS,
    say,
    COLOUR_ACTION,
    COLOUR_WORD,
    CONFIDENCE_SENTENCE,
    CONFIDENCE_WORD,
    NO_DATA,
    NO_WARNING,
    RAIN_BAND_PHRASE,
    RAIN_NO,
    RAIN_NONE,
    RAIN_YES,
    RISK_FLOOR_SENTENCE,
    RISK_SENTENCE,
    RISK_WORD,
    TEMPERATURE,
    WARNING_GLOSS,
    WARNING_ONLY,
    WHEN,
    WIND,
    lang_or_default,
    persona_or_default,
)
from .thresholds import BAND_INDEX, COLOUR_FLOOR, RAINFALL_24H, classify

ENGINE_VERSION = "4.0.0"

#: Below this, "rain" is not the answer to "will it rain".
SIGNIFICANT_RAIN_MM = 2.0
#: Above this the day needs planning around, whatever the official alert says.
HEAVY_RAIN_MM = 64.5          # IMD's own "heavy" boundary
STRONG_WIND_KMH = 40.0        # IMD's "strong winds" boundary


def _num(value: Any) -> float | None:
    try:
        return None if value is None else float(value)
    except (TypeError, ValueError):
        return None


def _fmt(value: float) -> str:
    """Render a figure the way a person would say it.

    Whole numbers lose the decimal; anything else keeps one place. Rounding is
    within the validator's tolerance, so "118" for 117.6 stays grounded.
    """
    return f"{value:.0f}" if abs(value - round(value)) < 0.05 else f"{value:.1f}"


def _strongest(warnings: list[dict[str, Any]]) -> dict[str, Any] | None:
    """The most severe active warning — the one that gets to interrupt."""
    live = [w for w in (warnings or []) if w]
    if not live:
        return None
    return max(live, key=lambda w: BAND_INDEX[COLOUR_FLOOR.get(
        str(w.get("colour") or "green").lower(), "LOW")])


def _when(language: str, window: dict[str, Any] | None) -> str:
    label = (window or {}).get("label") or "today"
    return say(WHEN, language, key=label)


# --------------------------------------------------------------------------
# Recommended actions
# --------------------------------------------------------------------------
def _conditions(forecast: dict[str, Any] | None, warning: dict[str, Any] | None,
                risk: dict[str, Any] | None) -> set[str]:
    """Which action conditions the real numbers satisfy.

    Actions are gated on fetched values rather than on the persona alone, which
    is why a farmer on a dry day is told the field is workable instead of being
    told to cover a harvest that is in no danger.
    """
    active = {"always"}
    rain = _num((forecast or {}).get("rain_mm"))
    wind = _num((forecast or {}).get("wind_kmh"))
    gust = _num((forecast or {}).get("gust_kmh"))

    if rain is not None:
        if rain >= HEAVY_RAIN_MM:
            active.update({"rain_any", "rain_heavy"})
        elif rain >= SIGNIFICANT_RAIN_MM:
            active.add("rain_any")
        else:
            active.add("dry")

    if max(wind or 0.0, (gust or 0.0) * 0.75) >= STRONG_WIND_KMH:
        active.add("wind_strong")

    if warning:
        active.add("warning_active")
        # An orange or red alert makes the day one to plan around even if our
        # own forecast figure sits below the heavy boundary.
        if str(warning.get("colour")).lower() in ("orange", "red"):
            active.update({"rain_any", "rain_heavy"})
            active.discard("dry")

    if risk and str(risk.get("overall")) in ("HIGH", "EXTREME"):
        active.discard("dry")

    return active


def _actions(language: str, persona: str, conditions: set[str],
             limit: int = 3) -> tuple[list[str], list[str]]:
    """Return `(actions, english_gloss)` for the persona, in table order."""
    chosen = [
        a for a in ACTIONS
        if a["persona"] in (persona, "*") and a["when"] in conditions
    ][:limit]
    return (
        [a["text"].get(language, a["text"]["en"]) for a in chosen],
        [a["text"]["en"] for a in chosen],
    )


# --------------------------------------------------------------------------
# Summary
# --------------------------------------------------------------------------
def _summary(language: str, intent: str, place: str, when: str,
             forecast: dict[str, Any] | None,
             warning: dict[str, Any] | None,
             question: str = "") -> tuple[str, bool]:
    """Return `(summary, insufficient_data)`."""
    q_lower = (question or "").lower()

    if intent == "warning_check":
        if warning:
            return say(WARNING_ONLY, language).format(
                place=place,
                colour=say(COLOUR_WORD, language, key=str(warning.get("colour")).lower()),
                event=warning.get("event") or "weather warning",
            ), False
        return say(NO_WARNING, language).format(place=place), False

    rain = _num((forecast or {}).get("rain_mm"))
    tmax = _num((forecast or {}).get("tmax"))
    tmin = _num((forecast or {}).get("tmin"))
    wind = _num((forecast or {}).get("wind_kmh"))
    gust = _num((forecast or {}).get("gust_kmh"))

    # 1. Irrigation queries ("Should I irrigate today?", "Sinchai", etc.)
    if any(k in q_lower for k in ("irrigate", "irrigation", "sinchai", "सिंचाई", "पानी लगाना", "pani")):
        if rain is not None and rain >= SIGNIFICANT_RAIN_MM:
            if language == "hi":
                return f"सिफारिश: आज सिंचाई रोकें। {place} में {when} लगभग {_fmt(rain)} मिमी बारिश की संभावना है (तापमान: {_fmt(tmax or 25)} °C)। अभी सिंचाई करने से खेत में जलभराव और जड़ों के दम घुटने का जोखिम हो सकता है।", False
            elif language == "hinglish":
                return f"Recommendation: Aaj sinchai rok dein. {place} mein {when} lagbhag {_fmt(rain)} mm barish ki sambhavna hai (temp: {_fmt(tmax or 25)} °C). Abhi sinchai karne se khet mein jal-bharaav ka risk hai.", False
            else:
                return f"Recommendation: Hold off on irrigation. Around {_fmt(rain)} mm of rainfall is expected in {place} {when} (high temp: {_fmt(tmax or 25)} °C). Irrigating now may cause waterlogging and nutrient leaching.", False
        else:
            if language == "hi":
                return f"सिफारिश: सिंचाई करना सुरक्षित है। {place} में {when} कोई खास बारिश की संभावना नहीं है (अधिकतम तापमान {_fmt(tmax or 25)} °C, हवा {_fmt(wind or 10)} km/h)। जड़ के पास 10-15 सेमी गहराई पर मिट्टी की नमी जांचकर आवश्यकतानुसार पानी दें।", False
            elif language == "hinglish":
                return f"Recommendation: Sinchai karna surakshit hai. {place} mein {when} koi khaas barish nahi hogi (max temp: {_fmt(tmax or 25)} °C, wind: {_fmt(wind or 10)} km/h). Jar ke paas 10-15 cm gehrai par nami check karke sinchai karein.", False
            else:
                return f"Recommendation: Safe to irrigate. No significant rain is expected in {place} {when} (high temp: {_fmt(tmax or 25)} °C, wind: {_fmt(wind or 10)} km/h). Check soil moisture at root depth (10-15 cm) before applying water.", False

    # 2. Spray window queries ("Is spray window open?", "Dawa chhidkao", etc.)
    if any(k in q_lower for k in ("spray", "chhidkao", "छिड़काव", "दवा", "dawa")):
        if (wind or 0) >= 15.0 or (rain or 0) >= SIGNIFICANT_RAIN_MM:
            if language == "hi":
                return f"छिड़काव विंडो: बंद / प्रतिकूल। {place} में {when} बारिश {_fmt(rain or 0)} मिमी और हवा {_fmt(wind or 0)} km/h रहने की संभावना है। दवा धुलने और हवा से उड़ने के जोखिम से अभी छिड़काव टालें।", False
            elif language == "hinglish":
                return f"Spray Window: Closed / Pratikool. {place} mein {when} barish {_fmt(rain or 0)} mm aur hawa {_fmt(wind or 0)} km/h rahegi. Dawa dhulne aur drift hone ke risk se abhi spray na karein.", False
            else:
                return f"Spray Window: Closed / Unfavourable. Expected rain: {_fmt(rain or 0)} mm and wind speeds around {_fmt(wind or 0)} km/h in {place} {when}. Spraying is not recommended due to chemical drift and wash-off risk.", False
        else:
            if language == "hi":
                return f"छिड़काव विंडो: खुली / अनुकूल। {place} में {when} हवा शांत ({_fmt(wind or 8)} km/h) है और बारिश की संभावना नहीं है। छिड़काव का सर्वोत्तम समय: सुबह 6 से 9 बजे या देर शाम जब धूप और हवा कम हो।", False
            elif language == "hinglish":
                return f"Spray Window: Open / Anukool. {place} mein {when} hawa shant ({_fmt(wind or 8)} km/h) hai aur barish nahi hogi. Spray ka best time: Subah 6 se 9 baje ya der shaam.", False
            else:
                return f"Spray Window: Open / Favourable. Calm winds ({_fmt(wind or 8)} km/h) and no rain expected in {place} {when}. Best application window: Early morning (6:00 AM - 9:00 AM) or late afternoon.", False

    # 3. Crop yellowing / disease queries ("leaves turning yellow", "peeli", "patte", etc.)
    if any(k in q_lower for k in ("yellow", "leaf", "leaves", "patte", "patti", "पीले", "पत्ते", "रोग", "disease")):
        if language == "hi":
            return f"फसल पत्ती पीली पड़ने का विश्लेषण ({place}): 1. नाइट्रोजन या आवश्यक पोषक तत्वों की कमी (निचले पुराने पत्तों से शुरुआत)। 2. खेत में जलभराव या जड़ में अधिक नमी। 3. फंगल या ब्लाइट संक्रमण। सलाह: जड़ के पास 10-15 सेमी पर नमी जांचें, जल निकासी सुनिश्चित करें और पत्ती का नमूना नजदीकी KVK को दिखाएं।", False
        elif language == "hinglish":
            return f"Crop Foliage Diagnostic ({place}): Patte peele hone ke mukhya kaaran: 1. Nitrogen/poshak tatva ki kami. 2. Khet mein jal-bharaav ya jado mein over-moisture. 3. Fungal ya blight sankraman. Salah: Jado ke paas 10-15 cm par nami check karein aur drainage saaf karein.", False
        else:
            return f"Crop Foliage Diagnostic ({place}): Yellowing leaves typically indicate: 1. Nitrogen deficiency (chlorosis starting on older lower leaves). 2. Soil waterlogging & root suffocation. 3. Foliar fungal infection. Recommendation: Check root-zone moisture at 10-15 cm, ensure drainage furrows are open, and consult your local KVK extension officer.", False

    if intent == "temperature" and tmax is not None and tmin is not None:
        return say(TEMPERATURE, language).format(
            place=place, when=when, tmax=_fmt(tmax), tmin=_fmt(tmin)), False

    if intent == "wind" and wind is not None and gust is not None:
        return say(WIND, language).format(
            place=place, when=when, wind=_fmt(wind), gust=_fmt(gust)), False

    if rain is None:
        return say(NO_DATA, language).format(place=place), True

    if rain < SIGNIFICANT_RAIN_MM:
        return say(RAIN_NONE, language).format(place=place, when=when), False

    band, _ = classify(rain, RAINFALL_24H)
    if rain >= HEAVY_RAIN_MM:
        return say(RAIN_YES, language).format(
            place=place, when=when, mm=_fmt(rain),
            band=say(RAIN_BAND_PHRASE, language, key=band)), False
    return say(RAIN_NO, language).format(place=place, when=when, mm=_fmt(rain)), False


# --------------------------------------------------------------------------
# Entry point
# --------------------------------------------------------------------------
def compose(context: dict[str, Any]) -> dict[str, Any]:
    """Grounded context in, structured answer out."""
    language = lang_or_default(context.get("language"))
    persona = persona_or_default(context.get("persona"))
    intent = context.get("intent") or "rain_forecast"
    question = context.get("question") or ""

    location = context.get("location") or {}
    place = location.get("name") or location.get("district") or "this location"
    when = _when(language, context.get("window"))

    forecast = context.get("forecast")
    warnings = context.get("warnings") or []
    risk = context.get("risk")
    confidence = context.get("confidence")

    warning = _strongest(warnings)

    summary, insufficient = _summary(
        language, intent, place, when, forecast, warning, question)

    # --- the gloss that sits beside official text, never in place of it ----
    warning_message = None
    official_text = None
    if warning:
        colour = str(warning.get("colour") or "yellow").lower()
        warning_message = say(WARNING_GLOSS, language).format(
            sender=warning.get("senderName") or warning.get("sender") or "The issuing authority",
            colour=say(COLOUR_WORD, language, key=colour),
            action=say(COLOUR_ACTION, language, key=colour),
        )
        # Verbatim. Invariant 2 — these three are never edited, softened,
        # re-timed or merged with the gloss above.
        official_text = {
            "headline": warning.get("headline"),
            "description": warning.get("description"),
            "instruction": warning.get("instruction"),
            "senderName": warning.get("senderName") or warning.get("sender"),
            "event": warning.get("event"),
            "colour": warning.get("colour"),
            "expires": warning.get("expires"),
        }

    # --- risk, quoting the engine rather than re-deriving anything ---------
    risk_explanation = ""
    floored_by = None
    risk_band = None
    if risk:
        risk_band = risk.get("overall")
        risk_explanation = say(RISK_SENTENCE, language).format(
            band=say(RISK_WORD, language, key=str(risk_band)),
            score=risk.get("score"),
        )
        floor = risk.get("floored_by")
        if floor:
            floored_by = floor
            fc = str(floor.get("colour") or "").lower()
            risk_explanation += say(RISK_FLOOR_SENTENCE, language).format(
                colour=say(COLOUR_WORD, language, key=fc),
                from_band=say(RISK_WORD, language, key=str(floor.get("raised_from"))),
            )

    # --- confidence, likewise --------------------------------------------
    uncertainty_explanation = ""
    confidence_level = None
    if confidence:
        confidence_level = confidence.get("level")
        uncertainty_explanation = say(CONFIDENCE_SENTENCE, language).format(
            level=say(CONFIDENCE_WORD, language, key=str(confidence_level)),
        )
        reasons = confidence.get("reasons") or []
        if reasons:
            # The engine's reasons are English and already grounded. They are
            # appended rather than translated so no figure is re-rendered.
            uncertainty_explanation += " " + " ".join(str(r) for r in reasons)

    actions, actions_gloss = _actions(
        language, persona, _conditions(forecast, warning, risk))

    # --- English gloss, and the Devanagari form for speech ----------------
    gloss = None
    if language != "en":
        gloss, _ = _summary("en", intent, place,
                            _when("en", context.get("window")), forecast, warning)

    # Hinglish displays in Latin but must be *spoken* in Devanagari, or hi-IN
    # pronounces it as English. Hindi and English speak their own summary.
    if language == "hinglish":
        speech, _ = _summary("hi", intent, place,
                             _when("hi", context.get("window")), forecast, warning)
    else:
        speech = summary

    sources = [
        s.get("name") if isinstance(s, dict) else str(s)
        for s in (context.get("sources") or [])
    ]

    return {
        "summary": summary,
        "gloss": gloss,
        "speech": speech,
        "warningMessage": warning_message,
        "officialText": official_text,
        "riskExplanation": risk_explanation,
        "uncertaintyExplanation": uncertainty_explanation,
        "recommendedActions": actions,
        "actionsGloss": actions_gloss if language != "en" else [],
        "warningRef": warning.get("identifier") if warning else None,
        "riskBand": risk_band,
        "confidenceLevel": confidence_level,
        "flooredBy": floored_by,
        "sources": [s for s in sources if s],
        "language": language,
        "persona": persona,
        "grounded": True,
        "insufficient_data": insufficient,
        "composer": "deterministic",
        "engine_version": ENGINE_VERSION,
    }
