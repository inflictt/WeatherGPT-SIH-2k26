"""
The risk engine.

Deterministic. Every output carries the rule that produced it, so the UI can
print the reasoning and a judge can audit it. No model is trained here — see
thresholds.py for why.

Two floors, and both only ever raise:

    1. WARNING FLOOR — an active official warning sets a minimum risk band.
       An orange alert means at least HIGH, whatever we computed.
    2. HAZARD FLOOR — the composite can never sit below the worst individual
       hazard. 400 mm of rain is an extreme day even if the wind is calm and
       the official alert has not caught up yet; a weighted average must not
       be allowed to average that away.

The second exists because the first is not enough: weights dilute a single
severe hazard, and diluting "extremely heavy rainfall" is exactly the failure
this product cannot have. Both are tested on every branch.
"""
from __future__ import annotations

from dataclasses import dataclass, field, asdict
from typing import Any, Iterable

from .thresholds import (
    ANTECEDENT_HEAVY_MM,
    ANTECEDENT_SATURATION_MM,
    BAND_INDEX,
    BANDS,
    CAP_SEVERITY_COLOUR,
    COLOUR_FLOOR,
    HEATWAVE_ABSOLUTE_C,
    HEATWAVE_DEPARTURE_C,
    HEAT_FLOOR_C,
    RAINFALL_24H,
    SEVERE_HEATWAVE_ABSOLUTE_C,
    SEVERE_HEATWAVE_DEPARTURE_C,
    VISIBILITY_KM,
    WEIGHTS,
    WIND_KMH,
    Band,
    band_from_score,
    classify,
    max_band,
    rainfall_colour,
)

ENGINE_VERSION = "3.0.0"


@dataclass
class Component:
    key: str
    label: str
    band: Band
    weight: int
    note: str

    def as_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class RiskResult:
    overall: Band
    score: int
    computed_band: Band
    floored_by: dict[str, Any] | None
    hazard_floor: dict[str, Any] | None
    breakdown: list[dict[str, Any]]
    derived: dict[str, dict[str, str]]
    rainfall_colour: str
    engine_version: str = ENGINE_VERSION
    notes: list[str] = field(default_factory=list)


# --------------------------------------------------------------------------
# Interpolation helpers
# --------------------------------------------------------------------------
def _ramp(value: float | None, points: Iterable[tuple[float, float]]) -> float:
    """Piecewise-linear map from a measurement to a 0..1 contribution.

    The knots are the IMD band boundaries, so each band occupies an equal
    third of the range. That keeps the score explainable: 'very heavy' always
    contributes about two thirds of the rainfall weight, whatever the mm.
    """
    if value is None:
        return 0.0
    pts = sorted(points)
    if value <= pts[0][0]:
        return pts[0][1]
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        if value <= x1:
            span = x1 - x0
            return y0 if span == 0 else y0 + (value - x0) * (y1 - y0) / span
    return pts[-1][1]


RAIN_RAMP = ((0.0, 0.0), (64.5, 0.34), (115.6, 0.67), (204.5, 1.0))
WIND_RAMP = ((0.0, 0.0), (20.0, 0.34), (40.0, 0.67), (62.0, 1.0))
ANTECEDENT_RAMP = ((0.0, 0.0), (ANTECEDENT_SATURATION_MM, 0.5), (ANTECEDENT_HEAVY_MM, 1.0))
COLOUR_FRACTION = {"green": 0.0, "yellow": 0.34, "orange": 0.67, "red": 1.0}


def _visibility_fraction(km: float | None) -> float:
    if km is None:
        return 0.0
    return _ramp(-km, ((-10.0, 0.0), (-4.0, 0.34), (-1.0, 0.67), (-0.2, 1.0)))


def _visibility_band(km: float | None) -> tuple[Band, str]:
    if km is None:
        return "LOW", "no visibility data"
    for at, band, label in VISIBILITY_KM:
        if km <= at:
            return band, label
    return "LOW", "visibility is good"


# --------------------------------------------------------------------------
# Warnings
# --------------------------------------------------------------------------
def warning_colour(warning: dict[str, Any]) -> str:
    """Trust an explicit colour; otherwise derive it from CAP severity."""
    colour = (warning.get("colour") or "").lower()
    if colour in COLOUR_FLOOR:
        return colour
    return CAP_SEVERITY_COLOUR.get(warning.get("severity") or "Unknown", "green")


def strongest_warning(warnings: list[dict[str, Any]]) -> dict[str, Any] | None:
    if not warnings:
        return None
    return max(warnings, key=lambda w: BAND_INDEX[COLOUR_FLOOR[warning_colour(w)]])


def apply_safety_floor(
    computed: Band, warnings: list[dict[str, Any]]
) -> tuple[Band, dict[str, Any] | None]:
    """Raise `computed` to the floor imposed by the most severe active warning.

    Returns the final band and, when the floor actually changed the outcome,
    a record of what did it. If our own model already reached or exceeded the
    floor, no record is emitted — the floor was not needed.
    """
    top = strongest_warning(warnings)
    if top is None:
        return computed, None

    colour = warning_colour(top)
    floor = COLOUR_FLOOR[colour]
    final = max_band(computed, floor)

    if BAND_INDEX[final] > BAND_INDEX[computed]:
        return final, {
            "colour": colour,
            "minimum": floor,
            "raised_from": computed,
            "identifier": top.get("identifier"),
            "event": top.get("event"),
            "severity": top.get("severity"),
        }
    return final, None


def apply_hazard_floor(
    computed: Band, hazards: dict[str, Band]
) -> tuple[Band, dict[str, Any] | None]:
    """Raise `computed` to the worst individual hazard band.

    The weighted score is good at nuance and bad at emergencies: six terms
    each capped at their own weight mean no single hazard can carry the total
    on its own. Rainfall of 400 mm is EXTREME by IMD's own category and the
    overall assessment must say so, so the worst primary hazard acts as a
    floor in exactly the way an official warning does.
    """
    if not hazards:
        return computed, None
    worst_key, worst_band = max(hazards.items(), key=lambda kv: BAND_INDEX[kv[1]])
    final = max_band(computed, worst_band)
    if BAND_INDEX[final] > BAND_INDEX[computed]:
        return final, {"hazard": worst_key, "band": worst_band, "raised_from": computed}
    return final, None


# --------------------------------------------------------------------------
# Derived, domain-facing risks
# --------------------------------------------------------------------------
def flood_risk(rain_band: Band, antecedent_mm: float | None, urban_prone: bool) -> tuple[Band, str]:
    """Forecast rain, plus what already fell, plus whether the place floods."""
    idx = BAND_INDEX[rain_band]
    reasons = []
    ante = antecedent_mm or 0.0

    if ante >= ANTECEDENT_HEAVY_MM:
        idx += 1
        reasons.append(f"{ante:.0f} mm already fell in the last 72 h — ground is saturated")
    elif ante >= ANTECEDENT_SATURATION_MM:
        reasons.append(f"{ante:.0f} mm in the last 72 h — ground is already wet")

    if urban_prone and idx >= 1:
        idx += 1
        reasons.append("this location is flagged as prone to urban flooding")

    band = BANDS[min(idx, len(BANDS) - 1)]
    if not reasons:
        reasons.append("no significant antecedent rainfall")
    return band, "; ".join(reasons)


def travel_risk(rain_band: Band, wind_band: Band, vis_band: Band) -> tuple[Band, str]:
    band = max_band(rain_band, wind_band, vis_band)
    driver = max(
        (("rainfall", rain_band), ("wind", wind_band), ("visibility", vis_band)),
        key=lambda p: BAND_INDEX[p[1]],
    )[0]
    return band, f"driven by {driver}"


def outdoor_risk(rain_band: Band, wind_band: Band, heat_band: Band) -> tuple[Band, str]:
    band = max_band(rain_band, wind_band, heat_band)
    driver = max(
        (("rainfall", rain_band), ("wind", wind_band), ("heat", heat_band)),
        key=lambda p: BAND_INDEX[p[1]],
    )[0]
    return band, f"driven by {driver}"


def heat_risk(
    temp_max_c: float | None, zone: str = "plains", normal_max_c: float | None = None
) -> tuple[Band, str]:
    """IMD heat wave criteria.

    A true declaration needs the departure from the climatological normal. When
    the caller supplies one we use it; when it does not, we fall back to the
    absolute thresholds alone and say so, rather than inventing a normal.
    """
    if temp_max_c is None:
        return "LOW", "no maximum temperature available"

    floor = HEAT_FLOOR_C.get(zone, HEAT_FLOOR_C["plains"])
    if temp_max_c < floor:
        return "LOW", f"max {temp_max_c:.0f} °C is below the {zone} heat wave floor of {floor:.0f} °C"

    if normal_max_c is not None:
        departure = temp_max_c - normal_max_c
        if departure >= SEVERE_HEATWAVE_DEPARTURE_C or temp_max_c >= SEVERE_HEATWAVE_ABSOLUTE_C:
            return "EXTREME", f"severe heat wave criteria met (departure {departure:+.1f} °C)"
        if departure >= HEATWAVE_DEPARTURE_C:
            return "HIGH", f"heat wave criteria met (departure {departure:+.1f} °C)"
        return "MODERATE", f"hot ({temp_max_c:.0f} °C) but departure {departure:+.1f} °C is below the 4.5 °C criterion"

    if temp_max_c >= SEVERE_HEATWAVE_ABSOLUTE_C:
        return "EXTREME", f"max {temp_max_c:.0f} °C meets the absolute severe heat wave threshold"
    if temp_max_c >= HEATWAVE_ABSOLUTE_C:
        return "HIGH", f"max {temp_max_c:.0f} °C meets the absolute heat wave threshold"
    return (
        "MODERATE",
        f"max {temp_max_c:.0f} °C is above the {zone} floor; no climatological normal supplied, "
        f"so the 4.5 °C departure criterion could not be applied",
    )


# --------------------------------------------------------------------------
# The entry point
# --------------------------------------------------------------------------
def score(payload: dict[str, Any]) -> RiskResult:
    """Turn a forecast plus active warnings into a banded, explained risk."""
    fc = payload.get("forecast") or {}
    loc = payload.get("location") or {}
    ante = (payload.get("antecedent") or {}).get("rain_72h_mm")
    warnings = payload.get("warnings") or []

    rain_mm = fc.get("rain_24h_mm")
    wind_kmh = fc.get("wind_kmh")
    gust_kmh = fc.get("gust_kmh")
    vis_km = fc.get("visibility_km")
    wet_hours = fc.get("rain_duration_hours") or 0
    temp_max = fc.get("temp_max_c")
    zone = loc.get("zone") or "plains"
    urban_prone = bool(loc.get("urban_flood_prone"))

    # --- primary hazards -------------------------------------------------
    rain_band, rain_note = classify(rain_mm, RAINFALL_24H)
    wind_band, wind_note = classify(wind_kmh, WIND_KMH)
    vis_band, vis_note = _visibility_band(vis_km)
    heat_band, heat_note = heat_risk(temp_max, zone, fc.get("temp_normal_max_c"))

    top = strongest_warning(warnings)
    top_colour = warning_colour(top) if top else "green"

    # --- score -----------------------------------------------------------
    contributions = {
        "rainfall": WEIGHTS["rainfall"] * _ramp(rain_mm, RAIN_RAMP),
        "warning": WEIGHTS["warning"] * COLOUR_FRACTION[top_colour],
        "wind": WEIGHTS["wind"] * _ramp(max(wind_kmh or 0, (gust_kmh or 0) * 0.75), WIND_RAMP),
        "antecedent": WEIGHTS["antecedent"] * _ramp(ante, ANTECEDENT_RAMP),
        "duration": WEIGHTS["duration"] * min(1.0, (wet_hours or 0) / 12.0),
        "visibility": WEIGHTS["visibility"] * _visibility_fraction(vis_km),
    }
    total = int(round(min(100.0, sum(contributions.values()))))
    computed = band_from_score(total)

    # --- the two floors, applied in order --------------------------------
    hazards: dict[str, Band] = {
        "rainfall": rain_band,
        "wind": wind_band,
        "visibility": vis_band,
        "heat": heat_band,
    }
    after_hazard, hazard_floor = apply_hazard_floor(computed, hazards)
    overall, floored_by = apply_safety_floor(after_hazard, warnings)

    # --- explainable breakdown -------------------------------------------
    breakdown = [
        Component("rainfall", "Rainfall", rain_band, int(round(contributions["rainfall"])),
                  f"{_mm(rain_mm)} forecast in 24 h — {rain_note}"),
        Component("warning", "Official warning", COLOUR_FLOOR[top_colour],
                  int(round(contributions["warning"])),
                  f"{top.get('event')} — {top_colour} alert active" if top else "no active warning"),
        Component("wind", "Wind", wind_band, int(round(contributions["wind"])),
                  f"sustained {_kmh(wind_kmh)}, gusts {_kmh(gust_kmh)} — {wind_note}"),
        Component("antecedent", "Antecedent rain", _ante_band(ante),
                  int(round(contributions["antecedent"])),
                  f"{_mm(ante)} in the previous 72 h"),
        Component("duration", "Duration", _duration_band(wet_hours),
                  int(round(contributions["duration"])),
                  f"{int(wet_hours)} of the next 24 hours have measurable rain"),
        Component("visibility", "Visibility", vis_band, int(round(contributions["visibility"])),
                  vis_note if vis_km is None else f"{vis_km:.1f} km — {vis_note}"),
    ]

    flood_band, flood_note = flood_risk(rain_band, ante, urban_prone)
    travel_band, travel_note = travel_risk(rain_band, wind_band, vis_band)
    out_band, out_note = outdoor_risk(rain_band, wind_band, heat_band)

    notes = [
        "Thresholds are IMD's published categories; the weights that combine "
        "them are WeatherGPT's engineering configuration, not meteorology.",
    ]
    if hazard_floor:
        notes.append(
            f"The composite score was {total}/100, but {hazard_floor['hazard']} alone is "
            f"{hazard_floor['band']} — the assessment is raised to match it."
        )
    if floored_by:
        notes.append(
            f"An active {floored_by['colour']} alert raised the level from "
            f"{floored_by['raised_from']} to {floored_by['minimum']}."
        )

    return RiskResult(
        overall=overall,
        score=total,
        computed_band=computed,
        floored_by=floored_by,
        hazard_floor=hazard_floor,
        breakdown=[c.as_dict() for c in breakdown],
        derived={
            "flood": {"band": flood_band, "note": flood_note},
            "travel": {"band": travel_band, "note": travel_note},
            "outdoor": {"band": out_band, "note": out_note},
            "heat": {"band": heat_band, "note": heat_note},
        },
        rainfall_colour=rainfall_colour(rain_mm),
        notes=notes,
    )


def _ante_band(mm: float | None) -> Band:
    if mm is None:
        return "LOW"
    if mm >= ANTECEDENT_HEAVY_MM:
        return "HIGH"
    if mm >= ANTECEDENT_SATURATION_MM:
        return "MODERATE"
    return "LOW"


def _duration_band(hours: float | None) -> Band:
    h = hours or 0
    if h >= 12:
        return "HIGH"
    if h >= 6:
        return "MODERATE"
    return "LOW"


def _mm(v: float | None) -> str:
    return "no data" if v is None else f"{v:.0f} mm"


def _kmh(v: float | None) -> str:
    return "no data" if v is None else f"{v:.0f} km/h"
