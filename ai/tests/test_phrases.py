"""
The language mechanism.

The PRD claims that adding Marathi is "a config entry, not a rewrite". That is
easy to assert and easy to quietly stop being true. These tests check it: a
language is added by putting keys in the tables, and if doing so ever requires
touching a code path, something here fails.

They also guard the two ways a partially translated language can go wrong —
raising mid-request, or being served to a user as a mix of two languages.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.engines.compose import compose  # noqa: E402
from app.engines.phrases import (  # noqa: E402
    ACTIONS,
    DEFAULT_LANGUAGE,
    LANGUAGES,
    RAIN_YES,
    SHIPPING,
    WHEN,
    coverage,
    lang_or_default,
    say,
)


def ctx(**over):
    base = {
        "question": "will it rain",
        "intent": "rain_forecast",
        "language": "en",
        "persona": "farmer",
        "location": {"name": "Udaipur", "district": "Udaipur"},
        "window": {"label": "today"},
        "forecast": {"rain_mm": 118.0, "prob": 0.78, "wind_kmh": 34.0,
                     "gust_kmh": 51.0, "tmax": 29.0, "tmin": 23.0},
        "warnings": [],
        "risk": {"overall": "HIGH", "score": 74, "floored_by": None},
        "confidence": {"level": "MEDIUM", "reasons": []},
        "sources": [{"name": "Open-Meteo"}],
    }
    base.update(over)
    return base


class TestEnglishIsComplete:
    """Every fallback lands on English, so English may never have a hole."""

    def test_english_is_100_percent(self):
        c = coverage("en")
        assert c["complete"], f"English is missing {c['missing_tables']} {c['missing_actions']}"

    def test_every_shipping_language_is_complete(self):
        # A language is only offered once it is finished. Half a translation
        # reads as broken software rather than as progress.
        for lang in SHIPPING:
            c = coverage(lang)
            assert c["complete"], (
                f"{lang} is shipping but only {c['percent']}% translated — "
                f"missing {c['missing_tables']} {c['missing_actions']}"
            )


class TestPerStringFallback:
    """A missing string falls back on its own, not by dropping the language."""

    def test_missing_language_uses_english(self):
        assert say(RAIN_YES, "mr") == RAIN_YES["en"]

    def test_missing_key_within_a_present_language_uses_english(self):
        partial = {"en": {"a": "English A", "b": "English B"}, "mr": {"a": "Marathi A"}}
        assert say(partial, "mr", key="a") == "Marathi A"
        assert say(partial, "mr", key="b") == "English B"

    def test_an_unknown_key_returns_the_key_rather_than_raising(self):
        # Visible in the interface, which someone notices — unlike a blank.
        assert say(WHEN, "en", key="the-week-after-next") == "the-week-after-next"

    def test_fallback_never_raises_for_any_registered_language(self):
        for lang in LANGUAGES:
            assert isinstance(say(RAIN_YES, lang), str)


class TestUntranslatedLanguagesAreNotServed:
    def test_a_registered_but_untranslated_language_answers_in_english(self):
        # Not "mr" — returning English text tagged `mr` would hand a
        # Marathi voice words that are not Marathi.
        assert lang_or_default("mr") == "en"

    def test_shipping_languages_are_honoured(self):
        for lang in SHIPPING:
            assert lang_or_default(lang) == lang

    def test_nonsense_falls_back(self):
        assert lang_or_default("klingon") == DEFAULT_LANGUAGE
        assert lang_or_default(None) == DEFAULT_LANGUAGE

    def test_compose_reports_the_language_it_actually_wrote(self):
        for requested in LANGUAGES + ("klingon", None):
            answer = compose(ctx(language=requested))
            assert answer["language"] in SHIPPING
            assert answer["summary"]


class TestAddingALanguageIsConfigOnly:
    """The PRD's claim, checked.

    If adding a language ever needs a code change, one of these fails — because
    each simulates a language that exists only as data.
    """

    def test_a_new_language_needs_no_new_code_path(self):
        # Register a fake language purely as table entries and confirm the
        # composer produces a complete answer in it.
        import app.engines.phrases as ph

        fake = "zz"
        added = []
        try:
            for name, table in list(vars(ph).items()):
                if name.isupper() and isinstance(table, dict) and "en" in table:
                    table[fake] = table["en"]
                    added.append(table)
            for action in ph.ACTIONS:
                action["text"][fake] = action["text"]["en"]
            ph.SHIPPING = ph.SHIPPING + (fake,)

            assert coverage(fake)["complete"]
            answer = compose(ctx(language=fake))
            assert answer["language"] == fake
            assert answer["summary"] and answer["recommendedActions"]
        finally:
            for table in added:
                table.pop(fake, None)
            for action in ph.ACTIONS:
                action["text"].pop(fake, None)
            ph.SHIPPING = tuple(x for x in ph.SHIPPING if x != fake)

    def test_every_action_carries_english(self):
        for action in ACTIONS:
            assert "en" in action["text"], f"{action['key']} has no English text"

    def test_actions_are_uniquely_keyed(self):
        keys = [a["key"] for a in ACTIONS]
        assert len(keys) == len(set(keys))


class TestCoverageReport:
    def test_untranslated_language_reports_zero(self):
        c = coverage("ta")
        assert c["percent"] == 0.0
        assert not c["complete"]
        assert c["missing_tables"]

    def test_coverage_names_what_is_missing(self):
        # The report has to be actionable — "62%" alone tells a translator
        # nothing about what to do next.
        c = coverage("bn")
        assert "RAIN_YES" in c["missing_tables"]
        assert "cover_harvest" in c["missing_actions"]
