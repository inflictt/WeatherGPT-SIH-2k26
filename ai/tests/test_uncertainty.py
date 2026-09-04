"""
Confidence from model disagreement.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.engines.uncertainty import score  # noqa: E402


def models(*values):
    return [{"name": f"m{i}", "rain_24h_mm": v} for i, v in enumerate(values)]


class TestLevels:
    def test_tight_agreement_close_in_is_high(self):
        result = score({"models": models(130, 135, 140), "lead_hours": 6})
        assert result.level == "HIGH"
        assert result.band_agreement is True

    def test_wide_disagreement_is_low(self):
        result = score({"models": models(10, 120, 200), "lead_hours": 6})
        assert result.level == "LOW"

    def test_a_distant_forecast_is_low_however_tight(self):
        result = score({"models": models(130, 132, 131), "lead_hours": 96})
        assert result.level == "LOW"

    def test_mid_range_lead_is_medium(self):
        result = score({"models": models(130, 135, 140), "lead_hours": 48})
        assert result.level == "MEDIUM"

    def test_crossing_an_imd_band_caps_confidence_at_medium(self):
        # 96 and 137 differ by only 14 % but straddle 115.6 mm, so one model
        # says 'heavy' and another says 'very heavy'. The advice differs.
        result = score({"models": models(96, 137, 121), "lead_hours": 9})
        assert result.level == "MEDIUM"
        assert result.band_agreement is False
        assert result.spread is not None and result.spread < 0.2
        assert any("IMD category" in r for r in result.reasons)


class TestEvidence:
    def test_it_reports_the_spread_and_range(self):
        result = score({"models": models(96, 137, 121), "lead_hours": 9})
        assert result.mean_mm == 118.0
        assert result.range_mm == 41.0
        assert result.bands == ["HIGH", "MODERATE"]

    def test_every_result_explains_itself(self):
        result = score({"models": models(96, 137, 121), "lead_hours": 9})
        assert len(result.reasons) >= 3
        assert all(isinstance(r, str) and r for r in result.reasons)

    def test_probability_is_quoted_when_supplied(self):
        result = score({"models": models(96, 137), "lead_hours": 9, "probability": 0.78})
        assert any("78 %" in r for r in result.reasons)


class TestEdgeCases:
    def test_one_model_cannot_be_cross_checked(self):
        result = score({"models": models(100), "lead_hours": 6})
        assert result.level == "LOW"
        assert "nothing to cross-check" in result.reasons[0]

    def test_no_models_at_all(self):
        result = score({"models": [], "lead_hours": 6})
        assert result.level == "LOW"
        assert result.mean_mm is None

    def test_agreement_on_a_dry_day_is_confident_not_uncertain(self):
        # 0.1 vs 0.4 mm is a 100 % relative spread about nothing at all.
        result = score({"models": models(0.1, 0.4, 0.2), "lead_hours": 6})
        assert result.level == "HIGH"
        assert "stays dry" in result.reasons[0]

    def test_a_dry_but_distant_forecast_is_only_medium(self):
        result = score({"models": models(0.1, 0.4, 0.2), "lead_hours": 120})
        assert result.level == "MEDIUM"

    def test_models_with_no_value_are_ignored(self):
        result = score({"models": [{"name": "a", "rain_24h_mm": None},
                                   {"name": "b", "rain_24h_mm": 100},
                                   {"name": "c", "rain_24h_mm": 105}], "lead_hours": 6})
        assert len(result.models) == 2
        assert result.level == "HIGH"
