from fastapi import APIRouter

from ..engines import uncertainty as engine
from ..schemas import UncertaintyRequest, UncertaintyResponse

router = APIRouter(tags=["uncertainty"])


@router.post("/uncertainty/score", response_model=UncertaintyResponse)
def score_uncertainty(payload: UncertaintyRequest) -> UncertaintyResponse:
    """Per-model 24 h totals -> a confidence level with its evidence."""
    result = engine.score(payload.model_dump())
    return UncertaintyResponse(**result.__dict__)
