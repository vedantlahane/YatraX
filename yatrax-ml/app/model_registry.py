"""
Model artifact loaders.
Each loader is called once at startup; results are held in module-level singletons.
The ModelRegistry is injected into route handlers via FastAPI dependency injection.
"""

from __future__ import annotations

import time
import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import joblib
import lightgbm as lgb
import numpy as np

logger = logging.getLogger(__name__)

_REPO_ROOT = Path(__file__).resolve().parent.parent
_MODELS_DIR = _REPO_ROOT / "models"


@dataclass
class ModelRegistry:
    """
    Holds all 6 loaded model artifacts.
    Fields are Optional so partial load is possible — every endpoint
    that needs a specific model checks the corresponding flag.
    """
    # Model 1: Safety Scorer (LightGBM regression)
    safety_scorer: Any = None
    safety_scorer_features: list[str] = field(default_factory=list)

    # Model 2: Incident Classifier (LightGBM multiclass)
    incident_classifier: Any = None
    incident_classifier_features: list[str] = field(default_factory=list)
    incident_label_encoder: Any = None

    # Model 3: Anomaly Detector (IsolationForest)
    anomaly_detector: Any = None
    anomaly_feature_names: list[str] = field(default_factory=list)
    anomaly_feature_medians: dict[str, float] = field(default_factory=dict)

    # Model 4: Trajectory Forecaster (GradientBoosting)
    trajectory_model: Any = None
    trajectory_feature_columns: list[str] = field(default_factory=list)

    # Model 5: Spatial Risk Propagation (parametric profiles)
    propagation_profiles: dict = field(default_factory=dict)

    # Model 6: Alert Timing Engine (heuristic — no artifact file; pure logic)
    # No artifact — implemented as pure Python in inference/alert_timing.py

    # Load status per model
    loaded: dict[str, bool] = field(default_factory=dict)
    load_errors: dict[str, str] = field(default_factory=dict)


_registry: ModelRegistry | None = None
_start_time: float = time.time()


def _try_load(registry: ModelRegistry, name: str, loader_fn):
    """Run loader_fn, catching exceptions so one bad model doesn't kill startup."""
    try:
        loader_fn(registry)
        registry.loaded[name] = True
        logger.info("✅  %s loaded", name)
    except Exception as exc:
        registry.loaded[name] = False
        registry.load_errors[name] = str(exc)
        logger.warning("⚠️  %s failed to load: %s", name, exc)


def _load_safety_scorer(registry: ModelRegistry):
    model_path = _MODELS_DIR / "safety_scorer" / "safety_scorer.lgb"
    registry.safety_scorer = lgb.Booster(model_file=str(model_path))
    # Feature list comes from the saved model's feature_name() method
    registry.safety_scorer_features = registry.safety_scorer.feature_name()


def _load_incident_classifier(registry: ModelRegistry):
    model_path = _MODELS_DIR / "incident_classifier" / "incident_classifier.lgb"
    registry.incident_classifier = lgb.Booster(model_file=str(model_path))
    registry.incident_classifier_features = registry.incident_classifier.feature_name()

    le_path = _MODELS_DIR / "incident_classifier" / "label_encoder.joblib"
    registry.incident_label_encoder = joblib.load(le_path)


def _load_anomaly_detector(registry: ModelRegistry):
    iso_path = _MODELS_DIR / "anomaly" / "isolation_forest.joblib"
    registry.anomaly_detector = joblib.load(iso_path)

    fn_path = _MODELS_DIR / "anomaly" / "feature_names.joblib"
    registry.anomaly_feature_names = list(joblib.load(fn_path))

    fm_path = _MODELS_DIR / "anomaly" / "feature_medians.joblib"
    raw_medians = joblib.load(fm_path)
    # Normalize to plain dict[str, float]
    if hasattr(raw_medians, "to_dict"):
        registry.anomaly_feature_medians = raw_medians.to_dict()
    elif isinstance(raw_medians, dict):
        registry.anomaly_feature_medians = {str(k): float(v) for k, v in raw_medians.items()}
    else:
        registry.anomaly_feature_medians = {}


def _load_trajectory_model(registry: ModelRegistry):
    model_path = _MODELS_DIR / "trajectory" / "trajectory_model.joblib"
    registry.trajectory_model = joblib.load(model_path)

    fc_path = _MODELS_DIR / "trajectory" / "feature_columns.joblib"
    registry.trajectory_feature_columns = list(joblib.load(fc_path))


def _load_spatial_risk(registry: ModelRegistry):
    prof_path = _MODELS_DIR / "spatial_risk" / "propagation_profiles.joblib"
    registry.propagation_profiles = joblib.load(prof_path)


def load_all_models() -> ModelRegistry:
    """Called once at startup. Returns registry with whatever loaded successfully."""
    global _registry, _start_time
    _start_time = time.time()

    registry = ModelRegistry()

    _try_load(registry, "safety_scorer", _load_safety_scorer)
    _try_load(registry, "incident_classifier", _load_incident_classifier)
    _try_load(registry, "anomaly_detector", _load_anomaly_detector)
    _try_load(registry, "trajectory_model", _load_trajectory_model)
    _try_load(registry, "spatial_risk", _load_spatial_risk)
    # alert_timing is pure logic — always "loaded"
    registry.loaded["alert_timing"] = True

    n_ok = sum(registry.loaded.values())
    logger.info("Model loading complete: %d/6 models ready", n_ok)

    _registry = registry
    return registry


def get_registry() -> ModelRegistry:
    """FastAPI dependency: inject the singleton registry."""
    if _registry is None:
        raise RuntimeError("Models not loaded — call load_all_models() at startup")
    return _registry


def get_uptime() -> float:
    return time.time() - _start_time
