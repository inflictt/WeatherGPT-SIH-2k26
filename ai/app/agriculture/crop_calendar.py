"""
Where a crop is in its life, and what that stage cares about.

Two things this module refuses to do:

  * **Guess a stage without a sowing date.** No date means "planning", not a
    plausible-looking midpoint. Every downstream recommendation reads the
    stage, so a fabricated one would quietly corrupt the irrigation advice,
    the disease risk and the harvest window all at once.
  * **Pretend one calendar fits every variety.** Durations here are typical
    ranges for the common Indian varieties, and every result carries
    `approximate: True` plus the duration it assumed, so the interface can
    say so and a farmer can correct it.

Sources
  Typical crop durations and stage sequences follow standard Indian
  agronomic practice for the rabi and kharif seasons. They are ranges in the
  literature, not constants, which is exactly why the output is labelled
  approximate.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime, timezone

#: The lifecycle, in order. Shared by every crop; only the durations differ.
STAGES: tuple[str, ...] = (
    "planning",
    "preparation",
    "sowing",
    "germination",
    "vegetative",
    "flowering",
    "filling",
    "harvest",
    "post_harvest",
)

STAGE_LABELS: dict[str, str] = {
    "planning": "Planning",
    "preparation": "Soil preparation",
    "sowing": "Sowing",
    "germination": "Germination",
    "vegetative": "Vegetative growth",
    "flowering": "Flowering",
    "filling": "Grain filling",
    "harvest": "Harvest",
    "post_harvest": "Post-harvest",
}


@dataclass(frozen=True)
class CropCalendar:
    """Cumulative days from sowing at which each stage *begins*."""

    crop: str
    season: str
    total_days: int
    #: germination, vegetative, flowering, filling, harvest — in days after sowing
    starts: dict[str, int]
    notes: str = ""


def _cal(crop: str, season: str, germ: int, veg: int, flower: int, fill: int, harvest: int, total: int, notes: str = "") -> CropCalendar:
    return CropCalendar(
        crop=crop,
        season=season,
        total_days=total,
        starts={
            "sowing": 0,
            "germination": germ,
            "vegetative": veg,
            "flowering": flower,
            "filling": fill,
            "harvest": harvest,
        },
        notes=notes,
    )


CALENDARS: dict[str, CropCalendar] = {
    "wheat": _cal("wheat", "rabi", 7, 21, 60, 85, 110, 135,
                  "Terminal heat during grain filling is the main yield risk."),
    "rice": _cal("rice", "kharif", 5, 20, 60, 85, 110, 135,
                 "Heat or water stress at flowering causes spikelet sterility."),
    "maize": _cal("maize", "kharif", 5, 18, 50, 68, 90, 105,
                  "Silking is the moisture-critical window."),
    "mustard": _cal("mustard", "rabi", 6, 20, 45, 70, 100, 125,
                    "Aphid pressure rises through flowering."),
    "gram": _cal("gram", "rabi", 7, 22, 55, 80, 105, 125,
                 "Pod borer is the usual problem at pod formation."),
    "cotton": _cal("cotton", "kharif", 7, 25, 65, 100, 150, 180,
                   "Picked over several rounds rather than harvested once."),
    "soybean": _cal("soybean", "kharif", 5, 18, 40, 65, 90, 105, ""),
    "sugarcane": _cal("sugarcane", "annual", 21, 45, 240, 300, 330, 365,
                      "A twelve-month crop; stage names map loosely."),
}

#: When the crop is unknown. A ~120-day cereal, and the result says so.
DEFAULT_CALENDAR = _cal("unknown", "unknown", 7, 21, 55, 80, 105, 125,
                        "Generic cereal calendar — set the stage manually for accuracy.")


def calendar_for(crop: str | None) -> CropCalendar:
    return CALENDARS.get((crop or "").strip().lower(), DEFAULT_CALENDAR)


def _parse_date(value) -> date | None:
    """Accept a date, a datetime or an ISO string; anything else is None."""
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    try:
        text = str(value).strip()
        if text.endswith("Z"):
            text = text[:-1] + "+00:00"
        return datetime.fromisoformat(text).date()
    except (ValueError, TypeError):
        return None


def stage_for(crop: str | None, sown_at, *, today: date | None = None) -> dict:
    """Where this crop is today.

    Returns `stage: "planning"` with `days_after_sowing: None` when the sowing
    date is missing or unparseable — never an estimate. A stage is an input to
    three other engines, so a guessed one is three wrong answers.
    """
    cal = calendar_for(crop)
    sown = _parse_date(sown_at)
    now = today or datetime.now(timezone.utc).date()

    if sown is None:
        return {
            "crop": cal.crop,
            "stage": "planning",
            "stage_label": STAGE_LABELS["planning"],
            "days_after_sowing": None,
            "progress": 0.0,
            "expected_harvest": None,
            "total_days": cal.total_days,
            "approximate": True,
            "reason": "No sowing date recorded, so the stage is not estimated.",
            "notes": cal.notes,
        }

    days = (now - sown).days
    if days < 0:
        stage = "preparation"
    else:
        stage = "sowing"
        for name in ("germination", "vegetative", "flowering", "filling", "harvest"):
            if days >= cal.starts[name]:
                stage = name
        if days > cal.total_days:
            stage = "post_harvest"

    harvest_day = cal.starts["harvest"]
    return {
        "crop": cal.crop,
        "stage": stage,
        "stage_label": STAGE_LABELS[stage],
        "days_after_sowing": days,
        "progress": max(0.0, min(1.0, days / cal.total_days)) if cal.total_days else 0.0,
        "expected_harvest": (sown.fromordinal(sown.toordinal() + harvest_day)).isoformat(),
        "total_days": cal.total_days,
        # Always true, and always shown. The duration is a typical range in the
        # literature, not a constant, and varieties differ by weeks.
        "approximate": True,
        "reason": f"Estimated from the sowing date against a {cal.total_days}-day {cal.crop} calendar.",
        "notes": cal.notes,
    }


def timeline(crop: str | None) -> list[dict]:
    """The full stage list for a crop, for the planner UI."""
    cal = calendar_for(crop)
    out = []
    for name in STAGES:
        if name in ("planning", "preparation", "post_harvest"):
            day = None
        else:
            day = cal.starts.get(name)
        out.append({"stage": name, "label": STAGE_LABELS[name], "day_after_sowing": day})
    return out


__all__ = ["STAGES", "STAGE_LABELS", "CropCalendar", "CALENDARS", "DEFAULT_CALENDAR",
           "calendar_for", "stage_for", "timeline"]
