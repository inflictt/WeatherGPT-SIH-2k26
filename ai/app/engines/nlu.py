"""
Natural-language understanding, without a language model.

A question becomes `{intent, language, location, location_hint, window,
variables}` using a script test, a keyword ladder and a small grammar. That is
enough for the question shapes this product actually receives, and it has three
properties a model call does not: it is instant, it is free, and it cannot be
talked out of its rules by the text it is parsing.

The last point matters. §10 of the PRD requires that user text can never
redefine system behaviour. Here that is structural rather than a prompt
instruction — the parser only ever *matches* against the input, so a question
containing "ignore your rules" is scanned for weather keywords like any other
string and produces a normal (probably useless) parse.

Two design notes worth keeping:

  * `window` returns a *relative* offset and hour range, never an absolute
    timestamp. The server owns the clock and the user's timezone; a parser that
    guessed at either would be wrong twice a year and in every other state.

  * Language detection separates Hinglish from English with a romanised-Hindi
    keyword list. This is the cheapest part of the whole system and the one that
    decides whether a farmer typing "kal barish hogi kya" on a QWERTY keyboard
    is understood or ignored.
"""
from __future__ import annotations

import re
import unicodedata
from typing import Any, Literal

ENGINE_VERSION = "4.0.0"

Language = Literal["en", "hi", "hinglish"]
Intent = Literal[
    "rain_forecast", "warning_check", "advice", "temperature", "wind", "general"
]

DEVANAGARI = re.compile(r"[ऀ-ॿ]")
_WORD = re.compile(r"[\wऀ-ॿ]+", re.UNICODE)


#: U+093C, the Devanagari nukta. Removed for matching; nothing else is.
_NUKTA = "़"


def fold(text: str) -> str:
    """Lowercase, and drop Devanagari nuktas, for keyword matching only.

    Hindi has two spellings of several consonants — क़/क, ज़/ज, फ़/फ, ड़/ड — and
    people type both interchangeably. The nukta is a combining mark, so
    "तूफ़ान" and "तूफान" are different strings meaning the same word, and a
    keyword list that does not fold them silently misses half of every Hindi
    question containing one.

    Only the nukta is removed, and the reason is worth stating: an earlier
    version stripped every mark with a non-zero combining class, which also
    took the *virama* (U+094D) and destroyed every conjunct — "अलर्ट" became
    "अलरट" and stopped matching anything. Decomposing first catches the
    precomposed forms (U+0929, U+0931, U+0934 and friends) that carry the nukta
    inside a single code point.

    Folding is for matching only. Nothing user-visible is normalised; what
    someone typed is what gets stored and echoed back.
    """
    return unicodedata.normalize("NFD", text.lower()).replace(_NUKTA, "")


def _fold_all(words):
    """Fold a keyword collection so both sides of a comparison are normalised."""
    return tuple(fold(w) for w in words)


# --------------------------------------------------------------------------
# Language
# --------------------------------------------------------------------------
#: Romanised Hindi that a weather question is likely to contain. Deliberately
#: short and domain-adjacent: a long list starts colliding with English.
_HINGLISH_RAW = frozenset(
    {
        # time
        "kal", "aaj", "parso", "parson", "abhi", "subah", "shaam", "sham", "raat",
        "dopahar", "kab", "din",
        # weather
        "barish", "baarish", "mausam", "mausom", "mosam", "garmi", "sardi", "thand", "hawa",
        "toofan", "tufan", "andhi", "aandhi", "badal", "dhoop", "paani",
        # place / person
        "gaon", "gaanv", "gram", "zila", "zile", "jila", "mera", "mere",
        "meri", "hamare", "apne", "yahan", "yaha",
        # verbs and question words
        "hoga", "hogi", "hoge", "hai", "hain", "kya", "kitna", "kitni",
        "karun", "karoon", "karna", "chahiye", "milega", "rahega", "rahegi",
        "batao", "bataye", "sakta", "sakti", "kese", "kaise", "kaisa", "kaisi",
        "lagta", "lagti", "haal",
        # farming / travel
        "fasal", "sinchai", "khet", "safar", "yatra", "surakshit", "nikalna",
    }
)
HINGLISH_MARKERS: frozenset[str] = frozenset(fold(w) for w in _HINGLISH_RAW)


def detect_language(text: str) -> Language:
    """Script first, keywords second.

    Any Devanagari at all means the user reads Devanagari, so we answer in it —
    even in a sentence that is otherwise romanised. Otherwise a single
    romanised-Hindi marker is enough to choose Hinglish over English, because
    the cost of the two errors is asymmetric: Hinglish shown to an English
    speaker is still readable, English shown to a Hinglish speaker is not.
    """
    if not text or not text.strip():
        return "en"
    if DEVANAGARI.search(text):
        return "hi"
    words = {fold(w) for w in _WORD.findall(text)}
    return "hinglish" if words & HINGLISH_MARKERS else "en"


# --------------------------------------------------------------------------
# Intent
# --------------------------------------------------------------------------
#: Evaluated top to bottom; the first match wins. Order is by significance, not
#: by specificity — "is there a rain warning" is a question about a warning, and
#: answering it as a rainfall forecast would bury the thing that matters.
INTENT_KEYWORDS: tuple[tuple[Intent, tuple[str, ...]], ...] = (
    (
        "warning_check",
        ("warning", "warnings", "alert", "alerts", "chetavani", "chetawani",
         "चेतावनी", "अलर्ट", "खतरा"),
    ),
    (
        "advice",
        ("should i", "should we", "safe to", "is it safe", "do i need",
         "karun", "karoon", "chahiye", "करूँ", "करूं", "चाहिए", "सुरक्षित",
         "surakshit", "sinchai", "irrigate", "harvest", "spray",
         # Found by the evaluation set: a farmer asking about their crop is
         # asking for advice, however the sentence is shaped.
         "fasal", "khet", "crop", "sowing", "boai", "katai", "फ़सल", "फसल",
         "खेत", "सिंचाई", "yatra", "safar"),
    ),
    (
        "rain_forecast",
        ("rain", "rainfall", "shower", "showers", "drizzle", "monsoon",
         "barish", "baarish", "बारिश", "बरसात", "वर्षा", "paani girega"),
    ),
    (
        "temperature",
        ("temperature", "hot", "cold", "warm", "heat", "garmi", "sardi",
         "thand", "तापमान", "गर्मी", "सर्दी", "ठंड"),
    ),
    (
        "wind",
        ("wind", "windy", "gust", "gusts", "squall", "storm", "hawa", "andhi",
         # Folded, so the nukta spellings (तूफ़ान, आँधी) match these too.
         "aandhi", "toofan", "tufan", "हवा", "आंधी", "आँधी", "तूफान", "झोंके"),
    ),
)

#: What each intent needs fetched. The server uses this to decide what to put in
#: the grounded context; it never changes what is *scored*, only what is shown.
INTENT_VARIABLES: dict[str, list[str]] = {
    "rain_forecast": ["precipitation", "probability"],
    "warning_check": ["warnings"],
    "advice": ["precipitation", "probability", "wind", "temperature"],
    "temperature": ["temperature"],
    "wind": ["wind", "gust"],
    "general": ["precipitation", "temperature"],
}


#: Folded once at import, so both sides of every comparison are normalised.
_FOLDED_INTENTS = tuple((i, _fold_all(kws)) for i, kws in INTENT_KEYWORDS)


def detect_intent(text: str) -> Intent:
    lowered = f" {fold(text).strip()} "
    for intent, keywords in _FOLDED_INTENTS:
        for kw in keywords:
            if kw in lowered:
                return intent
    return "general"


# --------------------------------------------------------------------------
# Time window
# --------------------------------------------------------------------------
#: Relative day offsets. Hindi "kal" is both yesterday and tomorrow; in a
#: forecast question it is always tomorrow, and asking about yesterday's weather
#: is not something this product does.
DAY_WORDS: tuple[tuple[int, tuple[str, ...]], ...] = (
    (2, ("day after tomorrow", "parso", "parson", "परसों", "परसो")),
    (1, ("tomorrow", "kal", "कल", "agle din")),
    (0, ("today", "tonight", "now", "aaj", "abhi", "आज", "अभी")),
)

#: Part-of-day -> [from_hour, to_hour). Boundaries follow ordinary Indian usage
#: rather than an astronomical definition: "shaam" starts at 16:00, not sunset.
PART_OF_DAY: tuple[tuple[str, tuple[str, ...], int, int], ...] = (
    ("morning", ("morning", "subah", "savere", "सुबह", "सवेरे"), 5, 11),
    ("afternoon", ("afternoon", "dopahar", "दोपहर"), 11, 16),
    ("evening", ("evening", "shaam", "sham", "शाम", "संध्या"), 16, 21),
    ("night", ("night", "tonight", "raat", "रात"), 21, 24),
)


_FOLDED_DAYS = tuple((o, _fold_all(w)) for o, w in DAY_WORDS)
_FOLDED_PARTS = tuple((n, _fold_all(w), a, b) for n, w, a, b in PART_OF_DAY)


def parse_window(text: str) -> dict[str, Any]:
    """Relative window only — `{day_offset, from_hour, to_hour, label}`."""
    lowered = f" {fold(text).strip()} "

    day_offset = 0
    day_label = "today"
    for offset, words in _FOLDED_DAYS:
        if any(w in lowered for w in words):
            day_offset = offset
            day_label = {0: "today", 1: "tomorrow", 2: "the day after tomorrow"}[offset]
            break

    from_hour: int | None = None
    to_hour: int | None = None
    part_label = ""
    for name, words, start, end in _FOLDED_PARTS:
        if any(w in lowered for w in words):
            from_hour, to_hour, part_label = start, end, name
            break

    label = f"{day_label} {part_label}".strip() if part_label else day_label
    return {
        "day_offset": day_offset,
        "from_hour": from_hour,
        "to_hour": to_hour,
        "label": label,
    }


# --------------------------------------------------------------------------
# Location
# --------------------------------------------------------------------------
#: "my village" / "mere gaon" is a *hint* that the user means their own saved or
#: GPS location, not a place called "village". Resolving it as a name would send
#: the gazetteer looking for a town called Gaon, of which India has several.
SELF_PATTERNS: tuple[str, ...] = (
    "my village", "my town", "my city", "my district", "my area", "my place",
    "my block", "my farm", "my field", "here",
    "mere gaon", "mere gaanv", "mere gram", "mera gaon", "mere zile",
    "mere jile", "mere zila", "mere ilake", "apne gaon", "yahan", "yaha",
    "मेरे गाँव", "मेरे गांव", "मेरे गाव", "मेरे ज़िले", "मेरे जिले",
    "मेरे इलाके", "यहाँ", "यहां",
)

#: Tokens that end a place name. Everything that can legitimately follow "in
#: <place>" in one of these questions, plus the time vocabulary.
_STOP_TOKENS: frozenset[str] = frozenset(
    {
        "today", "tomorrow", "tonight", "now", "this", "next", "the", "a", "an",
        "morning", "afternoon", "evening", "night", "week", "day", "days",
        "hours", "hour", "and", "or", "for", "at", "on", "is", "are", "will",
        "would", "should", "can", "do", "does", "there", "any", "my", "me",
        "kal", "aaj", "parso", "abhi", "subah", "shaam", "sham", "raat",
        "dopahar", "mein", "me", "ke", "ki", "ka", "hai", "hain", "hoga",
        "hogi", "kya", "barish", "baarish", "mausam", "rain", "weather",
        "warning", "alert", "forecast", "temperature", "wind",
        # Devanagari stop words
        "कल", "आज", "परसों", "सुबह", "शाम", "दोपहर", "रात", "में", "मे", "के",
        "की", "का", "है", "हैं", "होगा", "होगी", "क्या", "बारिश", "मौसम", "चेतावनी", "अलर्ट",
        # Verbs and nouns that can follow a preposition but are never a place.
        "drive", "travel", "go", "going", "visit", "reach", "get", "walk",
        "safe", "district", "districts", "village", "town", "city", "state",
        "place", "area", "hours", "week", "know", "see", "expect",
    }
)

#: Prepositions that can introduce a place. "to" earns its keep — "is it safe
#: to drive to Jaipur" is a real question shape — and is also why matches are
#: tried from the *last* one backwards: the first "to" there belongs to "safe
#: to", and only the last one introduces a place.
_IN_PLACE = re.compile(r"\b(?:in|for|at|near|around|to|over)\s+(?P<rest>.+?)$", re.IGNORECASE)
_PREPOSITION = re.compile(r"\b(?:in|for|at|near|around|to|over)\s+", re.IGNORECASE)
_PLACE_MEIN = re.compile(r"(?P<rest>[\wऀ-ॿ\s]+?)\s+(?:mein|me|men|में|मे)(?:\s+|$)", re.IGNORECASE)

_MAX_PLACE_TOKENS = 4


_VERB_TOKENS: frozenset[str] = frozenset(
    {
        "spray", "irrigate", "harvest", "sow", "plant", "drive", "travel", "go",
        "walk", "visit", "head", "leave", "work", "do", "expect", "reach", "plan",
        "water", "cover", "stay", "cut", "sowing", "spraying", "harvesting", "see",
    }
)


def _take_place_tokens(rest: str) -> str | None:
    """Consume tokens until a stop word, keeping at most four."""
    out: list[str] = []
    tokens = _WORD.findall(rest)
    if not tokens or tokens[0].lower() in _VERB_TOKENS:
        return None
    for raw in tokens:
        if raw.lower() in _STOP_TOKENS:
            break
        out.append(raw)
        if len(out) >= _MAX_PLACE_TOKENS:
            break
    return " ".join(out) if out else None


#: Self-patterns matched on word boundaries, not as substrings.
#:
#: This is compiled rather than checked with `in` because of a real bug: "here"
#: is a self-pattern, and "is t(here) a warning in Lalitpur" contains it. Every
#: question containing "there", "where" or "therefore" was silently answered
#: about the user's own location instead of the district they named — the worst
#: kind of failure, because it returns a confident answer about the wrong place.
_SELF_RE = re.compile(
    r"(?<![\w])(?:" + "|".join(re.escape(fold(p)) for p in SELF_PATTERNS) + r")(?![\w])",
    re.IGNORECASE,
)


def extract_location(text: str) -> tuple[str | None, str | None]:
    """Return `(location, hint)`. Exactly one of them is ever set."""
    if _SELF_RE.search(fold(text)):
        return None, "self"

    # Hinglish and Hindi put the place before the postposition: "Udaipur mein".
    m = _PLACE_MEIN.search(text)
    if m:
        tokens = _WORD.findall(m.group("rest"))
        kept: list[str] = []
        for raw in reversed(tokens[-_MAX_PLACE_TOKENS:]):
            if raw.lower() in _STOP_TOKENS:
                break
            kept.insert(0, raw)
        if kept:
            return " ".join(kept), None

    # English puts it after a preposition: "in Udaipur", "for Udaipur",
    # "to Jaipur". Tried last-first, because the earlier preposition in
    # "is it safe *to* drive *to* Jaipur" belongs to the verb, not the place.
    for m in reversed(list(_PREPOSITION.finditer(text))):
        place = _take_place_tokens(text[m.end():])
        if place:
            return place, None

    return None, None


# --------------------------------------------------------------------------
# Entry point
# --------------------------------------------------------------------------
def parse(text: str, *, default_language: str | None = None) -> dict[str, Any]:
    """Turn a question into the structured parse the pipeline runs on.

    `default_language` is the user's stored preference. It is only used when the
    text itself is empty or gives nothing away — the text always wins, because a
    Hindi speaker who typed in English asked in English.
    """
    text = (text or "").strip()
    language = detect_language(text)
    if not text and default_language in ("en", "hi", "hinglish"):
        language = default_language  # type: ignore[assignment]

    intent = detect_intent(text)
    location, hint = extract_location(text)

    return {
        "intent": intent,
        "language": language,
        "location": location,
        "location_hint": hint,
        "window": parse_window(text),
        "variables": INTENT_VARIABLES[intent],
        "engine_version": ENGINE_VERSION,
    }
