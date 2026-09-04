"""
The agriculture engines.

Boundary tests sit on both sides of every threshold, the same rule the weather
engine follows: a ladder is only trustworthy if someone has checked that 24.9
and 25.0 fall on opposite sides of it.

The rest of the file is about the things that would be dangerous to get wrong
rather than merely incorrect — that a missing input never becomes a reassuring
answer, that a shaky image class cannot be laundered into a confident verdict,
and that an operational inconvenience cannot masquerade as a hazard.
"""
from datetime import date

from app.agriculture import crop_calendar, crop_risk, disease, irrigation
from app.agriculture import thresholds as T
from app.agriculture.context import build, numeric_facts


class TestIrrigationBoundaries:
    def test_just_below_the_skip_threshold_does_not_skip(self):
        r = irrigation.assess({"rain_24h_mm": T.IRRIGATION_SKIP_MM_24H - 0.1, "temp_c": 28})
        assert r.recommendation != "Do not irrigate"

    def test_exactly_at_the_skip_threshold_skips(self):
        r = irrigation.assess({"rain_24h_mm": T.IRRIGATION_SKIP_MM_24H, "temp_c": 28})
        assert r.recommendation == "Do not irrigate"

    def test_48h_threshold_is_inclusive(self):
        below = irrigation.assess({"rain_24h_mm": 0, "rain_48h_mm": T.IRRIGATION_WAIT_MM_48H - 0.1})
        at = irrigation.assess({"rain_24h_mm": 0, "rain_48h_mm": T.IRRIGATION_WAIT_MM_48H})
        assert below.recommendation != "Wait"
        assert at.recommendation == "Wait"


class TestIrrigationHonesty:
    def test_no_rainfall_data_is_unknown_not_a_guess(self):
        r = irrigation.assess({})
        assert r.recommendation == "Unknown"
        assert r.confidence == "LOW"
        assert "no recommendation is possible" in r.reason.lower()

    def test_missing_inputs_are_always_reported(self):
        r = irrigation.assess({"rain_24h_mm": 100})
        assert "soil type" in r.inputs_missing
        assert "soil moisture" in r.inputs_missing
        assert "24 h rainfall" in r.inputs_used

    def test_a_sensor_reading_outranks_the_forecast(self):
        # Dry forecast, hot day — the inference would say irrigate. The sensor
        # says the profile is wet, and the sensor wins.
        r = irrigation.assess({"rain_24h_mm": 0, "temp_c": 40, "humidity": 20, "soil_moisture_pct": 80})
        assert r.recommendation == "Do not irrigate"
        assert r.confidence == "HIGH"

    def test_rainfall_alone_never_claims_high_confidence_to_irrigate(self):
        r = irrigation.assess({
            "rain_24h_mm": 0, "rain_48h_mm": 0, "temp_c": 40, "humidity": 20,
            "soil_type": "sandy", "crop": "wheat", "sown_at": "2020-01-01",
        })
        assert r.recommendation == "Irrigate"
        assert r.confidence != "HIGH"

    def test_decisive_rain_is_confident_even_with_few_inputs(self):
        # Confidence answers "would more inputs change this?" — 118 mm settles
        # it, so knowing the soil type as well would change nothing.
        r = irrigation.assess({"rain_24h_mm": 118})
        assert r.confidence == "HIGH"


class TestCropCalendar:
    def test_no_sowing_date_is_planning_never_an_estimate(self):
        s = crop_calendar.stage_for("wheat", None)
        assert s["stage"] == "planning"
        assert s["days_after_sowing"] is None

    def test_unparseable_date_is_also_planning(self):
        assert crop_calendar.stage_for("wheat", "not-a-date")["stage"] == "planning"

    def test_stage_boundaries_are_inclusive_lower_bounds(self):
        cal = crop_calendar.calendar_for("wheat")
        flower_day = cal.starts["flowering"]
        today = date(2026, 6, 1)
        day_before = date.fromordinal(today.toordinal() - (flower_day - 1))
        day_of = date.fromordinal(today.toordinal() - flower_day)
        assert crop_calendar.stage_for("wheat", day_before.isoformat(), today=today)["stage"] == "vegetative"
        assert crop_calendar.stage_for("wheat", day_of.isoformat(), today=today)["stage"] == "flowering"

    def test_every_stage_is_marked_approximate(self):
        s = crop_calendar.stage_for("wheat", "2026-01-01", today=date(2026, 3, 1))
        assert s["approximate"] is True
        assert str(s["total_days"]) in s["reason"]

    def test_unknown_crop_falls_back_and_says_so(self):
        s = crop_calendar.stage_for("quinoa", "2026-01-01", today=date(2026, 3, 1))
        assert s["crop"] == "unknown"
        assert "manually" in s["notes"]


class TestFarmRisk:
    def test_no_data_leaves_every_category_unassessed(self):
        r = crop_risk.assess({})
        assert r.overall is None
        assert len(r.unassessed) == len(crop_risk.CATEGORIES)

    def test_missing_category_is_null_not_low(self):
        r = crop_risk.assess({"rain_24h_mm": 10})
        heat = next(c for c in r.categories if c.key == "heat_stress")
        assert heat.band is None, "no temperature must not read as LOW heat stress"

    def test_pest_is_never_assessed_from_weather(self):
        r = crop_risk.assess({
            "rain_24h_mm": 200, "temp_max_c": 40, "temp_min_c": 25,
            "humidity": 95, "wind_kmh": 50, "gust_kmh": 80,
        })
        pest = next(c for c in r.categories if c.key == "pest")
        assert pest.band is None
        assert "scouting" in pest.note

    def test_the_spray_window_cannot_set_the_headline(self):
        # A breezy but otherwise perfect day. The spray window closes; the
        # farm is not at risk.
        r = crop_risk.assess({
            "rain_24h_mm": 0, "rain_72h_mm": 0, "temp_max_c": 26, "temp_min_c": 18,
            "humidity": 45, "wind_kmh": 30, "gust_kmh": 32,
        })
        spray = next(c for c in r.categories if c.key == "spray_window")
        assert spray.band == "EXTREME"
        assert r.overall != "EXTREME"

    def test_the_warning_floor_only_raises(self):
        calm = {"rain_24h_mm": 0, "rain_72h_mm": 0, "temp_max_c": 26, "temp_min_c": 18,
                "humidity": 40, "wind_kmh": 5, "gust_kmh": 8}
        without = crop_risk.assess(calm)
        with_red = crop_risk.assess({**calm, "warning_colour": "red"})
        assert with_red.overall == "EXTREME"
        assert with_red.floored_by == "red alert"
        assert without.overall == "LOW"

    def test_the_floor_never_lowers(self):
        severe = {"rain_24h_mm": 250, "rain_72h_mm": 120, "temp_max_c": 30, "temp_min_c": 22,
                  "humidity": 90, "wind_kmh": 20, "gust_kmh": 30}
        alone = crop_risk.assess(severe)
        with_green = crop_risk.assess({**severe, "warning_colour": "green"})
        assert alone.overall == "EXTREME"
        assert with_green.overall == "EXTREME", "a green alert must not pull EXTREME down"

    def test_flood_ladder_boundaries(self):
        base = {"temp_max_c": 28, "temp_min_c": 20, "humidity": 60, "wind_kmh": 10, "gust_kmh": 12}
        below = crop_risk.assess({**base, "rain_24h_mm": 64.4})
        at = crop_risk.assess({**base, "rain_24h_mm": 64.5})
        assert next(c for c in below.categories if c.key == "flood").band == "LOW"
        assert next(c for c in at.categories if c.key == "flood").band == "MODERATE"

    def test_a_critical_stage_raises_heat_stress(self):
        base = {"rain_24h_mm": 0, "temp_max_c": 36, "temp_min_c": 22, "humidity": 40,
                "wind_kmh": 10, "gust_kmh": 12, "crop": "wheat"}
        # Wheat heat threshold is 34; 36 is +2, which alone is MODERATE.
        vegetative = crop_risk.assess({**base, "sown_at": date.today().isoformat()})
        flowering = crop_risk.assess({
            **base,
            "sown_at": date.fromordinal(date.today().toordinal() - 70).isoformat(),
        })
        v = next(c for c in vegetative.categories if c.key == "heat_stress").band
        f = next(c for c in flowering.categories if c.key == "heat_stress").band
        assert f == "HIGH" and v == "MODERATE"


class TestDiseaseFusion:
    def test_it_never_invents_a_class(self):
        r = disease.assess({"humidity": 95, "temp_c": 22, "rain_24h_mm": 20})
        assert r.detected is None
        assert "nothing has been detected" in r.explanation

    def test_conditions_alone_never_reach_extreme(self):
        # Every favourability condition met, and still nothing was detected.
        r = disease.assess({"humidity": 95, "temp_c": 22, "rain_24h_mm": 20})
        assert r.conditions_band == "EXTREME"
        assert r.band == "HIGH"

    def test_a_healthy_leaf_outranks_favourable_weather(self):
        r = disease.assess({
            "prediction": "Healthy", "confidence": 0.95,
            "humidity": 95, "temp_c": 22, "rain_24h_mm": 20,
        })
        assert r.band == "MODERATE"

    def test_a_shaky_class_is_capped_however_bad_the_weather(self):
        r = disease.assess({
            "prediction": "Wheat leaf rust", "confidence": 0.41,
            "humidity": 95, "temp_c": 22, "rain_24h_mm": 20,
        })
        assert r.band == "MODERATE"
        assert r.confidence == "LOW"
        assert "below" in r.explanation

    def test_confidence_boundary(self):
        wet = {"humidity": 95, "temp_c": 22, "rain_24h_mm": 20, "prediction": "Wheat leaf rust"}
        below = disease.assess({**wet, "confidence": disease.LOW_CONFIDENCE - 0.001})
        at = disease.assess({**wet, "confidence": disease.LOW_CONFIDENCE})
        assert below.band == "MODERATE"
        assert at.band != "MODERATE", "at the threshold the cap should lift"

    def test_dry_weather_lowers_a_confident_detection(self):
        r = disease.assess({
            "prediction": "Wheat leaf rust", "confidence": 0.91,
            "humidity": 25, "temp_c": 40, "rain_24h_mm": 0,
        })
        assert r.conditions_band == "LOW"
        assert r.band == "MODERATE"


class TestContextBundle:
    BASE = {
        "location": {"name": "Udaipur", "district": "Udaipur", "state": "Rajasthan", "lat": 24.58, "lon": 73.71},
        "weather": {"temp_c": 27, "temp_max_c": 29, "temp_min_c": 22, "humidity": 84,
                    "wind_kmh": 34, "gust_kmh": 51, "rain_24h_mm": 118, "rain_72h_mm": 61},
        "farm": {"crop": "wheat", "sown_at": "2026-06-27", "soil_type": "clay"},
        "warnings": [{"colour": "orange", "severity": "Severe", "event": "Heavy Rainfall",
                      "headline": "Very heavy rainfall very likely", "status": "active"}],
    }

    def test_it_carries_every_engine(self):
        b = build(self.BASE)
        for key in ("irrigation", "farm_risk", "disease_risk", "crop_timeline", "warnings"):
            assert key in b, key

    def test_coordinates_never_reach_the_bundle(self):
        # A prompt is the wrong place for a farm's coordinates, and the answer
        # does not depend on them.
        import json
        b = build(self.BASE)
        assert "lat" not in json.dumps(b)
        assert 24.58 not in numeric_facts(b)

    def test_expired_warnings_are_dropped(self):
        b = build({**self.BASE, "warnings": [
            {**self.BASE["warnings"][0], "status": "expired"},
        ]})
        assert b["warnings"] == []

    def test_official_text_passes_through_unedited(self):
        b = build(self.BASE)
        assert b["warnings"][0]["headline"] == "Very heavy rainfall very likely"

    def test_numeric_facts_include_computed_values(self):
        b = build(self.BASE)
        facts = numeric_facts(b)
        assert 118.0 in facts, "the rainfall figure must be quotable"
        assert float(b["farm_risk"]["score"]) in facts, "the risk score must be quotable"
