"""
The context bundle — everything a language model is allowed to read.

This is the boundary the PRD's §26 architecture rests on. Gemini explains; it
does not compute. So it receives *this* — a frozen set of facts, each already
computed by an engine that can be tested — and nothing else. Every number in
a generated sentence must be traceable to a value in here, which is what makes
`engines/validate.py` able to reject a rewrite that invented one.

Two deliberate omissions:

  * **No raw API payloads.** Handing a model the whole Open-Meteo response
    invites it to quote a field nobody validated.
  * **No personally identifying farm data.** The bundle carries soil type and
    crop stage because they change the advice; it does not carry the farm's
    name, its coordinates or the farmer's identity, because the answer does
    not depend on them and a prompt is the wrong place for them to live.
"""
from __future__ import annotations

from typing import Any

from . import crop_risk, disease, irrigation
from .crop_calendar import stage_for, timeline


def _round(v, n=1):
    return round(v, n) if isinstance(v, (int, float)) else None


def build(payload: dict) -> dict:
    """Assemble the bundle from one place's weather plus one farm's profile.

    Every engine runs, and each result keeps its own confidence and its own
    list of things it could not see. Nothing here is a summary — summarising
    is the model's job, and it can only summarise what it is given.
    """
    weather = payload.get("weather") or {}
    farm = payload.get("farm") or {}
    warnings = payload.get("warnings") or []

    crop = farm.get("crop")
    sown_at = farm.get("sown_at")
    soil = farm.get("soil_type")

    # The most severe active warning drives the floor, exactly as on the
    # weather side.
    active = [w for w in warnings if (w or {}).get("status", "active") == "active"]
    order = {"red": 3, "orange": 2, "yellow": 1, "green": 0}
    worst = max(active, key=lambda w: order.get((w.get("colour") or "").lower(), 0), default=None)

    stage = stage_for(crop, sown_at)

    irr = irrigation.assess({
        "rain_24h_mm": weather.get("rain_24h_mm"),
        "rain_48h_mm": weather.get("rain_48h_mm"),
        "rain_72h_mm": weather.get("rain_72h_mm"),
        "temp_c": weather.get("temp_c"),
        "humidity": weather.get("humidity"),
        "wind_kmh": weather.get("wind_kmh"),
        "soil_type": soil,
        "crop": crop,
        "sown_at": sown_at,
        "last_irrigated_days": farm.get("last_irrigated_days"),
        "soil_moisture_pct": farm.get("soil_moisture_pct"),
    })

    risk = crop_risk.assess({
        "rain_24h_mm": weather.get("rain_24h_mm"),
        "rain_72h_mm": weather.get("rain_72h_mm"),
        "temp_max_c": weather.get("temp_max_c") or weather.get("temp_c"),
        "temp_min_c": weather.get("temp_min_c"),
        "humidity": weather.get("humidity"),
        "wind_kmh": weather.get("wind_kmh"),
        "gust_kmh": weather.get("gust_kmh"),
        "crop": crop,
        "sown_at": sown_at,
        "soil_type": soil,
        "warning_colour": (worst or {}).get("colour"),
    })

    dis = disease.assess({
        "prediction": farm.get("last_disease_prediction"),
        "confidence": farm.get("last_disease_confidence"),
        "humidity": weather.get("humidity"),
        "temp_c": weather.get("temp_c"),
        "rain_24h_mm": weather.get("rain_24h_mm"),
        "crop": crop,
        "sown_at": sown_at,
    })

    return {
        "location": {
            # Name and district only. Coordinates change nothing about the
            # answer and do not belong in a prompt.
            "name": (payload.get("location") or {}).get("name"),
            "district": (payload.get("location") or {}).get("district"),
            "state": (payload.get("location") or {}).get("state"),
        },
        "weather": {
            "temp_c": _round(weather.get("temp_c")),
            "temp_max_c": _round(weather.get("temp_max_c")),
            "temp_min_c": _round(weather.get("temp_min_c")),
            "humidity": _round(weather.get("humidity"), 0),
            "wind_kmh": _round(weather.get("wind_kmh"), 0),
            "gust_kmh": _round(weather.get("gust_kmh"), 0),
            "rain_24h_mm": _round(weather.get("rain_24h_mm")),
            "rain_48h_mm": _round(weather.get("rain_48h_mm")),
            "rain_72h_mm": _round(weather.get("rain_72h_mm")),
            "condition": weather.get("condition"),
            "observed_at": weather.get("observed_at"),
        },
        "farm": {
            "crop": crop,
            "soil_type": soil,
            "irrigation_type": farm.get("irrigation_type"),
            "area_ha": farm.get("area_ha"),
            "stage": stage,
        },
        # Official text passes through untouched. It is the one thing in the
        # bundle a model may quote but must never paraphrase.
        "warnings": [
            {
                "colour": w.get("colour"),
                "severity": w.get("severity"),
                "event": w.get("event"),
                "headline": w.get("headline"),
                "instruction": w.get("instruction"),
                "sender": w.get("sender"),
                "expires": w.get("expires"),
            }
            for w in active
        ],
        "irrigation": irr.__dict__,
        "farm_risk": {
            "overall": risk.overall,
            "score": risk.score,
            "floored_by": risk.floored_by,
            "confidence": risk.confidence,
            "unassessed": risk.unassessed,
            "categories": [c.__dict__ for c in risk.categories],
        },
        "disease_risk": dis.__dict__,
        "crop_timeline": timeline(crop),
        "sources": ["Open-Meteo", "NDMA Sachet (CAP)", "IMD thresholds", "WeatherGPT risk engines"],
    }


def numeric_facts(bundle: dict) -> list[float]:
    """Every number in the bundle, flattened.

    `engines/validate.py` uses this as the allow-list: a generated sentence may
    only contain figures that appear here. Anything else is a hallucination by
    definition, however plausible it reads.
    """
    out: list[float] = []

    def walk(node: Any) -> None:
        if isinstance(node, dict):
            for v in node.values():
                walk(v)
        elif isinstance(node, (list, tuple)):
            for v in node:
                walk(v)
        elif isinstance(node, bool):
            return
        elif isinstance(node, (int, float)):
            out.append(float(node))
        elif isinstance(node, str):
            # Figures embedded in a rendered string ("118 mm", "34 °C") count
            # too — they were computed, and the model may legitimately repeat
            # them.
            import re
            for m in re.findall(r"-?\d+(?:\.\d+)?", node):
                try:
                    out.append(float(m))
                except ValueError:
                    pass

    walk(bundle)
    return out


__all__ = ["build", "numeric_facts"]
