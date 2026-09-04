"""
Risk engine behaviour, with the safety floor front and centre.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.engines.risk import (  # noqa: E402
    apply_safety_floor,
    flood_risk,
    heat_risk,
    score,
    strongest_warning,
    travel_risk,
)


def base(**overrides):
    payload = {
        "location": {"zone": "plains", "urban_flood_prone": False},
        "forecast": {
            "rain_24h_mm": 10,
            "wind_kmh": 10,
            "gust_kmh": 15,
            "visibility_km": 10,
            "rain_duration_hours": 2,
            "temp_max_c": 30,
        },
        "antecedent": {"rain_72h_mm": 0},
        "warnings": [],
    }
    for key, value in overrides.items():
        if isinstance(value, dict) and isinstance(payload.get(key), dict):
            payload[key] = {**payload[key], **value}
        else:
            payload[key] = value
    return payload


ORANGE = {"identifier": "W1", "event": "Heavy Rainfall", "severity": "Severe", "colour": "orange"}
RED = {"identifier": "W2", "event": "Extremely Heavy Rainfall", "severity": "Extreme", "colour": "red"}
YELLOW = {"identifier": "W3", "event": "Thunderstorm", "severity": "Moderate", "colour": "yellow"}


class TestSafetyFloor:
    """The single most important rule in the product."""

    def test_orange_alert_floors_a_calm_forecast_at_high(self):
        result = score(base(warnings=[ORANGE]))
        assert result.overall == "HIGH"
        assert result.floored_by is not None
        assert result.floored_by["minimum"] == "HIGH"
        assert result.floored_by["colour"] == "orange"

    def test_red_alert_floors_at_extreme(self):
        result = score(base(warnings=[RED]))
        assert result.overall == "EXTREME"

    def test_yellow_alert_floors_at_moderate(self):
        result = score(base(warnings=[YELLOW]))
        assert result.overall == "MODERATE"

    def test_the_floor_can_never_lower_a_computed_risk(self):
        # Extreme rainfall computes EXTREME; a yellow alert must not pull it down.
        result = score(base(forecast={"rain_24h_mm": 400, "rain_duration_hours": 20,
                                      "wind_kmh": 70, "visibility_km": 0.5},
                            warnings=[YELLOW]))
        assert result.overall == "EXTREME"

    def test_an_extreme_hazard_alone_reaches_extreme(self):
        # 400 mm is nearly double IMD's "extremely heavy" threshold. A weighted
        # composite must not average that down to HIGH.
        result = score(base(forecast={"rain_24h_mm": 400, "rain_duration_hours": 20,
                                      "wind_kmh": 70, "visibility_km": 0.5}))
        assert result.overall == "EXTREME"
        assert result.hazard_floor is not None
        assert result.hazard_floor["hazard"] in {"rainfall", "wind"}

    def test_the_hazard_floor_reports_what_it_raised_from(self):
        result = score(base(forecast={"rain_24h_mm": 400, "rain_duration_hours": 20,
                                      "wind_kmh": 70, "visibility_km": 0.5}))
        assert result.hazard_floor["raised_from"] == result.computed_band
        assert result.computed_band != "EXTREME", "the composite alone did not get there"

    def test_a_calm_day_has_no_hazard_floor(self):
        assert score(base()).hazard_floor is None

    def test_the_demo_scenario_is_not_inflated_by_the_hazard_floor(self):
        result = score(base(
            location={"zone": "plains", "urban_flood_prone": True},
            forecast={"rain_24h_mm": 118, "wind_kmh": 34, "gust_kmh": 51,
                      "visibility_km": 4.5, "rain_duration_hours": 9, "temp_max_c": 29},
            antecedent={"rain_72h_mm": 61},
            warnings=[ORANGE],
        ))
        assert result.overall == "HIGH"

    def test_no_floor_record_when_the_model_already_reached_it(self):
        result = score(base(forecast={"rain_24h_mm": 400, "rain_duration_hours": 20,
                                      "wind_kmh": 70, "visibility_km": 0.5},
                            warnings=[YELLOW]))
        assert result.floored_by is None, "the floor was not what produced this level"

    def test_the_most_severe_warning_wins(self):
        result = score(base(warnings=[YELLOW, RED, ORANGE]))
        assert result.overall == "EXTREME"

    def test_no_warnings_means_no_floor(self):
        result = score(base())
        assert result.floored_by is None
        assert result.overall == result.computed_band

    def test_floor_records_what_it_raised_from(self):
        result = score(base(warnings=[RED]))
        assert result.floored_by["raised_from"] == result.computed_band
        assert result.floored_by["identifier"] == "W2"

    def test_severity_is_used_when_colour_is_absent(self):
        no_colour = {"identifier": "W4", "event": "Cyclone", "severity": "Extreme"}
        assert apply_safety_floor("LOW", [no_colour])[0] == "EXTREME"

    def test_direct_floor_helper(self):
        assert apply_safety_floor("LOW", [ORANGE])[0] == "HIGH"
        assert apply_safety_floor("EXTREME", [ORANGE])[0] == "EXTREME"
        assert apply_safety_floor("MODERATE", [])[0] == "MODERATE"


class TestStrongestWarning:
    def test_picks_the_worst(self):
        assert strongest_warning([YELLOW, ORANGE, RED])["identifier"] == "W2"

    def test_none_when_empty(self):
        assert strongest_warning([]) is None


class TestScoring:
    def test_a_calm_day_is_low(self):
        result = score(base())
        assert result.overall == "LOW"
        assert result.score < 41

    def test_score_is_bounded(self):
        result = score(base(forecast={"rain_24h_mm": 2000, "wind_kmh": 300, "gust_kmh": 400,
                                      "visibility_km": 0, "rain_duration_hours": 24},
                            antecedent={"rain_72h_mm": 900}, warnings=[RED]))
        assert 0 <= result.score <= 100

    def test_the_demo_scenario_reproduces(self):
        result = score(base(
            location={"zone": "plains", "urban_flood_prone": True},
            forecast={"rain_24h_mm": 118, "wind_kmh": 34, "gust_kmh": 51,
                      "visibility_km": 4.5, "rain_duration_hours": 9, "temp_max_c": 29},
            antecedent={"rain_72h_mm": 61},
            warnings=[ORANGE],
        ))
        assert result.overall == "HIGH"
        assert result.rainfall_colour == "orange"
        assert result.derived["flood"]["band"] in {"HIGH", "EXTREME"}

    def test_breakdown_weights_sum_close_to_the_score(self):
        result = score(base(forecast={"rain_24h_mm": 118, "wind_kmh": 34, "gust_kmh": 51,
                                      "visibility_km": 4.5, "rain_duration_hours": 9},
                            warnings=[ORANGE]))
        total = sum(c["weight"] for c in result.breakdown)
        assert abs(total - result.score) <= 3, "the card must be able to show its own arithmetic"

    def test_every_component_explains_itself(self):
        result = score(base())
        assert len(result.breakdown) == 6
        for component in result.breakdown:
            assert component["note"], f"{component['key']} has no explanation"
            assert component["band"] in {"LOW", "MODERATE", "HIGH", "EXTREME"}

    def test_missing_data_never_invents_a_number(self):
        result = score({"forecast": {}, "warnings": []})
        assert result.overall == "LOW"
        assert result.score == 0
        rain = next(c for c in result.breakdown if c["key"] == "rainfall")
        assert "no data" in rain["note"]

    def test_response_declares_the_weights_are_ours(self):
        result = score(base())
        assert any("engineering configuration" in n for n in result.notes)


class TestFloodComposite:
    def test_dry_ground_does_not_amplify(self):
        band, note = flood_risk("MODERATE", 0, False)
        assert band == "MODERATE"
        assert "no significant antecedent" in note

    def test_saturated_ground_raises_the_band(self):
        band, note = flood_risk("MODERATE", 120, False)
        assert band == "HIGH"
        assert "saturated" in note

    def test_urban_flood_prone_raises_the_band(self):
        assert flood_risk("MODERATE", 0, True)[0] == "HIGH"

    def test_a_flood_prone_town_in_light_rain_is_still_low(self):
        assert flood_risk("LOW", 0, True)[0] == "LOW"

    def test_cannot_exceed_extreme(self):
        assert flood_risk("EXTREME", 500, True)[0] == "EXTREME"


class TestTravel:
    def test_worst_factor_drives_it(self):
        band, note = travel_risk("LOW", "LOW", "HIGH")
        assert band == "HIGH"
        assert "visibility" in note


class TestHeat:
    def test_below_the_floor_is_low(self):
        assert heat_risk(29, "plains")[0] == "LOW"

    def test_terrain_changes_the_floor(self):
        assert heat_risk(38, "plains")[0] == "LOW"
        assert heat_risk(38, "coastal")[0] == "MODERATE"
        assert heat_risk(32, "hills")[0] == "MODERATE"

    def test_departure_criterion_when_a_normal_is_supplied(self):
        assert heat_risk(42, "plains", normal_max_c=37)[0] == "HIGH"       # +5.0
        assert heat_risk(44, "plains", normal_max_c=37)[0] == "EXTREME"    # +7.0
        assert heat_risk(41, "plains", normal_max_c=39)[0] == "MODERATE"   # +2.0

    def test_absolute_thresholds_without_a_normal(self):
        assert heat_risk(45, "plains")[0] == "HIGH"
        assert heat_risk(47, "plains")[0] == "EXTREME"

    def test_it_says_when_it_could_not_apply_the_departure_rule(self):
        _, note = heat_risk(41, "plains")
        assert "no climatological normal" in note

    def test_missing_temperature(self):
        assert heat_risk(None)[0] == "LOW"
