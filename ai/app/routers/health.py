from fastapi import APIRouter

from ..config import APP_NAME, VERSION
from ..engines.risk import ENGINE_VERSION as RISK_VERSION
from ..engines.uncertainty import ENGINE_VERSION as UNCERTAINTY_VERSION

router = APIRouter(tags=["meta"])


@router.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "service": APP_NAME,
        "version": VERSION,
        "engines": {"risk": RISK_VERSION, "uncertainty": UNCERTAINTY_VERSION},
        "thresholds": "IMD published categories",
    }
