"""
WeatherGPT risk engine — Phase 3.

Deliberately small: two POST endpoints and a health check. All the value is in
app/engines/, which is pure Python with no framework imports, so the logic can
be tested (and audited) without starting a server.

    uvicorn app.main:app --reload --port 8000
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import APP_NAME, CORS_ORIGINS, VERSION
from .routers import compose, health, nlu, risk, uncertainty

app = FastAPI(
    title=APP_NAME,
    version=VERSION,
    description=(
        "Converts forecasts and official warnings into banded risk and "
        "forecast confidence, using IMD's published thresholds. No trained "
        "model, no hidden weights — every response explains itself."
    ),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(risk.router)
app.include_router(uncertainty.router)
app.include_router(nlu.router)
app.include_router(compose.router)


@app.get("/", include_in_schema=False)
def root() -> dict:
    return {"service": APP_NAME, "version": VERSION, "docs": "/docs"}
