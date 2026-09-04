"""
Boundary tests for every IMD threshold.

These are the tests that matter most. A one-millimetre error at 64.5 mm is the
difference between "be aware" and "nothing to see", so every boundary is
checked on both sides.

Runs with pytest, and also with plain `python -m unittest` — see tests/run.py.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.engines.thresholds import (  # noqa: E402
    COLOUR_FLOOR,
    HEAT_FLOOR_C,
    RAINFALL_24H,
    WIND_KMH,
    band_from_score,
    classify,
    max_band,
    rainfall_colour,
)


class TestRainfallBoundaries:
    def test_below_heavy_is_low(self):
        assert classify(64.4, RAINFALL_24H)[0] == "LOW"

    def test_exactly_heavy_is_moderate(self):
        # 64.5 mm IS heavy rain by IMD's definition, not "almost heavy".
        assert classify(64.5, RAINFALL_24H)[0] == "MODERATE"

    def test_top_of_heavy_is_still_moderate(self):
        assert classify(115.5, RAINFALL_24H)[0] == "MODERATE"

    def test_exactly_very_heavy_is_high(self):
        assert classify(115.6, RAINFALL_24H)[0] == "HIGH"

    def test_top_of_very_heavy_is_still_high(self):
        assert classify(204.4, RAINFALL_24H)[0] == "HIGH"

    def test_exactly_extremely_heavy_is_extreme(self):
        assert classify(204.5, RAINFALL_24H)[0] == "EXTREME"

    def test_far_above_stays_extreme(self):
        assert classify(900.0, RAINFALL_24H)[0] == "EXTREME"

    def test_zero_and_none(self):
        assert classify(0, RAINFALL_24H)[0] == "LOW"
        assert classify(None, RAINFALL_24H)[0] == "LOW"
        assert classify(None, RAINFALL_24H)[1] == "no data"

    def test_label_cites_imd(self):
        assert "IMD" in classify(150, RAINFALL_24H)[1]


class TestRainfallColour:
    def test_colour_ladder_matches_the_bands(self):
        assert rainfall_colour(10) == "green"
        assert rainfall_colour(64.5) == "yellow"
        assert rainfall_colour(115.6) == "orange"
        assert rainfall_colour(204.5) == "red"
        assert rainfall_colour(None) == "green"


class TestWindBoundaries:
    def test_bands(self):
        assert classify(19.9, WIND_KMH)[0] == "LOW"
        assert classify(20, WIND_KMH)[0] == "MODERATE"
        assert classify(39.9, WIND_KMH)[0] == "MODERATE"
        assert classify(40, WIND_KMH)[0] == "HIGH"
        assert classify(61.9, WIND_KMH)[0] == "HIGH"

    def test_squall_threshold_is_62(self):
        # IMD calls 34 kt (~62 km/h) a squall.
        assert classify(62, WIND_KMH)[0] == "EXTREME"


class TestColourFloor:
    def test_every_colour_has_a_floor(self):
        assert COLOUR_FLOOR == {
            "green": "LOW",
            "yellow": "MODERATE",
            "orange": "HIGH",
            "red": "EXTREME",
        }


class TestScoreBands:
    def test_boundaries(self):
        assert band_from_score(0) == "LOW"
        assert band_from_score(40) == "LOW"
        assert band_from_score(41) == "MODERATE"
        assert band_from_score(60) == "MODERATE"
        assert band_from_score(61) == "HIGH"
        assert band_from_score(80) == "HIGH"
        assert band_from_score(81) == "EXTREME"
        assert band_from_score(100) == "EXTREME"


class TestMaxBand:
    def test_picks_the_most_severe(self):
        assert max_band("LOW", "HIGH", "MODERATE") == "HIGH"
        assert max_band("LOW") == "LOW"
        assert max_band() == "LOW"
        assert max_band(None, "EXTREME") == "EXTREME"

    def test_ignores_nonsense(self):
        assert max_band("BANANA", "MODERATE") == "MODERATE"


class TestHeatFloors:
    def test_terrain_changes_the_floor(self):
        assert HEAT_FLOOR_C["plains"] == 40.0
        assert HEAT_FLOOR_C["coastal"] == 37.0
        assert HEAT_FLOOR_C["hills"] == 30.0
