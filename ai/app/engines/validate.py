"""
Grounding checks — the anti-hallucination rule, as code.

§10 of the PRD: *every number in the output must appear in the input*. Prompts
can ask a model to obey that. Only a validator can make it true, which is why
this module exists and why the compose route refuses any prose that fails it.

Three checks, in order of how badly each failure would hurt:

  1. Numbers   — a fabricated rainfall figure is the failure this whole product
                 is built to prevent.
  2. Sources   — the model may not attribute anything to a source we did not
                 actually call.
  3. Warnings  — the model may not reference an alert that was not supplied,
                 and it may not invent one that does not exist.

The tolerance deserves a note. `118 mm` for a stored `117.6` is honest rounding
and must pass; `140 mm` for the same value is not. One percent, floored at half
a unit, separates the two across the whole range this product deals in.
"""
from __future__ import annotations

import re
from typing import Any, Iterable

ENGINE_VERSION = "4.0.0"

#: Text that looks numeric but carries no quantity. Stripped before extraction,
#: longest-lived first: an ISO timestamp contains clock times inside it.
_NOISE = (
    re.compile(r"\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2})?(?:[+-]\d{2}:?\d{2}|Z)?"),
    re.compile(r"\d{4}-\d{2}-\d{2}"),
    re.compile(r"\d{1,2}:\d{2}"),
)

_NUMBER = re.compile(r"\d+(?:\.\d+)?")

#: Devanagari digits, so a Hindi answer's figures are checked like any other.
_DEV_DIGITS = str.maketrans("०१२३४५६७८९", "0123456789")


def _tolerance(value: float) -> float:
    """How far a rendered figure may sit from its source value."""
    return max(0.5, abs(value) * 0.01)


def _strip_noise(text: str) -> str:
    for pattern in _NOISE:
        text = pattern.sub(" ", text)
    return text


def numbers_in_text(text: str) -> list[float]:
    """Every quantity in `text`, with clock times and dates removed first."""
    if not text:
        return []
    cleaned = _strip_noise(str(text).translate(_DEV_DIGITS))
    out: list[float] = []
    for raw in _NUMBER.findall(cleaned):
        try:
            out.append(float(raw))
        except ValueError:  # pragma: no cover - regex guarantees this parses
            continue
    return out


def ungrounded_numbers(text: str, allowed: Iterable[float]) -> list[float]:
    """Quantities in `text` that no value in `allowed` accounts for."""
    permitted = [float(a) for a in allowed]
    bad: list[float] = []
    for value in numbers_in_text(text):
        if not any(abs(value - a) <= _tolerance(value) for a in permitted):
            bad.append(value)
    return bad


def collect_numbers(context: Any) -> set[float]:
    """Every number the answer is allowed to use, gathered from the context.

    Walks the whole structure rather than naming fields, because the alternative
    is a list that silently goes stale the first time someone adds a field to
    the context and forgets to add it here — and the failure mode of *that* is a
    correct answer being rejected, which is worse than it sounds: it would push
    us toward loosening the check.

    Strings are walked too. Official CAP text routinely quotes IMD's own bands
    ("115.6-204.4 mm"), and an answer is entitled to repeat what the warning
    says verbatim.
    """
    found: set[float] = set()

    def walk(node: Any) -> None:
        if isinstance(node, bool):
            return  # bool is an int in Python; it is not a quantity
        if isinstance(node, (int, float)):
            value = float(node)
            found.add(value)
            # A probability is stored as a fraction and shown as a percentage.
            if 0.0 < value <= 1.0:
                found.add(round(value * 100, 6))
            return
        if isinstance(node, str):
            found.update(numbers_in_text(node))
            return
        if isinstance(node, dict):
            for v in node.values():
                walk(v)
            return
        if isinstance(node, (list, tuple, set)):
            for v in node:
                walk(v)

    walk(context)
    return found


#: Fields of a composed answer that carry prose the user will read.
_PROSE_FIELDS = (
    "summary", "gloss", "speech", "warningMessage", "riskExplanation",
    "uncertaintyExplanation",
)
_PROSE_LIST_FIELDS = ("recommendedActions", "actionsGloss")


def validate_answer(
    answer: dict[str, Any], context: dict[str, Any]
) -> tuple[bool, list[str]]:
    """Check a composed or rephrased answer against what it was given.

    `context` carries `numbers` (a set), `sources` (names we actually called)
    and `warnings` (identifiers we actually supplied). Returns `(ok, reasons)`;
    on failure the caller drops the prose and renders the structured cards,
    exactly as §10 requires.
    """
    allowed_numbers = context.get("numbers") or set()
    allowed_sources = {str(s).lower() for s in (context.get("sources") or [])}
    allowed_warnings = {str(w) for w in (context.get("warnings") or [])}

    reasons: list[str] = []

    for field in _PROSE_FIELDS:
        value = answer.get(field)
        if not isinstance(value, str):
            continue
        for bad in ungrounded_numbers(value, allowed_numbers):
            reasons.append(
                f"{field}: {bad:g} does not appear in the fetched data"
            )

    for field in _PROSE_LIST_FIELDS:
        for i, item in enumerate(answer.get(field) or []):
            if not isinstance(item, str):
                continue
            for bad in ungrounded_numbers(item, allowed_numbers):
                reasons.append(
                    f"{field}[{i}]: {bad:g} does not appear in the fetched data"
                )

    for name in answer.get("sources") or []:
        if str(name).lower() not in allowed_sources:
            reasons.append(f"source '{name}' was not one of the sources consulted")

    ref = answer.get("warningRef")
    if ref and str(ref) not in allowed_warnings:
        reasons.append(f"warning '{ref}' was not among the active warnings supplied")

    return (not reasons), reasons
