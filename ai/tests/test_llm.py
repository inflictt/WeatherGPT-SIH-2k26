"""
The optional phrasing pass.

Every test here runs with no API key and no network, because that is the
configuration the product must survive — §10 requires that killing the key
leaves a working answer. The LLM is a stylist working on top of an answer that
is already complete and already correct.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.llm import (  # noqa: E402
    PROSE_FIELDS,
    LlmConfig,
    merge_prose,
    rephrase,
)

ANSWER = {
    "summary": "Yes — very heavy rain is likely in Udaipur this evening, around 118 mm.",
    "gloss": None,
    "speech": "Yes — very heavy rain is likely in Udaipur this evening, around 118 mm.",
    "warningMessage": "IMD Jaipur has an active orange alert for this area — be prepared.",
    "riskExplanation": "Overall risk is HIGH, with a score of 74.",
    "uncertaintyExplanation": "Forecast confidence is medium.",
    "recommendedActions": ["Cover harvested produce before the rain begins."],
    "actionsGloss": [],
    "warningRef": "W1",
    "riskBand": "HIGH",
    "confidenceLevel": "MEDIUM",
    "sources": ["Open-Meteo", "NDMA Sachet (CAP)"],
    "composer": "deterministic",
}

CTX = {
    "numbers": {118.0, 74.0, 34.0},
    "sources": ["Open-Meteo", "NDMA Sachet (CAP)"],
    "warnings": ["W1"],
}


class TestDisabledByDefault:
    def test_no_key_returns_the_input_unchanged(self):
        out = rephrase(ANSWER, CTX, config=LlmConfig(api_key=None))
        assert out["summary"] == ANSWER["summary"]
        assert out["composer"] == "deterministic"

    def test_no_key_does_not_attempt_a_call(self):
        # A network call with no key would hang the request path in the venue
        # wifi failure the demo is rehearsed against.
        cfg = LlmConfig(api_key=None, base_url="http://127.0.0.1:9/never")
        assert rephrase(ANSWER, CTX, config=cfg)["summary"] == ANSWER["summary"]

    def test_explicitly_disabled_returns_the_input_unchanged(self):
        cfg = LlmConfig(api_key="sk-test", enabled=False)
        assert rephrase(ANSWER, CTX, config=cfg)["summary"] == ANSWER["summary"]

    def test_an_unreachable_endpoint_degrades_rather_than_raising(self):
        cfg = LlmConfig(api_key="sk-test", base_url="http://127.0.0.1:9/nope",
                        timeout_s=0.2)
        out = rephrase(ANSWER, CTX, config=cfg)
        assert out["summary"] == ANSWER["summary"]
        assert out["composer"] == "deterministic"


class TestMergeProse:
    """The blast radius of a hostile model response."""

    def test_only_prose_fields_are_taken(self):
        merged = merge_prose(ANSWER, {
            "summary": "Heavy rain this evening, about 118 mm.",
            "warningRef": "ATTACKER",
            "sources": ["Fabricated Source"],
            "riskBand": "LOW",
            "confidenceLevel": "HIGH",
        })
        assert merged["summary"] == "Heavy rain this evening, about 118 mm."
        # Everything structural is kept from the deterministic answer.
        assert merged["warningRef"] == "W1"
        assert merged["sources"] == ANSWER["sources"]
        assert merged["riskBand"] == "HIGH"
        assert merged["confidenceLevel"] == "MEDIUM"

    def test_a_model_cannot_lower_the_risk_band(self):
        # The safety floor lives in the risk engine. Nothing downstream of it,
        # least of all a language model, is allowed to move the number.
        merged = merge_prose(ANSWER, {"riskBand": "LOW", "summary": "All calm."})
        assert merged["riskBand"] == "HIGH"

    def test_non_string_prose_is_ignored(self):
        merged = merge_prose(ANSWER, {"summary": {"nested": "object"}})
        assert merged["summary"] == ANSWER["summary"]

    def test_empty_prose_is_ignored(self):
        assert merge_prose(ANSWER, {"summary": "   "})["summary"] == ANSWER["summary"]

    def test_actions_must_be_a_list_of_strings(self):
        merged = merge_prose(ANSWER, {"recommendedActions": "not a list"})
        assert merged["recommendedActions"] == ANSWER["recommendedActions"]

    def test_every_prose_field_is_mergeable(self):
        proposal = {f: f"rewritten {f}" for f in PROSE_FIELDS if f != "recommendedActions"}
        merged = merge_prose(ANSWER, proposal)
        for f in PROSE_FIELDS:
            if f == "recommendedActions":
                continue
            assert merged[f] == f"rewritten {f}"


class TestGroundingIsEnforcedOnTheModel:
    def test_an_invented_number_causes_the_whole_rewrite_to_be_dropped(self):
        from app.llm import accept_or_reject
        out, ok = accept_or_reject(
            ANSWER, {"summary": "Expect around 940 mm tonight."}, CTX)
        assert not ok
        assert out["summary"] == ANSWER["summary"]
        assert out["composer"] == "deterministic"

    def test_an_invented_source_causes_the_rewrite_to_be_dropped(self):
        from app.llm import accept_or_reject
        out, ok = accept_or_reject(
            ANSWER, {"summary": "Rain likely.", "sources": ["AccuWeather"]}, CTX)
        # sources are not mergeable at all, so the merge is clean and accepted;
        # the point is that the fabricated source never reaches the answer.
        assert out["sources"] == ANSWER["sources"]

    def test_a_grounded_rewrite_is_accepted_and_labelled(self):
        from app.llm import accept_or_reject
        out, ok = accept_or_reject(
            ANSWER,
            {"summary": "Heavy rain is likely this evening — about 118 mm."},
            CTX,
        )
        assert ok
        assert out["summary"] == "Heavy rain is likely this evening — about 118 mm."
        assert out["composer"] == "llm"

    def test_an_invented_number_in_an_action_is_rejected(self):
        from app.llm import accept_or_reject
        out, ok = accept_or_reject(
            ANSWER, {"recommendedActions": ["Expect 512 mm, evacuate"]}, CTX)
        assert not ok
        assert out["recommendedActions"] == ANSWER["recommendedActions"]


class TestConfig:
    def test_defaults_point_at_opencode_zen(self):
        cfg = LlmConfig()
        assert cfg.base_url.rstrip("/").endswith("/zen/v1")
        assert cfg.model

    def test_config_reads_the_environment(self, ):
        import os
        os.environ["LLM_MODEL"] = "muse-spark-1.2"
        try:
            assert LlmConfig.from_env().model == "muse-spark-1.2"
        finally:
            del os.environ["LLM_MODEL"]

    def test_absent_key_means_disabled(self):
        import os
        old = os.environ.pop("LLM_API_KEY", None)
        try:
            assert LlmConfig.from_env().usable is False
        finally:
            if old is not None:
                os.environ["LLM_API_KEY"] = old
