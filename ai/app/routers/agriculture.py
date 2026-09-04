"""
The agriculture routes — thin, like every other router here.

Validate, call the engine, return. No logic lives in this file, which is what
lets the engines be tested without FastAPI and audited without reading routing
code.
"""
from fastapi import APIRouter

from ..agriculture import context, crop_calendar, crop_risk, disease, irrigation
from ..schemas import (
    AgriContextRequest,
    CropCalendarResponse,
    DiseaseRiskRequest,
    DiseaseRiskResponse,
    FarmRiskRequest,
    FarmRiskResponse,
    IrrigationRequest,
    IrrigationResponse,
)

router = APIRouter(prefix="/agriculture", tags=["agriculture"])


@router.post("/irrigation", response_model=IrrigationResponse)
def irrigation_advice(payload: IrrigationRequest) -> IrrigationResponse:
    """Rainfall, temperature and whatever else is known -> irrigate or wait.

    The response always carries `inputs_missing`, because a recommendation
    that hides its gaps is the one a farmer would be wrong to trust.
    """
    return IrrigationResponse(**irrigation.assess(payload.model_dump()).__dict__)


@router.post("/risk", response_model=FarmRiskResponse)
def farm_risk(payload: FarmRiskRequest) -> FarmRiskResponse:
    """Nine categories, scored and explained.

    A category with no data comes back `band: null` and is listed in
    `unassessed` — never LOW. "We did not look" and "we looked and it is
    fine" are different answers, and only one of them is reassuring.
    """
    result = crop_risk.assess(payload.model_dump())
    return FarmRiskResponse(
        overall=result.overall,
        score=result.score,
        floored_by=result.floored_by,
        confidence=result.confidence,
        unassessed=result.unassessed,
        disclaimer=result.disclaimer,
        categories=[c.__dict__ for c in result.categories],
    )


@router.post("/disease/risk", response_model=DiseaseRiskResponse)
def disease_risk(payload: DiseaseRiskRequest) -> DiseaseRiskResponse:
    """An image model's class plus the weather -> a risk band.

    This endpoint does **not** classify anything. `prediction` comes from the
    caller, which got it from the model; with no prediction the response is
    the risk from conditions alone and says so.
    """
    return DiseaseRiskResponse(**disease.assess(payload.model_dump()).__dict__)


@router.get("/crop/{crop}", response_model=CropCalendarResponse)
def crop_calendar_for(crop: str, sown_at: str | None = None) -> CropCalendarResponse:
    """The lifecycle for a crop, and where it is today if a sowing date is given."""
    cal = crop_calendar.calendar_for(crop)
    return CropCalendarResponse(
        crop=cal.crop,
        season=cal.season,
        total_days=cal.total_days,
        notes=cal.notes,
        timeline=crop_calendar.timeline(crop),
        current=crop_calendar.stage_for(crop, sown_at),
    )


@router.get("/crops")
def list_crops() -> dict:
    """Every crop with a calendar, so the client never guesses what is supported."""
    return {
        "crops": [
            {"key": k, "season": c.season, "total_days": c.total_days, "notes": c.notes}
            for k, c in sorted(crop_calendar.CALENDARS.items())
        ]
    }


@router.post("/context")
def agriculture_context(payload: AgriContextRequest) -> dict:
    """The bundle a language model is allowed to read, and nothing else.

    Returned as a plain dict rather than a fixed model: it is a *frozen set of
    engine outputs*, and pinning a schema over it would mean updating two
    places every time an engine learns to explain itself better.
    """
    return context.build(payload.model_dump())
