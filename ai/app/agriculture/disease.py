"""
Weather-aware disease risk — PRD §18.

An image classifier answers one question: *what does this leaf look like?*
It knows nothing about whether the conditions favour the pathogen spreading,
which is the question a farmer actually has. This module fuses the two.

The contract is narrow on purpose:

  * **It never produces a disease class.** The class comes from the model, or
    it does not come at all. Given no prediction this returns a *conditions*
    risk and says explicitly that nothing was detected — it will not infer a
    disease from humidity.
  * **The model's confidence caps the outcome.** A 41%-confident class cannot
    produce a HIGH disease risk however wet the week is, because the premise
    is shaky. Weather can raise a confident prediction and it can lower an
    unconfident one; it cannot manufacture certainty.
  * **Every band carries its reasoning**, so §28's four questions — what, why,
    how sure, what next — are all answerable from the return value.
"""
from __future__ import annotations

from dataclasses import dataclass, field

from ..engines.thresholds import BAND_INDEX, BANDS, max_band
from . import thresholds as T
from .crop_calendar import stage_for

#: Below this the model is close to guessing, and the result is presented as a
#: prompt to look again rather than as a finding.
LOW_CONFIDENCE = 0.60
#: Above this the class is treated as reliable enough to act on.
GOOD_CONFIDENCE = 0.80

#: Classes that mean "nothing wrong". Model vocabularies vary, so this matches
#: loosely and errs towards treating an unknown label as a finding.
HEALTHY_TOKENS = ("healthy", "no disease", "normal", "background")


@dataclass
class DiseaseRisk:
    band: str                       # LOW | MODERATE | HIGH | EXTREME
    score: int
    detected: str | None            # the model's class, or None
    detection_confidence: float | None
    conditions_band: str            # weather favourability on its own
    factors: list[dict] = field(default_factory=list)
    actions: list[str] = field(default_factory=list)
    confidence: str = "MEDIUM"
    explanation: str = ""
    disclaimer: str = (
        "An image model is not a diagnosis. It suggests what to look at more "
        "closely — confirm with your local agricultural extension officer "
        "before applying any treatment."
    )


_SCORE = {"LOW": 12, "MODERATE": 42, "HIGH": 72, "EXTREME": 90}


def conditions(payload: dict) -> tuple[str, list[dict]]:
    """Weather favourability for foliar infection, on its own.

    Moisture gates the whole thing. A dry leaf does not get a fungal infection
    at any temperature, so temperature is a *multiplier* on wet conditions
    rather than an independent third of the score. Counting all three equally
    made 26 °C on a dry, 40%-humidity day read as MODERATE disease pressure,
    which is both wrong and the kind of twitchiness that gets a risk panel
    ignored.

    Leaf wetness is what actually matters and nothing here measures it; high
    humidity and recent rain are the two proxies available.
    """
    humidity = payload.get("humidity")
    temp = payload.get("temp_c")
    rain = payload.get("rain_24h_mm")

    factors: list[dict] = []
    moisture = 0

    if humidity is not None and humidity >= T.DISEASE_HUMIDITY_PCT:
        moisture += 1
        factors.append({
            "label": "Humidity",
            "value": f"{humidity:.0f}%",
            "note": f"At or above {T.DISEASE_HUMIDITY_PCT:.0f}%, which favours foliar infection",
        })
    if rain is not None and rain >= T.DISEASE_LEAF_WET_MM:
        moisture += 1
        factors.append({
            "label": "Rainfall",
            "value": f"{rain:.0f} mm",
            "note": "Enough to keep leaves wet",
        })

    if moisture == 0:
        # Nothing is keeping the leaves wet. Report the temperature only if it
        # would matter once they were, so the reader can see it was checked.
        if temp is not None and T.DISEASE_TEMP_MIN_C <= temp <= T.DISEASE_TEMP_MAX_C:
            factors.append({
                "label": "Temperature",
                "value": f"{temp:.0f} °C",
                "note": "Inside the favourable window, but the canopy is dry",
            })
        return "LOW", factors

    temp_ok = temp is not None and T.DISEASE_TEMP_MIN_C <= temp <= T.DISEASE_TEMP_MAX_C
    if temp_ok:
        factors.append({
            "label": "Temperature",
            "value": f"{temp:.0f} °C",
            "note": f"Inside the {T.DISEASE_TEMP_MIN_C:.0f}–{T.DISEASE_TEMP_MAX_C:.0f} °C window most foliar pathogens prefer",
        })

    band = ("LOW", "MODERATE", "HIGH")[moisture]
    if temp_ok:
        band = BANDS[min(BAND_INDEX[band] + 1, len(BANDS) - 1)]
    return band, factors


def assess(payload: dict) -> DiseaseRisk:
    """
    payload:
      prediction          str | None    the model's class, verbatim
      confidence          float | None  0–1, the model's own
      humidity, temp_c, rain_24h_mm     float | None
      crop, sown_at                     str | None
    """
    raw = payload.get("prediction")
    detected = str(raw).strip() if raw not in (None, "") else None
    conf = payload.get("confidence")
    conf = float(conf) if isinstance(conf, (int, float)) else None

    cond_band, factors = conditions(payload)
    stage = stage_for(payload.get("crop"), payload.get("sown_at"))

    healthy = detected is not None and any(t in detected.lower() for t in HEALTHY_TOKENS)

    # ---- no image, or the model says healthy: conditions only -----------
    if detected is None or healthy:
        # Conditions alone never reach EXTREME. Perfect weather for a pathogen
        # is a reason to walk the field, not evidence that anything is wrong —
        # and "EXTREME disease risk" on a crop nobody has looked at is the
        # kind of alarm that gets the whole product muted.
        band = BANDS[min(BAND_INDEX[cond_band], BAND_INDEX["HIGH"])]
        if healthy:
            # Positive evidence of health outranks favourable weather. Still
            # worth watching, never worth acting on.
            band = BANDS[min(BAND_INDEX[band], BAND_INDEX["MODERATE"])]
        if detected is None:
            explanation = (
                "No leaf image was analysed, so nothing has been detected. This is the risk "
                "from *conditions* alone — how favourable the weather is for foliar disease."
            )
        else:
            explanation = (
                f"The model classed the leaf as “{detected}”. Conditions are {cond_band.lower()} "
                "for foliar infection, which is worth watching even on a clean crop — but a "
                "healthy reading is evidence, so the band is held below the conditions alone."
            )
        actions = (["Walk the field and check the lower canopy",
                    "Avoid overhead irrigation while humidity stays high"]
                   if band in ("HIGH", "EXTREME") else [])
        return DiseaseRisk(
            band=band, score=_SCORE[band], detected=detected, detection_confidence=conf,
            conditions_band=cond_band, factors=factors, actions=actions,
            confidence="MEDIUM" if len(factors) >= 2 else "LOW",
            explanation=explanation,
        )

    # ---- a class was returned: fuse it with conditions -------------------
    factors.insert(0, {
        "label": "Image model",
        "value": detected,
        "note": f"{conf * 100:.0f}% confidence" if conf is not None else "confidence not reported",
    })
    if stage["days_after_sowing"] is not None:
        factors.append({"label": "Crop stage", "value": stage["stage_label"], "note": stage["reason"]})

    # Start from the detection, then let conditions move it one step.
    base = "HIGH" if (conf is not None and conf >= GOOD_CONFIDENCE) else "MODERATE"
    band = base
    if BAND_INDEX[cond_band] >= BAND_INDEX["HIGH"]:
        band = BANDS[min(BAND_INDEX[band] + 1, len(BANDS) - 1)]
    elif cond_band == "LOW":
        band = BANDS[max(BAND_INDEX[band] - 1, 0)]

    # The cap. A shaky class cannot produce a confident verdict, whatever the
    # weather is doing — this is the rule that stops the fusion from laundering
    # a 41% guess into a HIGH-risk instruction.
    capped = False
    if conf is not None and conf < LOW_CONFIDENCE:
        if BAND_INDEX[band] > BAND_INDEX["MODERATE"]:
            capped = True
        band = BANDS[min(BAND_INDEX[band], BAND_INDEX["MODERATE"])]

    explanation = (
        f"“{detected}” was returned by the image model"
        + (f" at {conf * 100:.0f}% confidence" if conf is not None else "")
        + f", and current conditions are {cond_band.lower()} for foliar infection."
    )
    if capped:
        explanation += (
            f" The risk band is held at MODERATE because the model is below {LOW_CONFIDENCE * 100:.0f}% "
            "confident — treat this as a reason to look, not a finding."
        )

    actions = ["Inspect nearby plants for the same symptoms",
               "Photograph a second leaf and run it again"]
    if band in ("HIGH", "EXTREME"):
        actions.append("Avoid overhead irrigation while humidity stays high")
        actions.append("Ask your local extension officer before applying any treatment")

    confidence = "HIGH" if (conf is not None and conf >= GOOD_CONFIDENCE and len(factors) >= 3) else \
                 "LOW" if (conf is None or conf < LOW_CONFIDENCE) else "MEDIUM"

    return DiseaseRisk(
        band=band, score=_SCORE[band], detected=detected, detection_confidence=conf,
        conditions_band=cond_band, factors=factors, actions=actions,
        confidence=confidence, explanation=explanation,
    )


__all__ = ["DiseaseRisk", "assess", "conditions", "LOW_CONFIDENCE", "GOOD_CONFIDENCE"]
