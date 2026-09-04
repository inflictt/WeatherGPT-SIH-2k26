from fastapi import APIRouter

from ..engines import risk as engine
from ..schemas import RiskRequest, RiskResponse

router = APIRouter(tags=["risk"])


@router.post("/risk/score", response_model=RiskResponse)
def score_risk(payload: RiskRequest) -> RiskResponse:
    """Forecast + active warnings -> a banded, explained risk assessment.

    The safety floor is applied inside the engine, not here, so it cannot be
    skipped by calling a different route.
    """
    result = engine.score(payload.model_dump())
    return RiskResponse(**result.__dict__)
