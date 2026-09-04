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
    RAIN_MODERATE,
    WEATHER_OVERVIEW_RAIN,
    WEATHER_OVERVIEW_DRY,
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
             warning: dict[str, Any] | None) -> tuple[str, bool]:
    """Return `(summary, insufficient_data)`.

    The no-data branch is deliberately number-free: §10 forbids an estimate, and
    a sentence containing a figure would read as one however it is hedged.
    """
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

    if intent == "temperature" and tmax is not None and tmin is not None:
        return say(TEMPERATURE, language).format(
            place=place, when=when, tmax=_fmt(tmax), tmin=_fmt(tmin)), False

    if intent == "wind" and wind is not None and gust is not None:
        return say(WIND, language).format(
            place=place, when=when, wind=_fmt(wind), gust=_fmt(gust)), False

    if intent == "general" and tmax is not None and tmin is not None:
        if rain is not None and rain >= SIGNIFICANT_RAIN_MM:
            band, _ = classify(rain, RAINFALL_24H)
            return say(WEATHER_OVERVIEW_RAIN, language).format(
                place=place, when=when, mm=_fmt(rain),
                band=say(RAIN_BAND_PHRASE, language, key=band),
                tmax=_fmt(tmax), tmin=_fmt(tmin)), False
        return say(WEATHER_OVERVIEW_DRY, language).format(
            place=place, when=when, tmax=_fmt(tmax), tmin=_fmt(tmin)), False

    if rain is None:
        return say(NO_DATA, language).format(place=place), True

    if rain < SIGNIFICANT_RAIN_MM:
        return say(RAIN_NONE, language).format(place=place, when=when), False

    band, _ = classify(rain, RAINFALL_24H)
    if rain >= HEAVY_RAIN_MM:
        return say(RAIN_YES, language).format(
            place=place, when=when, mm=_fmt(rain),
            band=say(RAIN_BAND_PHRASE, language, key=band)), False
    return say(RAIN_MODERATE, language).format(place=place, when=when, mm=_fmt(rain)), False


# --------------------------------------------------------------------------
# Entry point
# --------------------------------------------------------------------------
def compose(context: dict[str, Any]) -> dict[str, Any]:
    """Grounded context in, structured answer out.

    Every field of the returned dict is always present. The client renders from
    fields rather than from prose, so a missing key would be a blank card — the
    contract is total on purpose.
    """
    language = lang_or_default(context.get("language"))
    persona = persona_or_default(context.get("persona"))
    intent = context.get("intent") or "rain_forecast"

    location = context.get("location") or {}
    place = location.get("name") or location.get("district") or "this location"
    when = _when(language, context.get("window"))

    forecast = context.get("forecast")
    warnings = context.get("warnings") or []
    risk = context.get("risk")
    confidence = context.get("confidence")

    warning = _strongest(warnings)

    summary, insufficient = _summary(
        language, intent, place, when, forecast, warning)

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
