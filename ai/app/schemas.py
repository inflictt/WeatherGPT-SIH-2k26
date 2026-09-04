"""Request and response contracts. Pydantic validates; the engines compute."""
from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field

Band = Literal["LOW", "MODERATE", "HIGH", "EXTREME"]
Colour = Literal["green", "yellow", "orange", "red"]


# --------------------------------------------------------------- risk ------
class LocationIn(BaseModel):
    name: str | None = None
    district: str | None = None
    state: str | None = None
    lat: float | None = None
    lon: float | None = None
    zone: Literal["plains", "coastal", "hills"] = "plains"
    urban_flood_prone: bool = False


class ForecastIn(BaseModel):
    rain_24h_mm: float | None = Field(None, ge=0, le=2000)
    rain_probability: float | None = Field(None, ge=0, le=1)
    wind_kmh: float | None = Field(None, ge=0, le=500)
    gust_kmh: float | None = Field(None, ge=0, le=600)
    temp_max_c: float | None = Field(None, ge=-60, le=70)
    temp_min_c: float | None = Field(None, ge=-80, le=60)
    #: Climatological normal maximum. Supply it and the IMD departure
    #: criterion applies; omit it and only the absolute thresholds are used.
    temp_normal_max_c: float | None = Field(None, ge=-60, le=70)
    visibility_km: float | None = Field(None, ge=0, le=100)
    rain_duration_hours: float | None = Field(None, ge=0, le=24)
    peak_window: dict[str, Any] | None = None


class AntecedentIn(BaseModel):
    rain_72h_mm: float | None = Field(None, ge=0, le=3000)


class WarningIn(BaseModel):
    identifier: str | None = None
    event: str | None = None
    severity: Literal["Unknown", "Minor", "Moderate", "Severe", "Extreme"] | None = None
    colour: Colour | None = None
    expires: str | None = None


class RiskRequest(BaseModel):
    location: LocationIn = LocationIn()
    forecast: ForecastIn
    antecedent: AntecedentIn = AntecedentIn()
    warnings: list[WarningIn] = []


class ComponentOut(BaseModel):
    key: str
    label: str
    band: Band
    weight: int
    note: str


class RiskResponse(BaseModel):
    overall: Band
    score: int
    computed_band: Band
    floored_by: dict[str, Any] | None
    hazard_floor: dict[str, Any] | None = None
    breakdown: list[ComponentOut]
    derived: dict[str, dict[str, str]]
    rainfall_colour: Colour
    engine_version: str
    notes: list[str]


# -------------------------------------------------------- uncertainty ------
class ModelIn(BaseModel):
    name: str
    rain_24h_mm: float | None = Field(None, ge=0, le=3000)


class UncertaintyRequest(BaseModel):
    models: list[ModelIn]
    lead_hours: int = Field(0, ge=0, le=384)
    probability: float | None = Field(None, ge=0, le=1)


class UncertaintyResponse(BaseModel):
    level: Literal["HIGH", "MEDIUM", "LOW"]
    spread: float | None
    mean_mm: float | None
    range_mm: float | None
    lead_hours: int
    models: list[dict[str, Any]]
    band_agreement: bool
    bands: list[str]
    reasons: list[str]
    engine_version: str


# ----------------------------------------------------------------- nlu ------
class NluRequest(BaseModel):
    text: str = Field("", max_length=1000)
    #: The user's stored preference. Only consulted when the text itself gives
    #: nothing away — a Hindi speaker who typed in English asked in English.
    default_language: Literal["en", "hi", "hinglish"] | None = None


class WindowOut(BaseModel):
    day_offset: int
    from_hour: int | None
    to_hour: int | None
    label: str


class NluResponse(BaseModel):
    intent: Literal[
        "rain_forecast", "warning_check", "advice", "temperature", "wind", "general"
    ]
    language: Literal["en", "hi", "hinglish"]
    persona: Literal["general", "farmer", "traveller", "official"] = "general"
    location: str | None
    location_hint: Literal["self"] | None
    window: WindowOut
    variables: list[str]
    engine_version: str


class LanguageRequest(BaseModel):
    text: str = Field("", max_length=1000)


class LanguageResponse(BaseModel):
    language: Literal["en", "hi", "hinglish"]


# ------------------------------------------------------------- compose ------
class ComposeForecastIn(BaseModel):
    rain_mm: float | None = Field(None, ge=0, le=3000)
    prob: float | None = Field(None, ge=0, le=1)
    peak: str | None = None
    wind_kmh: float | None = Field(None, ge=0, le=500)
    gust_kmh: float | None = Field(None, ge=0, le=600)
    tmax: float | None = Field(None, ge=-60, le=70)
    tmin: float | None = Field(None, ge=-80, le=60)


class ComposeRequest(BaseModel):
    """The grounded context of §10. Everything in it was fetched or computed."""

    question: str = Field("", max_length=1000)
    intent: str = "rain_forecast"
    language: str = "en"
    persona: str = "general"
    location: dict[str, Any] = {}
    window: dict[str, Any] | None = None
    forecast: ComposeForecastIn | None = None
    #: Passed straight through from the CAP store; official text is copied
    #: verbatim into the response and never rewritten.
    warnings: list[dict[str, Any]] = []
    risk: dict[str, Any] | None = None
    confidence: dict[str, Any] | None = None
    sources: list[dict[str, Any] | str] = []


class ComposeResponse(BaseModel):
    summary: str
    gloss: str | None
    speech: str
    warningMessage: str | None
    officialText: dict[str, Any] | None
    riskExplanation: str
    uncertaintyExplanation: str
    recommendedActions: list[str]
    actionsGloss: list[str]
    warningRef: str | None
    riskBand: str | None
    confidenceLevel: str | None
    flooredBy: dict[str, Any] | None
    sources: list[str]
    language: str
    persona: str
    grounded: bool
    insufficient_data: bool
    #: "deterministic" or "llm" — the interface says which produced the prose.
    composer: str
    llm_rejected: list[str] | None = None
    engine_version: str
