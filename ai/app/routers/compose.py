from fastapi import APIRouter

from ..engines import compose as engine
from ..engines.validate import collect_numbers
from ..llm import rephrase
from ..schemas import ComposeRequest, ComposeResponse

router = APIRouter(tags=["compose"])


@router.post("/compose/answer", response_model=ComposeResponse)
def compose_answer(payload: ComposeRequest) -> ComposeResponse:
    """Grounded context in, structured answer out.

    The deterministic composer runs first and always produces the whole answer.
    The optional LLM pass may then improve the prose, and anything it adds that
    was not in the context is rejected wholesale — see app/llm.py. That ordering
    is what makes §10's "killing the key still renders an answer" true rather
    than aspirational.
    """
    context = payload.model_dump()
    answer = engine.compose(context)

    improved = rephrase(
        answer,
        {
            "numbers": collect_numbers(context),
            "sources": [s.get("name") for s in payload.sources if s.get("name")],
            "warnings": [w.get("identifier") for w in payload.warnings if w.get("identifier")],
        },
        question=payload.question,
    )
    return ComposeResponse(**improved)
