"""
Grounding checks.

§10 of the PRD states the rule plainly: every number in the output must appear
in the input. This module is that sentence as code, and it is what makes the
anti-hallucination claim architectural rather than a line in a prompt.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.engines.validate import (  # noqa: E402
    collect_numbers,
    ungrounded_numbers,
    validate_answer,
)


class TestUngroundedNumbers:
    def test_number_present_in_context_passes(self):
        assert ungrounded_numbers("around 118 mm", {118.0, 74.0}) == []

    def test_invented_number_is_caught(self):
        assert ungrounded_numbers("around 300 mm", {118.0}) == [300.0]

    def test_rounding_within_tolerance_passes(self):
        # The composer legitimately says "118 mm" for 117.6.
        assert ungrounded_numbers("118 mm", {117.6}) == []

    def test_rounding_beyond_tolerance_is_caught(self):
        assert ungrounded_numbers("140 mm", {117.6}) == [140.0]

    def test_clock_times_are_not_treated_as_quantities(self):
        assert ungrounded_numbers("between 17:00 and 20:00", set()) == []

    def test_iso_timestamps_are_not_treated_as_quantities(self):
        assert ungrounded_numbers("issued 2026-09-04T10:00:00+05:30", set()) == []

    def test_devanagari_digits_are_checked_too(self):
        # A Hindi answer may render figures in Devanagari numerals.
        assert ungrounded_numbers("लगभग ३०० मिमी", {118.0}) == [300.0]

    def test_devanagari_digits_that_are_grounded_pass(self):
        assert ungrounded_numbers("लगभग ११८ मिमी", {118.0}) == []

    def test_percentages_are_checked_against_the_context(self):
        assert ungrounded_numbers("78 % chance", {0.78, 78.0}) == []

    def test_several_inventions_are_all_reported(self):
        assert sorted(ungrounded_numbers("300 mm and 90 km/h", {118.0})) == [90.0, 300.0]

    def test_decimals_are_handled(self):
        assert ungrounded_numbers("64.5 mm", {64.5}) == []

    def test_zero_is_grounded_when_supplied(self):
        assert ungrounded_numbers("0 mm expected", {0.0}) == []

    def test_empty_text_is_trivially_grounded(self):
        assert ungrounded_numbers("", set()) == []


class TestCollectNumbers:
    def test_walks_nested_context(self):
        got = collect_numbers({"forecast": {"rain_mm": 118, "wind_kmh": 34},
                               "risk": {"score": 74}})
        assert {118.0, 34.0, 74.0} <= got

    def test_probability_is_offered_as_both_fraction_and_percent(self):
        got = collect_numbers({"forecast": {"prob": 0.78}})
        assert 0.78 in got and 78.0 in got

    def test_lists_are_walked(self):
        got = collect_numbers({"models": [{"mm": 96}, {"mm": 137}]})
        assert {96.0, 137.0} <= got

    def test_strings_that_hold_numbers_are_walked(self):
        # "17:00-20:00" carries no quantity, but "115.6-204.4 mm" in official
        # text does, and the answer is allowed to quote it.
        got = collect_numbers({"warnings": [{"headline": "115.6 to 204.4 mm likely"}]})
        assert {115.6, 204.4} <= got

    def test_booleans_are_not_numbers(self):
        assert collect_numbers({"degraded": True}) == set()


class TestValidateAnswer:
    CTX = {"numbers": {118.0, 74.0}, "sources": ["Open-Meteo", "NDMA Sachet (CAP)"],
           "warnings": ["W1"]}

    def test_a_grounded_answer_passes(self):
        ok, why = validate_answer(
            {"summary": "Around 118 mm is expected.", "sources": ["Open-Meteo"],
             "warningRef": "W1"},
            self.CTX,
        )
        assert ok and why == []

    def test_unknown_source_is_rejected(self):
        ok, why = validate_answer(
            {"summary": "x", "sources": ["AccuWeather"]},
            {"numbers": set(), "sources": ["Open-Meteo"], "warnings": []},
        )
        assert not ok
        assert any("source" in w for w in why)

    def test_unknown_warning_reference_is_rejected(self):
        ok, why = validate_answer(
            {"summary": "x", "warningRef": "FAKE"},
            {"numbers": set(), "sources": [], "warnings": ["W1"]},
        )
        assert not ok
        assert any("warning" in w for w in why)

    def test_invented_number_in_the_summary_is_rejected(self):
        ok, why = validate_answer({"summary": "About 900 mm."}, self.CTX)
        assert not ok
        assert any("900" in w for w in why)

    def test_invented_number_in_an_action_is_rejected(self):
        ok, why = validate_answer(
            {"summary": "Around 118 mm.", "recommendedActions": ["Expect 512 mm"]},
            self.CTX,
        )
        assert not ok

    def test_invented_number_in_the_gloss_is_rejected(self):
        ok, why = validate_answer(
            {"summary": "Around 118 mm.", "gloss": "That is 640 mm."}, self.CTX
        )
        assert not ok

    def test_an_answer_with_no_numbers_at_all_passes(self):
        ok, why = validate_answer({"summary": "Rain is likely this evening."}, self.CTX)
        assert ok and why == []

    def test_no_warning_reference_is_fine(self):
        ok, _ = validate_answer({"summary": "Rain is likely."}, self.CTX)
        assert ok
