"""
Whether to irrigate, and — just as importantly — what the answer did not know.

The PRD (§19) wants soil type, crop stage, recent irrigation and soil moisture
in this decision. Most of the time only some of those exist. The engine
therefore does two things at once: it computes the best recommendation the
available inputs support, and it returns the list of inputs it *lacked*, so
the interface can show both. A recommendation that hides its gaps is the one
a farmer would be wrong to trust.

Confidence is not decoration here. It falls as inputs go missing, and the
words change with it: a rainfall-only answer says "wait" with MEDIUM
confidence, never "do not irrigate" with HIGH.
"""
from __future__ import annotations

from dataclasses import dataclass, field

from . import thresholds as T
from .crop_calendar import stage_for

#: Stages where water stress costs the most yield, so the engine leans towards
#: irrigating when it is unsure.
MOISTURE_CRITICAL = ("germination", "flowering", "filling")

#: Soils that hold little water, so they dry out between rains sooner.
LIGHT_SOILS = ("sandy", "laterite", "red")
#: …and those that hold a lot, so standing water is the greater risk.
HEAVY_SOILS = ("clay", "black", "black (regur)", "regur")


@dataclass
class Irrigation:
    recommendation: str          # "Irrigate" | "Wait" | "Do not irrigate" | "Check the soil" | "Unknown"
    band: str                    # LOW | MODERATE | HIGH | EXTREME — urgency, not hazard
    reason: str
    confidence: str              # LOW | MEDIUM | HIGH
    factors: list[dict] = field(default_factory=list)
    inputs_used: list[str] = field(default_factory=list)
    inputs_missing: list[str] = field(default_factory=list)
    disclaimer: str = (
        "Screening guidance from rainfall and temperature. It does not replace "
        "checking the soil at root depth, and it is not agronomic advice."
    )


def assess(payload: dict) -> Irrigation:
    """
    payload:
      rain_24h_mm, rain_48h_mm, rain_72h_mm   float | None
      temp_c, humidity, wind_kmh              float | None
      soil_type                               str | None
      crop, sown_at                           str | None
      last_irrigated_days                     int | None
      soil_moisture_pct                       float | None   (a sensor, if any)
    """
    r24 = payload.get("rain_24h_mm")
    r48 = payload.get("rain_48h_mm")
    r72 = payload.get("rain_72h_mm")
    temp = payload.get("temp_c")
    humidity = payload.get("humidity")
    wind = payload.get("wind_kmh")
    soil = (payload.get("soil_type") or "").strip().lower()
    crop = payload.get("crop")
    last = payload.get("last_irrigated_days")
    moisture = payload.get("soil_moisture_pct")

    used: list[str] = []
    missing: list[str] = []
    factors: list[dict] = []

    for label, value in (
        ("24 h rainfall", r24), ("48 h rainfall", r48), ("72 h rainfall", r72),
        ("air temperature", temp), ("humidity", humidity),
        ("soil type", soil or None), ("crop stage", crop),
        ("days since last irrigation", last), ("soil moisture", moisture),
    ):
        (used if value not in (None, "") else missing).append(label)

    # --- no rainfall figure means no answer. Say so. -----------------------
    if r24 is None and r48 is None and moisture is None:
        return Irrigation(
            recommendation="Unknown",
            band="LOW",
            reason="No rainfall forecast is available for this place, so no recommendation is possible.",
            confidence="LOW",
            factors=[],
            inputs_used=used,
            inputs_missing=missing,
        )

    stage = stage_for(crop, payload.get("sown_at"))
    critical = stage["stage"] in MOISTURE_CRITICAL
    demand = T.evaporative_demand(temp, humidity, wind)
    et = T.ET_MM_PER_DAY[demand]

    # A direct sensor reading outranks every inference below it.
    if moisture is not None:
        if moisture >= 70:
            rec, band, why = "Do not irrigate", "LOW", f"Soil moisture is {moisture:.0f}% — the profile is already wet."
        elif moisture <= 30:
            rec, band, why = "Irrigate", "HIGH", f"Soil moisture is {moisture:.0f}% — below the comfortable range."
        else:
            rec, band, why = "Check the soil", "MODERATE", f"Soil moisture is {moisture:.0f}% — borderline."
        factors.append({"label": "Soil moisture sensor", "value": f"{moisture:.0f}%", "weight": "decisive"})
        return Irrigation(
            recommendation=rec, band=band, reason=why,
            confidence="HIGH", factors=factors, inputs_used=used, inputs_missing=missing,
        )

    # --- rainfall-led decision -------------------------------------------
    rec, band, why = "Check the soil", "MODERATE", ""

    if r24 is not None and r24 >= T.IRRIGATION_SKIP_MM_24H:
        rec, band = "Do not irrigate", "LOW"
        why = f"{r24:.0f} mm is forecast in the next 24 hours — more than the crop can use."
        factors.append({"label": "24 h rainfall", "value": f"{r24:.0f} mm", "weight": "decisive"})
    elif r48 is not None and r48 >= T.IRRIGATION_WAIT_MM_48H:
        rec, band = "Wait", "LOW"
        why = f"About {r48:.0f} mm is expected over the next two days."
        factors.append({"label": "48 h rainfall", "value": f"{r48:.0f} mm", "weight": "decisive"})
    elif r72 is not None and r72 >= T.IRRIGATION_RECENT_MM_72H:
        rec, band = "Wait", "LOW"
        why = f"{r72:.0f} mm fell in the last 72 hours — the profile is probably still wet."
        factors.append({"label": "72 h rainfall", "value": f"{r72:.0f} mm", "weight": "decisive"})
    elif demand in ("high", "very_high") and (r24 or 0) < 5:
        rec, band = "Irrigate", "HIGH" if critical else "MODERATE"
        why = (
            f"Little rain forecast and evaporative demand is {demand.replace('_', ' ')} "
            f"(about {et:.0f} mm/day)."
        )
        factors.append({"label": "Evaporative demand", "value": demand.replace("_", " "), "weight": "decisive"})
    else:
        why = "Rainfall alone does not settle this — feel the soil at root depth before deciding."

    # --- modifiers, each one named ---------------------------------------
    if soil:
        if any(s in soil for s in LIGHT_SOILS):
            factors.append({"label": "Soil type", "value": f"{soil} — drains fast", "weight": "raises"})
            if rec == "Check the soil":
                rec, band = "Irrigate", "MODERATE"
                why += " Light soil holds little water between rains."
        elif any(s in soil for s in HEAVY_SOILS):
            factors.append({"label": "Soil type", "value": f"{soil} — holds water", "weight": "lowers"})
            if rec == "Irrigate" and band != "HIGH":
                band = "LOW"
                why += " Heavy soil will hold what it has for longer."

    if critical:
        factors.append({"label": "Crop stage", "value": f"{stage['stage_label']} — moisture-critical", "weight": "raises"})
        if rec in ("Check the soil", "Irrigate"):
            band = T.max_band(band, "HIGH")

    if last is not None:
        factors.append({"label": "Last irrigated", "value": f"{last} days ago", "weight": "context"})
        if last <= 2 and rec == "Irrigate":
            rec = "Wait"
            why += f" The field was watered {last} day{'s' if last != 1 else ''} ago."

    # --- confidence -------------------------------------------------------
    # Confidence answers "would more inputs change this?", not "how many
    # inputs did we have?". 118 mm of forecast rain settles the question on
    # its own — knowing the soil type as well would not change the answer, so
    # counting the gaps would understate a call that is actually certain.
    # Conversely a marginal case stays low however much is known.
    decisive_rain = (r24 is not None and r24 >= T.IRRIGATION_SKIP_MM_24H * 2) or \
                    (r72 is not None and r72 >= T.IRRIGATION_RECENT_MM_72H * 2)
    if decisive_rain:
        confidence = "HIGH"
    else:
        have = sum(1 for x in (r24, r48, temp, soil or None, stage["days_after_sowing"]) if x is not None)
        confidence = "HIGH" if have >= 5 else "MEDIUM" if have >= 3 else "LOW"
        # "Do not irrigate" is safe to be wrong about; "irrigate" costs water
        # and a day's work, so rainfall alone never claims high confidence.
        if rec == "Irrigate" and confidence == "HIGH" and moisture is None:
            confidence = "MEDIUM"

    return Irrigation(
        recommendation=rec,
        band=band,
        reason=why.strip(),
        confidence=confidence,
        factors=factors,
        inputs_used=used,
        inputs_missing=missing,
    )


__all__ = ["Irrigation", "assess", "MOISTURE_CRITICAL"]
