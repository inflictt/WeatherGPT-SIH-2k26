from fastapi import APIRouter

from ..engines import nlu as engine
from ..schemas import (
    LanguageRequest,
    LanguageResponse,
    NluRequest,
    NluResponse,
)

router = APIRouter(tags=["nlu"])


@router.post("/nlu/parse", response_model=NluResponse)
def parse_question(payload: NluRequest) -> NluResponse:
    """Question -> {intent, language, location, window, variables}.

    Deterministic and instant. The window it returns is *relative* — the server
    owns the clock and the user's timezone, and a parser that guessed at either
    would be wrong twice a year and in every other state.
    """
    return NluResponse(
        **engine.parse(payload.text, default_language=payload.default_language)
    )


@router.post("/nlu/detect-language", response_model=LanguageResponse)
def detect_language(payload: LanguageRequest) -> LanguageResponse:
    """Script test first, romanised-Hindi keyword list second."""
    return LanguageResponse(language=engine.detect_language(payload.text))
