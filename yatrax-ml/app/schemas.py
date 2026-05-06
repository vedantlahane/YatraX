"""
Pydantic request/response schemas for all API endpoints.
These are the exact contract shapes the gateway uses.
"""

from __future__ import annotations

from typing import Literal, Optional
from pydantic import BaseModel, Field


# ─── SHARED ───────────────────────────────────────────────────────────────────

SafetyStatus = Literal["safe", "caution", "danger"]
AlertAction = Literal["wait", "soft_nudge", "standard_alert", "urgent_alert", "emergency"]


class ActiveAlertNearby(BaseModel):
    lat: float
    lon: float
    type: str
    hours_since: float


class LiveSignals(BaseModel):
    weather_severity: Optional[float] = None
    aqi: Optional[float] = None
    active_alerts_nearby: list[ActiveAlertNearby] = Field(default_factory=list)
    historical_incidents_30d: int = 0


class DeviceContext(BaseModel):
    network_type: str = "4g"
    battery_pct: Optional[float] = None


class TrajectoryPoint(BaseModel):
    """One hourly sample from the tourist's history window (last 6h)."""
    ts: str
    score: float
    weather_severity: Optional[float] = None
    rain_mmph: Optional[float] = None


# ─── /v2/predict-safety ───────────────────────────────────────────────────────

class PredictSafetyRequest(BaseModel):
    """
    Shape the gateway sends — see safetyMlService.ts for the exact call.
    The gateway sends features as a flat dict, plus optional forecast_hours.
    """
    features: dict[str, float | int | str | None]
    forecast_hours: list[int] = Field(default=[1, 3, 6])


class FactorItem(BaseModel):
    label: str
    score: float
    detail: str


class ForecastPoint(BaseModel):
    horizon_hours: int
    safety_score: float
    danger_score: float
    status: SafetyStatus
    rationale: str


class AnomalyResult(BaseModel):
    detected: bool
    severity: Optional[str] = None  # "High" | "Medium" | "Low"
    score: Optional[float] = None
    contributing_features: list[str] = Field(default_factory=list)
    explanation: Optional[str] = None


class PredictSafetyResponse(BaseModel):
    safety_score: float = Field(ge=0, le=100)
    danger_score: float = Field(ge=0, le=1)
    status: SafetyStatus
    recommendation: str
    capped_by: Optional[str] = None
    environment: Optional[str] = None
    factors: list[FactorItem]
    forecast: list[ForecastPoint]
    anomaly: Optional[AnomalyResult] = None
    incident_class: Optional[str] = None
    recommended_alert_action: AlertAction
    model_version: str
    source: Literal["ml", "fallback"] = "ml"


# ─── /safety/spatial-risk ─────────────────────────────────────────────────────

class NearbyIncident(BaseModel):
    lat: float
    lon: float
    type: str
    severity: float = Field(ge=0, le=1, default=0.5)
    hours_since: float = 0.0


class SpatialRiskRequest(BaseModel):
    target_lat: float
    target_lon: float
    incidents: list[NearbyIncident]


class SpatialRiskResponse(BaseModel):
    total_risk: float = Field(ge=0, le=1)
    incident_contributions: list[dict]
    model_version: str


# ─── /health ──────────────────────────────────────────────────────────────────

class HealthResponse(BaseModel):
    ok: bool
    service: str
    model_version: str
    models_loaded: dict[str, bool]
    uptime_s: float
