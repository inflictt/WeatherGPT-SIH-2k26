"""
The grounded composer.

This is the component that decides whether "removing the LLM key does not break
the application" is a claim or a fact. Here it is a fact: `compose()` produces
the entire structured answer from templates and the fetched context, with no
model involved. The LLM, when configured at all, only rephrases what this
already said — and anything it adds is stripped by the validator.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.engines.compose import compose  # noqa: E402
from app.engines.validate import collect_numbers, validate_answer  # noqa: E402

DEVANAGARI = tuple(chr(c) for c in range(0x0900, 0x097F))


def has_devanagari(s: str) -> bool:
    return any("ऀ" <= c <= "ॿ" for c in s or "")


def ctx(**overrides):
    base = {
        "question": "will it rain this evening",
        "intent": "rain_forecast",
        "language": "en",
        "persona": "farmer",
        "location": {"name": "Udaipur", "district": "Udaipur", "state": "Rajasthan"},
        "window": {"label": "this evening", "day_offset": 0,
                   "from_hour": 16, "to_hour": 21},
        "forecast": {
            "rain_mm": 118.0, "prob": 0.78, "peak": "17:00-20:00",
            "wind_kmh": 34.0, "gust_kmh": 51.0, "tmax": 29.0, "tmin": 23.0,
        },
        "warnings": [
            {
                "identifier": "W1",
                "event": "Heavy to Very Heavy Rainfall",
                "colour": "orange",
                "severity": "Severe",
                "headline": "Very heavy rainfall very likely at isolated places.",
                "instruction": "Avoid travel through low-lying stretches.",
                "senderName": "IMD Jaipur",
                "expires": "2026-09-05T08:00:00+05:30",
            }
        ],
        "risk": {"overall": "HIGH", "score": 74, "computed_band": "HIGH",
                 "floored_by": None, "derived": {}},
        "confidence": {"level": "MEDIUM", "spread": 0.34, "lead_hours": 9,
                       "reasons": ["The models differ on how much rain falls."]},
        "sources": [{"name": "Open-Meteo"}, {"name": "NDMA Sachet (CAP)"}],
    }
    for k, v in overrides.items():
        base[k] = v
    return base


class TestGrounding:
    """Nothing the composer writes may be un-fetchable."""

    def test_every_number_it_writes_is_grounded(self):
        answer = compose(ctx())
        ok, why = validate_answer(
            answer,
            {
                "numbers": collect_numbers(ctx()),
                "sources": ["Open-Meteo", "NDMA Sachet (CAP)"],
                "warnings": ["W1"],
            },
        )
        assert ok, why

    def test_it_reports_its_own_grounding(self):
        assert compose(ctx())["grounded"] is True

    def test_grounding_holds_in_hindi(self):
        c = ctx(language="hi")
        answer = compose(c)
        ok, why = validate_answer(
            answer,
            {"numbers": collect_numbers(c),
             "sources": ["Open-Meteo", "NDMA Sachet (CAP)"], "warnings": ["W1"]},
        )
        assert ok, why

    def test_grounding_holds_in_hinglish(self):
        c = ctx(language="hinglish")
        answer = compose(c)
        ok, why = validate_answer(
            answer,
            {"numbers": collect_numbers(c),
             "sources": ["Open-Meteo", "NDMA Sachet (CAP)"], "warnings": ["W1"]},
        )
        assert ok, why

    def test_it_never_names_a_source_it_was_not_given(self):
        answer = compose(ctx())
        assert set(answer["sources"]) <= {"Open-Meteo", "NDMA Sachet (CAP)"}


class TestMissingData:
    """§10: missing data produces 'I don't know', never an estimate."""

    def test_no_forecast_says_so(self):
        a = compose(ctx(forecast=None))
        assert a["insufficient_data"] is True
        assert "don't have" in a["summary"].lower()

    def test_no_rainfall_figure_says_so(self):
        a = compose(ctx(forecast={"rain_mm": None, "prob": None}))
        assert a["insufficient_data"] is True

    def test_missing_data_still_reports_an_active_warning(self):
        # The warning is fetched independently and must survive a forecast gap.
        a = compose(ctx(forecast=None))
        assert a["warningRef"] == "W1"
        assert a["warningMessage"]

    def test_missing_data_produces_no_numbers_at_all(self):
        a = compose(ctx(forecast=None))
        from app.engines.validate import numbers_in_text
        assert numbers_in_text(a["summary"]) == []

    def test_missing_data_says_it_in_hindi_too(self):
        a = compose(ctx(forecast=None, language="hi"))
        assert a["insufficient_data"] is True
        assert has_devanagari(a["summary"])


class TestWarningPrecedence:
    def test_active_warning_is_referenced(self):
        assert compose(ctx())["warningRef"] == "W1"

    def test_warning_message_is_a_gloss_not_the_official_text(self):
        a = compose(ctx())
        official = ctx()["warnings"][0]["headline"]
        # The gloss must be a separate, labelled sentence — never the official
        # text edited, softened or re-timed (invariant 2).
        assert a["warningMessage"] != official
        assert a["officialText"]["headline"] == official

    def test_official_text_is_passed_through_byte_for_byte(self):
        w = ctx()["warnings"][0]
        a = compose(ctx())
        assert a["officialText"]["headline"] == w["headline"]
        assert a["officialText"]["instruction"] == w["instruction"]

    def test_no_warning_leaves_the_reference_empty(self):
        a = compose(ctx(warnings=[]))
        assert a["warningRef"] is None
        assert a["warningMessage"] is None

    def test_the_most_severe_warning_wins(self):
        a = compose(ctx(warnings=[
            {"identifier": "Y", "colour": "yellow", "event": "Thunderstorm",
             "headline": "Thunderstorm likely.", "senderName": "IMD"},
            {"identifier": "R", "colour": "red", "event": "Extremely Heavy Rainfall",
             "headline": "Extremely heavy rainfall likely.", "senderName": "IMD"},
        ]))
        assert a["warningRef"] == "R"


class TestLanguages:
    def test_english_has_no_gloss(self):
        a = compose(ctx(language="en"))
        assert a["gloss"] is None

    def test_hindi_is_devanagari_with_an_english_gloss(self):
        a = compose(ctx(language="hi"))
        assert has_devanagari(a["summary"])
        assert a["gloss"] and not has_devanagari(a["gloss"])

    def test_hinglish_displays_in_latin(self):
        a = compose(ctx(language="hinglish"))
        assert not has_devanagari(a["summary"])

    def test_hinglish_speaks_in_devanagari(self):
        # The PRD's actual insight: compose in Hindi, transliterate to Latin for
        # display, speak the Devanagari form so hi-IN pronunciation is correct.
        a = compose(ctx(language="hinglish"))
        assert has_devanagari(a["speech"])

    def test_hindi_speech_is_the_summary_itself(self):
        a = compose(ctx(language="hi"))
        assert a["speech"] == a["summary"]

    def test_english_speech_is_the_summary_itself(self):
        a = compose(ctx(language="en"))
        assert a["speech"] == a["summary"]

    def test_an_unknown_language_falls_back_to_english_rather_than_failing(self):
        a = compose(ctx(language="mr"))
        assert a["summary"]
        assert a["language"] == "en"


class TestPersona:
    def test_persona_changes_only_the_action(self):
        f = compose(ctx(persona="farmer"))
        t = compose(ctx(persona="traveller"))
        assert f["summary"] == t["summary"]
        assert f["riskExplanation"] == t["riskExplanation"]
        assert f["recommendedActions"] != t["recommendedActions"]

    def test_every_persona_produces_at_least_one_action(self):
        for p in ("general", "farmer", "traveller", "official"):
            assert compose(ctx(persona=p))["recommendedActions"]

    def test_a_calm_day_does_not_advise_covering_the_harvest(self):
        calm = ctx(
            forecast={"rain_mm": 0.2, "prob": 0.05, "wind_kmh": 6.0,
                      "gust_kmh": 9.0, "tmax": 28.0, "tmin": 19.0, "peak": None},
            warnings=[],
            risk={"overall": "LOW", "score": 6, "computed_band": "LOW",
                  "floored_by": None, "derived": {}},
            persona="farmer",
        )
        joined = " ".join(compose(calm)["recommendedActions"]).lower()
        assert "cover" not in joined

    def test_an_unknown_persona_falls_back_to_general(self):
        assert compose(ctx(persona="astronaut"))["recommendedActions"]


class TestRiskAndConfidence:
    def test_risk_explanation_quotes_the_engine(self):
        a = compose(ctx())
        assert "HIGH" in a["riskExplanation"]
        assert "74" in a["riskExplanation"]

    def test_the_safety_floor_is_stated_when_it_fired(self):
        a = compose(ctx(risk={
            "overall": "HIGH", "score": 30, "computed_band": "LOW",
            "floored_by": {"colour": "orange", "minimum": "HIGH",
                           "raised_from": "LOW"},
            "derived": {},
        }))
        assert "orange" in a["riskExplanation"].lower()
        assert a["flooredBy"] is not None

    def test_confidence_explanation_uses_the_engine_reasons(self):
        a = compose(ctx())
        assert "differ" in a["uncertaintyExplanation"]

    def test_absent_risk_engine_degrades_without_inventing_a_band(self):
        a = compose(ctx(risk=None))
        assert a["riskBand"] is None
        assert a["summary"]

    def test_absent_confidence_engine_degrades_quietly(self):
        a = compose(ctx(confidence=None))
        assert a["confidenceLevel"] is None
        assert a["summary"]


class TestAnswerShape:
    REQUIRED = (
        "summary", "gloss", "speech", "warningMessage", "officialText",
        "riskExplanation", "uncertaintyExplanation", "recommendedActions",
        "actionsGloss", "warningRef", "riskBand", "confidenceLevel",
        "sources", "language", "grounded", "insufficient_data", "flooredBy",
        "composer", "engine_version",
    )

    def test_every_field_is_always_present(self):
        # The client renders from fields, not from prose. A missing key is a
        # crashed card, so the contract is total.
        for case in (ctx(), ctx(forecast=None), ctx(warnings=[]),
                     ctx(risk=None, confidence=None)):
            a = compose(case)
            for field in self.REQUIRED:
                assert field in a, f"{field} missing"

    def test_composer_is_labelled_deterministic(self):
        assert compose(ctx())["composer"] == "deterministic"

    def test_dry_day_answers_in_the_negative(self):
        a = compose(ctx(forecast={"rain_mm": 0.0, "prob": 0.02, "wind_kmh": 5.0,
                                  "gust_kmh": 7.0, "tmax": 30.0, "tmin": 20.0,
                                  "peak": None},
                        warnings=[]))
        assert "no" in a["summary"].lower()
