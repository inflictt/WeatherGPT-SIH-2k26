"""
Agronomic thresholds, as data.

Same rule as `engines/thresholds.py`: every number is attributed, and where a
value is a working convention rather than a published standard it says so in
the comment beside it. That distinction matters more here than in the weather
engine — IMD publishes rainfall categories, but "the wind is too high to
spray" is an advisory convention that varies by nozzle, product and country,
and pretending otherwise would be inventing authority.

Sources
  Rainfall categories, heat criteria:
    India Meteorological Department, standard classification (see
    engines/thresholds.py, which this module deliberately reuses rather
    than restating).
  Spray-window wind limits:
    Widely used agricultural extension guidance is 3-15 km/h, with drift
    risk rising sharply above roughly 15 km/h. Product labels govern; this
    is a screening threshold, not a recommendation.
  Crop cardinal temperatures:
    Standard agronomic ranges for wheat and rice. Terminal heat stress in
    wheat during grain filling and spikelet sterility in rice at flowering
    are both well established in the literature.
  Leaf-wetness / humidity disease favourability:
    Classic epidemiological conditions for foliar fungal pathogens —
    prolonged high humidity with moderate temperature. Used here only to
    *raise or lower* a risk band around a model's own prediction, never to
    diagnose anything on its own.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

from ..engines.thresholds import Band, Step, classify, max_band

# --------------------------------------------------------------------- spray

#: Below this, spray coverage is poor and drift from thermal inversion is a
#: risk; above it, drift risk rises quickly. Extension guidance, not a law.
SPRAY_WIND_MIN_KMH = 3.0
SPRAY_WIND_MAX_KMH = 15.0
#: Above this nobody should be spraying regardless of product.
SPRAY_WIND_STOP_KMH = 25.0
#: Rain within this many hours washes most foliar applications off.
SPRAY_RAINFAST_HOURS = 6

# ---------------------------------------------------------------- irrigation

#: Rainfall in the next 24 h at or above which irrigation is pointless.
#: Deliberately well below IMD's 64.5 mm "heavy" threshold: 25 mm is already
#: more than most crops use in a day.
IRRIGATION_SKIP_MM_24H = 25.0
#: …and over 48 h, where a smaller total still argues for waiting.
IRRIGATION_WAIT_MM_48H = 20.0
#: Rain in the last 72 h at or above which the profile is probably still wet.
IRRIGATION_RECENT_MM_72H = 30.0

#: Rough daily crop water use (mm/day) by evaporative demand. A screening
#: figure standing in for a full Penman-Monteith ET0, which needs radiation
#: and vapour-pressure data this service does not receive.
ET_MM_PER_DAY = {"low": 2.5, "moderate": 4.0, "high": 6.0, "very_high": 8.0}


def evaporative_demand(temp_c: float | None, humidity: float | None, wind_kmh: float | None) -> str:
    """A coarse demand class from the three variables we actually have.

    Named a *class* rather than a number because that is all three variables
    can honestly support. Anything finer would be false precision.
    """
    if temp_c is None:
        return "moderate"

    score = 0
    if temp_c >= 38:
        score += 2
    elif temp_c >= 32:
        score += 1
    if humidity is not None and humidity < 35:
        score += 1
    if wind_kmh is not None and wind_kmh >= 25:
        score += 1

    if score == 0:
        # Nothing is pushing demand up, so the temperature alone decides.
        return "low" if temp_c < 22 else "moderate"
    return ("moderate", "high", "very_high")[min(score, 3) - 1]


# -------------------------------------------------------------- crop stress

@dataclass(frozen=True)
class CropTemps:
    """Cardinal temperatures for one crop, in °C."""

    cold_stress: float
    heat_stress: float
    #: Heat during this stage is the damaging kind — terminal heat in wheat,
    #: spikelet sterility in rice.
    critical_stages: tuple[str, ...]


CROP_TEMPS: dict[str, CropTemps] = {
    "wheat": CropTemps(cold_stress=2.0, heat_stress=34.0, critical_stages=("flowering", "filling")),
    "rice": CropTemps(cold_stress=12.0, heat_stress=35.0, critical_stages=("flowering",)),
    "maize": CropTemps(cold_stress=6.0, heat_stress=35.0, critical_stages=("flowering",)),
    "mustard": CropTemps(cold_stress=1.0, heat_stress=32.0, critical_stages=("flowering", "filling")),
    "cotton": CropTemps(cold_stress=12.0, heat_stress=38.0, critical_stages=("flowering",)),
    "sugarcane": CropTemps(cold_stress=8.0, heat_stress=38.0, critical_stages=()),
    "gram": CropTemps(cold_stress=2.0, heat_stress=32.0, critical_stages=("flowering", "filling")),
    "soybean": CropTemps(cold_stress=8.0, heat_stress=35.0, critical_stages=("flowering", "filling")),
}
#: Used when the crop is unknown or unlisted. Conservative on both ends.
DEFAULT_CROP_TEMPS = CropTemps(cold_stress=4.0, heat_stress=35.0, critical_stages=("flowering",))


def crop_temps(crop: str | None) -> CropTemps:
    return CROP_TEMPS.get((crop or "").strip().lower(), DEFAULT_CROP_TEMPS)


# ------------------------------------------------------------------ disease

#: Relative humidity at or above which foliar fungal infection is favoured.
DISEASE_HUMIDITY_PCT = 85.0
#: …and the temperature window most foliar pathogens prefer.
DISEASE_TEMP_MIN_C = 15.0
DISEASE_TEMP_MAX_C = 28.0
#: Rain over 24 h that keeps leaves wet long enough to matter.
DISEASE_LEAF_WET_MM = 5.0

# ---------------------------------------------------------------- ladders

#: Standing water risk from 24 h rainfall on already-wet ground. Uses IMD's
#: own rainfall categories so a "HIGH" here means the same thing it does on
#: the weather screen.
FLOOD_LADDER = (
    Step(204.5, "EXTREME", "Extremely heavy rainfall"),
    Step(115.6, "HIGH", "Very heavy rainfall"),
    Step(64.5, "MODERATE", "Heavy rainfall"),
    Step(0.0, "LOW", "Nothing above the light-rain threshold"),
)

#: Harvest-window risk: rain on a ripe or drying crop.
HARVEST_LADDER = (
    Step(50.0, "EXTREME", "Heavy rain on a standing ripe crop"),
    Step(20.0, "HIGH", "Enough rain to delay harvest and threaten grain quality"),
    Step(5.0, "MODERATE", "Light rain — drying will be slower"),
    Step(0.0, "LOW", "Dry enough to harvest"),
)

__all__ = [
    "Band", "Step", "classify", "max_band",
    "SPRAY_WIND_MIN_KMH", "SPRAY_WIND_MAX_KMH", "SPRAY_WIND_STOP_KMH", "SPRAY_RAINFAST_HOURS",
    "IRRIGATION_SKIP_MM_24H", "IRRIGATION_WAIT_MM_48H", "IRRIGATION_RECENT_MM_72H",
    "ET_MM_PER_DAY", "evaporative_demand",
    "CropTemps", "CROP_TEMPS", "DEFAULT_CROP_TEMPS", "crop_temps",
    "DISEASE_HUMIDITY_PCT", "DISEASE_TEMP_MIN_C", "DISEASE_TEMP_MAX_C", "DISEASE_LEAF_WET_MM",
    "FLOOD_LADDER", "HARVEST_LADDER",
]
