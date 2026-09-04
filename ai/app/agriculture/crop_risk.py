"""
The farm risk engine — PRD §20.

Nine categories, each scored, banded and explained. The shape deliberately
matches `engines/risk.py`: a band, a score, contributing factors and the
actions that follow, so the interface renders a farm risk exactly the way it
renders a weather risk and a reader learns one pattern instead of two.

Three rules carried over from the weather engine, because they are what make
the output trustworthy rather than merely plausible:

  * **A missing input is never an assumption.** A category with no data
    returns `band: None` and is reported as unassessed, not as LOW. "We did
    not look" and "we looked and it is fine" are different answers.
  * **Floors only raise.** An active official warning can lift a farm risk
    band; nothing can lower one.
  * **Every factor names its number.** If the interface shows HIGH, the
    reason list contains the value and the threshold it crossed.
"""
from __future__ import annotations

from dataclasses import dataclass, field

from ..engines.thresholds import BAND_INDEX, BANDS, COLOUR_FLOOR, max_band
from . import thresholds as T
from .crop_calendar import stage_for

#: The order the interface shows them in — most consequential first.
CATEGORIES = (
    "flood", "heat_stress", "cold_stress", "water_stress",
    "disease", "pest", "wind", "harvest", "spray_window",
)

#: Categories that describe **danger to the crop**. Only these set the overall
#: band.
#:
#: `spray_window` is deliberately excluded. A closed spray window is an
#: operational inconvenience — you spray on Thursday instead of Tuesday — and
#: letting it drive the headline meant a farm on a breezy but otherwise
#: perfect day reported EXTREME risk. That is the kind of false alarm that
#: teaches people to ignore the real ones.
#:
#: `harvest` stays in: rain on a ripe standing crop is lost yield, not a
#: rescheduled task.
HAZARD_CATEGORIES = (
    "flood", "heat_stress", "cold_stress", "water_stress",
    "disease", "pest", "wind", "harvest",
)

LABELS = {
    "flood": "Flooding / waterlogging",
    "heat_stress": "Heat stress",
    "cold_stress": "Cold stress / frost",
    "water_stress": "Water stress",
    "disease": "Disease pressure",
    "pest": "Pest pressure",
    "wind": "Wind damage",
    "harvest": "Harvest window",
    "spray_window": "Spray window",
}

_SCORE = {"LOW": 10, "MODERATE": 40, "HIGH": 70, "EXTREME": 92}


@dataclass
class Category:
    key: str
    label: str
    band: str | None                 # None == not assessed
    score: int | None
    factors: list[dict] = field(default_factory=list)
    actions: list[str] = field(default_factory=list)
    note: str = ""


@dataclass
class FarmRisk:
    overall: str | None
    score: int | None
    categories: list[Category] = field(default_factory=list)
    unassessed: list[str] = field(default_factory=list)
    floored_by: str | None = None
    confidence: str = "MEDIUM"
    disclaimer: str = (
        "Screening risk from weather and crop stage. It is not a field "
        "inspection and it is not agronomic advice."
    )


def _cat(key, band, factors=None, actions=None, note="") -> Category:
    return Category(
        key=key,
        label=LABELS[key],
        band=band,
        score=_SCORE[band] if band else None,
        factors=factors or [],
        actions=actions or [],
        note=note,
    )


def assess(payload: dict) -> FarmRisk:
    """
    payload:
      rain_24h_mm, rain_72h_mm, temp_max_c, temp_min_c, humidity,
      wind_kmh, gust_kmh                        float | None
      crop, sown_at, soil_type                  str | None
      warning_colour                            str | None  (active CAP alert)
    """
    r24 = payload.get("rain_24h_mm")
    r72 = payload.get("rain_72h_mm")
    tmax = payload.get("temp_max_c")
    tmin = payload.get("temp_min_c")
    humidity = payload.get("humidity")
    wind = payload.get("wind_kmh")
    gust = payload.get("gust_kmh") or wind
    crop = payload.get("crop")
    soil = (payload.get("soil_type") or "").strip().lower()

    stage = stage_for(crop, payload.get("sown_at"))
    temps = T.crop_temps(crop)
    in_critical = stage["stage"] in temps.critical_stages

    cats: list[Category] = []

    # ------------------------------------------------------------- flood --
    if r24 is None:
        cats.append(_cat("flood", None, note="No rainfall forecast."))
    else:
        band, label = T.classify(r24, T.FLOOD_LADDER)
        factors = [{"label": "24 h rainfall", "value": f"{r24:.0f} mm", "note": label}]
        # Wet ground turns the same rainfall into a worse outcome.
        if r72 is not None and r72 >= 50 and band != "LOW":
            band = max_band(band, "HIGH")
            factors.append({"label": "Last 72 h", "value": f"{r72:.0f} mm", "note": "Ground already wet"})
        if soil and any(s in soil for s in ("clay", "black", "regur")):
            factors.append({"label": "Soil type", "value": soil, "note": "Drains slowly"})
            if band in ("MODERATE", "HIGH"):
                band = max_band(band, "HIGH")
        actions = []
        if band in ("HIGH", "EXTREME"):
            actions = ["Clear field drains before the rain arrives",
                       "Move harvested produce to covered storage"]
        elif band == "MODERATE":
            actions = ["Check low-lying corners of the field for standing water"]
        cats.append(_cat("flood", band, factors, actions))

    # -------------------------------------------------------- heat stress --
    if tmax is None:
        cats.append(_cat("heat_stress", None, note="No maximum temperature."))
    else:
        over = tmax - temps.heat_stress
        band = "LOW"
        if over >= 6:
            band = "EXTREME"
        elif over >= 3:
            band = "HIGH"
        elif over >= 0:
            band = "MODERATE"
        factors = [{
            "label": "Maximum temperature",
            "value": f"{tmax:.0f} °C",
            "note": f"{crop or 'crop'} stress threshold {temps.heat_stress:.0f} °C",
        }]
        if in_critical and band != "LOW":
            band = max_band(band, "HIGH")
            factors.append({"label": "Crop stage", "value": stage["stage_label"],
                            "note": "Heat during this stage costs yield directly"})
        cats.append(_cat("heat_stress", band, factors,
                         ["Irrigate in the evening to cool the canopy"] if band in ("HIGH", "EXTREME") else []))

    # -------------------------------------------------------- cold stress --
    if tmin is None:
        cats.append(_cat("cold_stress", None, note="No minimum temperature."))
    else:
        under = temps.cold_stress - tmin
        band = "LOW"
        if under >= 4:
            band = "EXTREME"
        elif under >= 2:
            band = "HIGH"
        elif under >= 0:
            band = "MODERATE"
        cats.append(_cat("cold_stress", band, [{
            "label": "Minimum temperature", "value": f"{tmin:.0f} °C",
            "note": f"{crop or 'crop'} cold threshold {temps.cold_stress:.0f} °C",
        }], ["Light evening irrigation raises the canopy minimum by a degree or two"] if band in ("HIGH", "EXTREME") else []))

    # ------------------------------------------------------ water stress --
    if r24 is None and r72 is None:
        cats.append(_cat("water_stress", None, note="No rainfall data."))
    else:
        recent = (r72 or 0) + (r24 or 0)
        demand = T.evaporative_demand(tmax, humidity, wind)
        band = "LOW"
        if recent < 5 and demand in ("high", "very_high"):
            band = "HIGH" if in_critical else "MODERATE"
        elif recent < 15 and demand == "very_high":
            band = "MODERATE"
        cats.append(_cat("water_stress", band, [
            {"label": "Rain, last 72 h + next 24 h", "value": f"{recent:.0f} mm"},
            {"label": "Evaporative demand", "value": demand.replace("_", " ")},
        ], ["Irrigate before the crop shows visible stress"] if band in ("HIGH", "EXTREME") else []))

    # ----------------------------------------------------------- disease --
    if humidity is None or tmax is None:
        cats.append(_cat("disease", None, note="Humidity or temperature missing."))
    else:
        # One implementation, called from both places. This block used to
        # restate the favourability rules and the two promptly drifted.
        from .disease import conditions as disease_conditions

        band, factors = disease_conditions({"humidity": humidity, "temp_c": tmax, "rain_24h_mm": r24})
        cats.append(_cat("disease", band, factors,
                         ["Walk the field and check the lower canopy",
                          "Avoid overhead irrigation while humidity stays high"] if band in ("HIGH", "EXTREME") else [],
                         note="Conditions only. Run Crop Doctor on a leaf photo for a class."))

    # -------------------------------------------------------------- pest --
    # Deliberately never assessed from weather alone. Pest pressure needs
    # scouting or a trap count, and a weather-only "pest risk: HIGH" would be
    # a number with nothing behind it.
    cats.append(_cat("pest", None,
                     note="Not assessed. Pest pressure needs field scouting or trap counts, "
                          "which this service does not receive."))

    # -------------------------------------------------------------- wind --
    if gust is None:
        cats.append(_cat("wind", None, note="No wind data."))
    else:
        band = "LOW"
        if gust >= 62:
            band = "EXTREME"
        elif gust >= 40:
            band = "HIGH"
        elif gust >= 20:
            band = "MODERATE"
        factors = [{"label": "Gusts", "value": f"{gust:.0f} km/h"}]
        if stage["stage"] in ("filling", "harvest") and band in ("HIGH", "EXTREME"):
            factors.append({"label": "Crop stage", "value": stage["stage_label"], "note": "Lodging risk"})
        cats.append(_cat("wind", band, factors,
                         ["Stake or tie anything that can lodge", "Delay top-heavy irrigation"] if band in ("HIGH", "EXTREME") else []))

    # ----------------------------------------------------------- harvest --
    if stage["stage"] not in ("filling", "harvest") or r24 is None:
        cats.append(_cat("harvest", None,
                         note="Only assessed at grain filling and harvest." if r24 is not None
                              else "No rainfall forecast."))
    else:
        band, label = T.classify(r24, T.HARVEST_LADDER)
        cats.append(_cat("harvest", band,
                         [{"label": "24 h rainfall", "value": f"{r24:.0f} mm", "note": label}],
                         ["Bring the harvest forward if the crop is ready",
                          "Cover anything already cut"] if band in ("HIGH", "EXTREME") else []))

    # ------------------------------------------------------- spray window --
    if wind is None:
        cats.append(_cat("spray_window", None, note="No wind data."))
    else:
        rain_soon = (r24 or 0) >= 2
        if wind >= T.SPRAY_WIND_STOP_KMH:
            band, note = "EXTREME", f"Winds {wind:.0f} km/h — drift risk, do not spray."
        elif wind > T.SPRAY_WIND_MAX_KMH:
            band, note = "HIGH", f"Winds {wind:.0f} km/h, above the {T.SPRAY_WIND_MAX_KMH:.0f} km/h screening limit."
        elif wind < T.SPRAY_WIND_MIN_KMH:
            band, note = "MODERATE", f"Winds {wind:.0f} km/h — too still, coverage suffers and drift can hang."
        elif rain_soon:
            band, note = "HIGH", f"{r24:.0f} mm expected — most foliar products need {T.SPRAY_RAINFAST_HOURS} h to become rainfast."
        else:
            band, note = "LOW", f"Winds {wind:.0f} km/h and no rain forecast — the window is open."
        cats.append(_cat("spray_window", band, [{"label": "Wind", "value": f"{wind:.0f} km/h"}], note=note))

    # --------------------------------------------------------- roll it up --
    scored = [c for c in cats if c.band]
    unassessed = [c.label for c in cats if not c.band]
    # Only hazards set the headline; advisory windows are reported alongside.
    hazards = [c for c in scored if c.key in HAZARD_CATEGORIES]

    if not hazards:
        return FarmRisk(overall=None, score=None, categories=cats, unassessed=unassessed, confidence="LOW")

    # The worst single category sets the band. Averaging would let four
    # comfortable categories hide one EXTREME, which is exactly backwards for
    # a warning product.
    overall = BANDS[max(BAND_INDEX[c.band] for c in hazards)]
    floored_by = None

    colour = (payload.get("warning_colour") or "").strip().lower()
    if colour in COLOUR_FLOOR:
        floor = COLOUR_FLOOR[colour]
        if BAND_INDEX[floor] > BAND_INDEX[overall]:
            overall = floor
            floored_by = f"{colour} alert"

    score = max(c.score for c in hazards)
    if floored_by:
        score = max(score, _SCORE[overall])

    # Confidence falls with the number of *hazard* categories we could not
    # look at — the spray window's presence or absence says nothing about how
    # well we understand the risk.
    ratio = len(hazards) / len(HAZARD_CATEGORIES)
    confidence = "HIGH" if ratio >= 0.75 else "MEDIUM" if ratio >= 0.5 else "LOW"

    return FarmRisk(
        overall=overall,
        score=score,
        categories=cats,
        unassessed=unassessed,
        floored_by=floored_by,
        confidence=confidence,
    )


__all__ = ["CATEGORIES", "HAZARD_CATEGORIES", "LABELS", "Category", "FarmRisk", "assess"]
