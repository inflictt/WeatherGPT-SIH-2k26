"""
Forecast confidence from model disagreement.

A forecast is a probability, not a promise. Most weather products hide that;
saying it plainly is one of the three things WeatherGPT is actually for.

The method is deliberately simple and completely defensible:

    1. Ask several numerical models the same question — how much rain falls
       in the next 24 hours at this point.
    2. Measure how much they disagree (coefficient of variation).
    3. Check whether they even agree on the IMD *category*, which matters more
       than the raw spread: 96 mm and 137 mm differ by only 14 % but land in
       'heavy' and 'very heavy' respectively, and those carry different
       advice. Crossing a threshold caps confidence at MEDIUM however tight
       the numbers look.
    4. Combine all of that with how far ahead we are forecasting.

Nothing is trained. Nothing is guessed. The evidence is returned alongside
the verdict so the interface can show its working.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from statistics import mean, pstdev
from typing import Any, Literal

from .thresholds import RAINFALL_24H, classify, rainfall_colour

ENGINE_VERSION = "3.0.0"

Level = Literal["HIGH", "MEDIUM", "LOW"]

# Spread thresholds, as a coefficient of variation (std / mean).
SPREAD_TIGHT = 0.20
SPREAD_WIDE = 0.50

# Lead-time thresholds, in hours.
LEAD_NEAR = 24
LEAD_FAR = 72

# Below this, the models are arguing about a trace of rain and the relative
# spread stops being meaningful — 0.2 mm vs 0.6 mm is a 100 % disagreement
# about nothing.
NEGLIGIBLE_MM = 2.0


@dataclass
class UncertaintyResult:
    level: Level
    spread: float | None
    mean_mm: float | None
    range_mm: float | None
    lead_hours: int
    models: list[dict[str, Any]]
    band_agreement: bool = True
    bands: list[str] = field(default_factory=list)
    reasons: list[str] = field(default_factory=list)
    engine_version: str = ENGINE_VERSION


def _fmt(v: float) -> str:
    return f"{v:.0f}" if abs(v - round(v)) < 0.05 else f"{v:.1f}"


def score(payload: dict[str, Any]) -> UncertaintyResult:
    raw = payload.get("models") or []
    lead = int(payload.get("lead_hours") or 0)
    probability = payload.get("probability")

    models = []
    for m in raw:
        if m.get("rain_24h_mm") is None:
            continue
        mm = float(m.get("rain_24h_mm") or 0.0)
        band, _ = classify(mm, RAINFALL_24H)
        models.append(
            {
                "name": m.get("name") or "unknown",
                "rain_24h_mm": mm,
                "band": band,
                "colour": rainfall_colour(mm),
            }
        )

    # --- not enough models to have an opinion --------------------------------
    if len(models) < 2:
        return UncertaintyResult(
            level="LOW",
            spread=None,
            mean_mm=models[0]["rain_24h_mm"] if models else None,
            range_mm=None,
            lead_hours=lead,
            models=models,
            reasons=[
                "Only one forecast model responded, so there is nothing to cross-check."
                if models
                else "No forecast model returned a usable total."
            ],
        )

    values = [m["rain_24h_mm"] for m in models]
    avg = mean(values)
    # Population standard deviation: these models are the whole set we asked,
    # not a sample drawn from a larger one.
    sd = pstdev(values)
    lo, hi = min(values), max(values)
    spread = None if avg <= 0 else sd / avg
    bands = [m["band"] for m in models]
    band_agreement = len(set(bands)) == 1
    reasons: list[str] = []

    # --- everyone agrees it is essentially dry -------------------------------
    if hi < NEGLIGIBLE_MM:
        reasons.append(
            f"All {len(models)} models forecast under {_fmt(NEGLIGIBLE_MM)} mm — they agree it stays dry."
        )
        level: Level = "HIGH" if lead <= LEAD_FAR else "MEDIUM"
        if lead > LEAD_FAR:
            reasons.append(f"That said, this is a {lead}-hour forecast; check again closer to the day.")
        return UncertaintyResult(
            level=level, spread=spread, mean_mm=round(avg, 1), range_mm=round(hi - lo, 1),
            lead_hours=lead, models=models, band_agreement=True,
            bands=sorted(set(bands)), reasons=reasons,
        )

    # --- the ordinary path ---------------------------------------------------
    if spread is not None and spread < SPREAD_TIGHT:
        reasons.append(
            f"All {len(models)} models agree closely on the total — "
            f"{_fmt(lo)} to {_fmt(hi)} mm, a spread of {spread * 100:.0f} %."
        )
    else:
        reasons.append(
            f"The models differ on how much rain falls: {_fmt(lo)} to {_fmt(hi)} mm, "
            f"a difference of {_fmt(hi - lo)} mm"
            + (f" ({spread * 100:.0f} % spread)." if spread is not None else ".")
        )

    if not band_agreement:
        low_band, _ = classify(lo, RAINFALL_24H)
        high_band, _ = classify(hi, RAINFALL_24H)
        reasons.append(
            f"More importantly they disagree on the IMD category — one puts this in the "
            f"{low_band.lower()} band and another in the {high_band.lower()} band, "
            f"which carry different advice."
        )

    if lead < LEAD_NEAR:
        reasons.append(f"The event is {lead} hours away, which is inside the reliable window.")
    elif lead <= LEAD_FAR:
        reasons.append(f"This is a {lead}-hour forecast; expect it to shift as new observations arrive.")
    else:
        reasons.append(f"At {lead} hours ahead, any forecast of this kind is provisional.")

    if probability is not None:
        reasons.append(f"Published probability of precipitation is {round(float(probability) * 100)} %.")

    level = _level(spread, lead, band_agreement)
    reasons.append(_verdict_sentence(level))

    return UncertaintyResult(
        level=level,
        spread=None if spread is None else round(spread, 3),
        mean_mm=round(avg, 1),
        range_mm=round(hi - lo, 1),
        lead_hours=lead,
        models=models,
        band_agreement=band_agreement,
        bands=sorted(set(bands)),
        reasons=reasons,
    )


def _level(spread: float | None, lead: int, band_agreement: bool = True) -> Level:
    """The table in §9 of the PRD, expressed once.

    Both the spread and the lead condition must hold for HIGH; either one
    alone can force LOW. Disagreement about the IMD category caps the result
    at MEDIUM regardless of how tight the raw numbers are, because the
    category is what changes the advice.
    """
    if spread is None:
        return "MEDIUM"
    if spread > SPREAD_WIDE or lead > LEAD_FAR:
        return "LOW"
    if spread < SPREAD_TIGHT and lead < LEAD_NEAR:
        return "HIGH" if band_agreement else "MEDIUM"
    return "MEDIUM"


def _verdict_sentence(level: Level) -> str:
    return {
        "HIGH": "Confidence is high, but a forecast is still a forecast.",
        "MEDIUM": "Treat the timing as more reliable than the amount.",
        "LOW": "Too early to rely on the numbers — check again tomorrow.",
    }[level]
