"""
FastAPI application entrypoint for the yatrax-ml inference service.
"""

from __future__ import annotations

import logging
import time

import uvicorn
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.model_registry import load_all_models, get_registry, get_uptime, ModelRegistry
from app.schemas import (
    PredictSafetyRequest,
    PredictSafetyResponse,
    SpatialRiskRequest,
    SpatialRiskResponse,
    HealthResponse,
)
from app.inference import evaluate, run_spatial_risk

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("yatrax-ml")

# ─── App ──────────────────────────────────────────────────────────────────────

cfg = get_settings()

app = FastAPI(
    title="YatraX ML Service",
    version=cfg.model_version,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


# ─── Startup: load all models ─────────────────────────────────────────────────

@app.on_event("startup")
async def startup():
    load_all_models()
    logger.info("✅ YatraX ML service ready")


# ─── Routes ───────────────────────────────────────────────────────────────────

@app.get("/health", response_model=HealthResponse)
def health(registry: ModelRegistry = Depends(get_registry)):
    return HealthResponse(
        ok=True,
        service=cfg.service_name,
        model_version=cfg.model_version,
        models_loaded=registry.loaded,
        uptime_s=round(get_uptime(), 2),
    )


@app.post("/v2/predict-safety", response_model=PredictSafetyResponse)
def predict_safety(
    req: PredictSafetyRequest,
    registry: ModelRegistry = Depends(get_registry),
):
    """
    Main safety evaluation endpoint.
    Called by the gateway's mlClient with a 2.5s timeout.
    Gateway falls back to Phase 1 rule-based calculator if this returns 5xx or times out.
    """
    return evaluate(req, registry)


@app.post("/safety/evaluate", response_model=PredictSafetyResponse)
def safety_evaluate(
    req: PredictSafetyRequest,
    registry: ModelRegistry = Depends(get_registry),
):
    """Alias — kept for backward compat with the old gateway."""
    return evaluate(req, registry)


@app.post("/safety/spatial-risk", response_model=SpatialRiskResponse)
def spatial_risk(
    req: SpatialRiskRequest,
    registry: ModelRegistry = Depends(get_registry),
):
    return run_spatial_risk(req, registry)


# ─── Entrypoint ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=cfg.host,
        port=cfg.port,
        workers=cfg.workers,
        log_level=cfg.log_level,
    )
