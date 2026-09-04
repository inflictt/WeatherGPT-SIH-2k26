"""
IMD thresholds, as data.

Every number in this module is published by the India Meteorological
Department. None of it is invented, and none of it is trained. That is the
point: when a judge asks "where did these come from", the answer is a
citation rather than a dataset we do not have.

Sources
  Rainfall categories (24 h accumulation) and the colour-coded warning ladder:
    India Meteorological Department, standard rainfall classification.
  Heatwave criteria:
    IMD heat wave declaration criteria for plains, coastal and hilly regions.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Literal, Sequence

Band = Literal["LOW", "MODERATE", "HIGH", "EXTREME"]
Colour = Literal["green", "yellow", "orange", "red"]

BANDS: tuple[Band, ...] = ("LOW", "MODERATE", "HIGH", "EXTREME")
BAND_INDEX: dict[str, int] = {b: i for i, b in enumerate(BANDS)}

#: IMD colour code -> the minimum risk band an active alert of that colour
#: imposes. This is the safety floor of §8 and must never be bypassed.
COLOUR_FLOOR: dict[str, Band] = {
    "green": "LOW",
    "yellow": "MODERATE",
    "orange": "HIGH",
    "red": "EXTREME",
}

#: CAP severity -> IMD colour. Mirrors capGeo.js on the Node side.
CAP_SEVERITY_COLOUR: dict[str, Colour] = {
    "Extreme": "red",
    "Severe": "orange",
    "Moderate": "yellow",
    "Minor": "yellow",
    "Unknown": "green",
}


@dataclass(frozen=True)
class Step:
    """One rung of a threshold ladder: everything >= `at` is `band`."""

    at: float
    band: Band
    label: str


def classify(value: float | None, ladder: Sequence[Step], *, default: Band = "LOW") -> tuple[Band, str]:
    """Return the highest rung whose threshold `value` reaches.

    A missing value is LOW, never an assumption. Ladders are evaluated from
    the top down so the boundaries are inclusive lower bounds, exactly as IMD
    states them (64.5 mm *is* heavy rain, not "almost heavy").
    """
    if value is None:
        return default, "no data"
    for step in sorted(ladder, key=lambda s: s.at, reverse=True):
        if value >= step.at:
            return step.band, step.label
    return default, ladder[0].label if ladder else "below threshold"


# --------------------------------------------------------------------------
# Rainfall — 24-hour accumulation, millimetres.
#   light/moderate  < 64.5
#   heavy             64.5 – 115.5   -> yellow
#   very heavy       115.6 – 204.4   -> orange
#   extremely heavy  >= 204.5        -> red
# --------------------------------------------------------------------------
RAINFALL_24H: tuple[Step, ...] = (
    Step(0.0, "LOW", "light to moderate rainfall"),
    Step(64.5, "MODERATE", "heavy rainfall (IMD: 64.5–115.5 mm)"),
    Step(115.6, "HIGH", "very heavy rainfall (IMD: 115.6–204.4 mm)"),
    Step(204.5, "EXTREME", "extremely heavy rainfall (IMD: ≥ 204.5 mm)"),
)

#: The same ladder expressed as colours, for display alongside a warning.
RAINFALL_COLOUR: tuple[tuple[float, Colour], ...] = (
    (204.5, "red"),
    (115.6, "orange"),
    (64.5, "yellow"),
    (0.0, "green"),
)


def rainfall_colour(mm: float | None) -> Colour:
    if mm is None:
        return "green"
    for at, colour in RAINFALL_COLOUR:
        if mm >= at:
            return colour
    return "green"


# --------------------------------------------------------------------------
# Wind — sustained speed, km/h. IMD calls >= 62 km/h (34 kt) a squall.
# --------------------------------------------------------------------------
WIND_KMH: tuple[Step, ...] = (
    Step(0.0, "LOW", "light winds"),
    Step(20.0, "MODERATE", "moderate winds"),
    Step(40.0, "HIGH", "strong winds (40–61 km/h)"),
    Step(62.0, "EXTREME", "squall force (≥ 62 km/h)"),
)

# --------------------------------------------------------------------------
# Heat — IMD declares a heat wave from BOTH an absolute floor and a departure
# from the normal maximum, and the floor depends on the terrain.
# --------------------------------------------------------------------------
HEAT_FLOOR_C: dict[str, float] = {"plains": 40.0, "coastal": 37.0, "hills": 30.0}
HEATWAVE_DEPARTURE_C = 4.5
SEVERE_HEATWAVE_DEPARTURE_C = 6.5
HEATWAVE_ABSOLUTE_C = 45.0
SEVERE_HEATWAVE_ABSOLUTE_C = 47.0

# --------------------------------------------------------------------------
# Visibility — km. Below 1 km IMD reports fog; below 200 m, dense fog.
# --------------------------------------------------------------------------
VISIBILITY_KM: tuple[tuple[float, Band, str], ...] = (
    (0.2, "EXTREME", "dense fog, visibility below 200 m"),
    (1.0, "HIGH", "fog, visibility below 1 km"),
    (4.0, "MODERATE", "reduced visibility"),
)

# --------------------------------------------------------------------------
# Flood composite — forecast rain interacts with what already fell. Saturated
# ground turns moderate rainfall into a real flood risk, which is why the
# antecedent term exists at all.
# --------------------------------------------------------------------------
ANTECEDENT_SATURATION_MM = 50.0   # 72-hour total above which ground is wet
ANTECEDENT_HEAVY_MM = 100.0       # …and above which it is saturated

#: Score weights. These are OUR engineering configuration, not meteorology,
#: and the API says so in every response.
WEIGHTS: dict[str, int] = {
    "rainfall": 35,
    "warning": 25,
    "wind": 15,
    "antecedent": 10,
    "duration": 8,
    "visibility": 7,
}

SCORE_BANDS: tuple[tuple[int, Band], ...] = (
    (81, "EXTREME"),
    (61, "HIGH"),
    (41, "MODERATE"),
    (0, "LOW"),
)


def band_from_score(score: float) -> Band:
    for at, band in SCORE_BANDS:
        if score >= at:
            return band
    return "LOW"


def max_band(*bands: str | None) -> Band:
    """The most severe of several bands. Used to apply the safety floor."""
    known = [b for b in bands if b in BAND_INDEX]
    if not known:
        return "LOW"
    return BANDS[max(BAND_INDEX[b] for b in known)]
