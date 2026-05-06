"""
Inference orchestrator — the core of the ML service.

Calling order (§5.5):
  1. Grid cell lookup → spatial features
  2. Safety Scorer   → base score + factors
  3. Anomaly Detector → is this combination unusual?
  4. Incident Classifier → if anomaly, what type?
  5. Trajectory Forecaster → 1h/3h/6h predictions
  6. Spatial Risk Propagation → reduce score if nearby incidents
  7. Alert Timing Engine → recommended alert action

All models are stateless (read-only after load).
"""

from __future__ import annotations

import logging
import math
from typing import Any, Optional

import numpy as np

from app.model_registry import ModelRegistry
from app.grid_lookup import get_grid_features
from app.schemas import (
    PredictSafetyRequest,
    PredictSafetyResponse,
    FactorItem,
    ForecastPoint,
    AnomalyResult,
    SpatialRiskRequest,
    SpatialRiskResponse,
)

logger = logging.getLogger(__name__)

# ─── STATUS THRESHOLDS ────────────────────────────────────────────────────────

def score_to_status(score: float) -> str:
    if score >= 70:
        return "safe"
    if score >= 45:
        return "caution"
    return "danger"


def clamp(v: float, lo: float = 0.0, hi: float = 100.0) -> float:
    return max(lo, min(hi, v))


# ─── FEATURE VECTOR BUILDER ───────────────────────────────────────────────────

def _build_safety_vector(
    grid_feats: dict[str, float],
    override: dict[str, Any],
    feature_names: list[str],
) -> np.ndarray:
    """
    Merge grid features with live overrides sent by the gateway, then
    align to the exact feature_names list the model was trained on.
    """
    merged = {**grid_feats}

    # Apply live signal overrides from the gateway
    mapping = {
        "hour": "hour",
        "day_of_week": "day_of_week",
        "month": "month",
        "weather_severity": "weather_severity",
        "aqi": "aqi",
    }
    for key, col in mapping.items():
        if key in override and override[key] is not None:
            try:
                merged[col] = float(override[key])
            except (TypeError, ValueError):
                pass

    # Build aligned vector
    row = [float(merged.get(f, 0.0)) for f in feature_names]
    return np.array([row], dtype=np.float32)


# ─── FACTORS FROM FEATURE IMPORTANCE ─────────────────────────────────────────

_FACTOR_LABELS: dict[str, str] = {
    "crime_rate_per_100k":         "Crime Rate",
    "flood_risk":                  "Flood Risk",
    "earthquake_risk":             "Earthquake Risk",
    "cyclone_risk":                "Cyclone Risk",
    "landslide_risk":              "Landslide Risk",
    "fire_risk_index":             "Fire Risk",
    "aqi":                         "Air Quality",
    "weather_severity":            "Weather",
    "road_accident_hotspot_risk":  "Road Safety",
    "accident_severity_index":     "Accident Severity",
    "hospital_level_score":        "Hospital Quality",
    "nearest_hospital_proxy_km":   "Hospital Distance",
    "emergency_availability_score":"Emergency Services",
    "hour":                        "Time of Day",
    "population_density_per_km2":  "Population Density",
}


def _build_factors(
    grid_feats: dict[str, float],
    score: float,
) -> list[FactorItem]:
    """Return top 8 factors with human-readable labels and scored impact."""
    top_keys = list(_FACTOR_LABELS.keys())[:8]
    items: list[FactorItem] = []
    for key in top_keys:
        if key not in grid_feats:
            continue
        val = grid_feats[key]
        label = _FACTOR_LABELS[key]
        # Normalise to 0-100 impact score (higher val = more risk for most features)
        if key == "hospital_level_score":
            impact = clamp(val)
        elif key == "emergency_availability_score":
            impact = clamp(val)
        elif key == "nearest_hospital_proxy_km":
            impact = clamp(100 - (val / 50) * 100)
        elif key == "hour":
            h = int(val)
            if 8 <= h < 18:
                impact = 90
            elif 18 <= h < 22:
                impact = 60
            else:
                impact = 25
        else:
            # Risk features: higher raw value = lower safety impact score
            impact = clamp(100 - val * 100) if val <= 1.0 else clamp(100 - val / 10)

        items.append(FactorItem(
            label=label,
            score=round(impact, 1),
            detail=f"{label}: {round(val, 2)}",
        ))
    return items


# ─── ANOMALY INFERENCE ────────────────────────────────────────────────────────

def _run_anomaly(
    registry: ModelRegistry,
    grid_feats: dict[str, float],
) -> AnomalyResult:
    if not registry.loaded.get("anomaly_detector"):
        return AnomalyResult(detected=False)

    feat_names: list[str] = registry.anomaly_feature_names
    row = np.array([[float(grid_feats.get(f, 0.0)) for f in feat_names]], dtype=np.float32)

    try:
        raw_score: float = float(registry.anomaly_detector.score_samples(row)[0])
        detected = raw_score < -0.20

        if not detected:
            return AnomalyResult(detected=False, score=round(raw_score, 4))

        severity = "High" if raw_score < -0.30 else "Medium"

        # Perturbation-based attribution
        medians = registry.anomaly_feature_medians
        contributions: list[tuple[str, float]] = []
        for i, feat in enumerate(feat_names):
            perturbed = row.copy()
            perturbed[0, i] = float(medians.get(feat, 0.0))
            perturbed_score = float(registry.anomaly_detector.score_samples(perturbed)[0])
            delta = abs(perturbed_score - raw_score)
            contributions.append((feat, delta))

        contributions.sort(key=lambda x: x[1], reverse=True)
        top = contributions[:3]
        top_names = [c[0] for c in top]

        explanations = []
        for feat, _ in top:
            actual = grid_feats.get(feat, 0.0)
            median = medians.get(feat, 0.0)
            if median > 0:
                direction = "unusually high" if actual > median * 1.5 else "unusually low"
            else:
                direction = "unusual"
            explanations.append(
                f"{direction} {feat} ({round(actual, 1)} vs median {round(median, 1)})"
            )

        return AnomalyResult(
            detected=True,
            severity=severity,
            score=round(raw_score, 4),
            contributing_features=top_names,
            explanation="Anomaly: " + "; ".join(explanations),
        )
    except Exception as exc:
        logger.warning("anomaly inference failed: %s", exc)
        return AnomalyResult(detected=False)


# ─── INCIDENT CLASSIFIER ──────────────────────────────────────────────────────

INCIDENT_CLASSES = [
    "flood", "landslide", "earthquake", "cyclone_storm", "fire",
    "road_accident", "crime_robbery", "crime_assault", "wildlife",
    "medical_emergency", "stranded", "unknown",
]


def _run_incident_classifier(
    registry: ModelRegistry,
    grid_feats: dict[str, float],
    override: dict[str, Any],
) -> Optional[str]:
    if not registry.loaded.get("incident_classifier"):
        return None

    try:
        feat_names = registry.incident_classifier_features
        # incident classifier uses same features + anomaly_score, is_sudden_event
        merged = {**grid_feats, "anomaly_score": 0.0, "is_sudden_event": 0.0}
        for key in ("hour", "day_of_week", "month"):
            if key in override and override[key] is not None:
                try:
                    merged[key] = float(override[key])
                except (TypeError, ValueError):
                    pass

        row = np.array([[float(merged.get(f, 0.0)) for f in feat_names]], dtype=np.float32)
        probs = registry.incident_classifier.predict(row)

        if hasattr(probs, "shape") and probs.ndim == 2:
            best_idx = int(np.argmax(probs[0]))
        else:
            best_idx = int(probs[0])

        # Decode via label encoder if available
        if registry.incident_label_encoder is not None:
            try:
                return str(registry.incident_label_encoder.inverse_transform([best_idx])[0])
            except Exception:
                pass
        if 0 <= best_idx < len(INCIDENT_CLASSES):
            return INCIDENT_CLASSES[best_idx]
        return "unknown"
    except Exception as exc:
        logger.warning("incident classifier failed: %s", exc)
        return None


# ─── TRAJECTORY FORECASTER ────────────────────────────────────────────────────

def _run_trajectory(
    registry: ModelRegistry,
    current_score: float,
    override: dict[str, Any],
    horizons: list[int],
) -> list[ForecastPoint]:
    if not registry.loaded.get("trajectory_model"):
        # Simple linear extrapolation fallback
        return [
            ForecastPoint(
                horizon_hours=h,
                safety_score=round(clamp(current_score), 1),
                danger_score=round(clamp((100 - current_score) / 100, 0.0, 1.0), 4),
                status=score_to_status(current_score),
                rationale="ML trajectory unavailable — using current score",
            )
            for h in horizons
        ]

    try:
        feat_cols: list[str] = registry.trajectory_feature_columns
        points: list[ForecastPoint] = []

        for h in horizons:
            # Build feature vector for this horizon
            feats = {
                "current_score": current_score,
                "score_mean_6h": current_score,
                "score_std_6h": 5.0,
                "score_slope_6h": 0.0,
                "weather_mean_6h": float(override.get("weather_severity") or 20),
                "weather_slope_6h": 0.0,
                "rain_max_6h": 0.0,
                "rain_mean_6h": 0.0,
                "current_hour": float(override.get("hour") or 12),
                "is_night": 1.0 if int(override.get("hour") or 12) >= 21 or int(override.get("hour") or 12) < 6 else 0.0,
                "forecast_horizon_h": float(h),
            }
            row = np.array([[float(feats.get(f, 0.0)) for f in feat_cols]], dtype=np.float32)
            pred_score: float = float(registry.trajectory_model.predict(row)[0])
            pred_score = clamp(pred_score)

            points.append(ForecastPoint(
                horizon_hours=h,
                safety_score=round(pred_score, 1),
                danger_score=round((100 - pred_score) / 100, 4),
                status=score_to_status(pred_score),
                rationale=f"ML trajectory forecast at +{h}h",
            ))
        return points
    except Exception as exc:
        logger.warning("trajectory model failed: %s", exc)
        return [
            ForecastPoint(
                horizon_hours=h,
                safety_score=round(clamp(current_score), 1),
                danger_score=round(clamp((100 - current_score) / 100, 0.0, 1.0), 4),
                status=score_to_status(current_score),
                rationale="Trajectory fallback",
            )
            for h in horizons
        ]


# ─── SPATIAL RISK PROPAGATION ─────────────────────────────────────────────────

_DEFAULT_PROFILES: dict[str, dict] = {
    "flood":           {"spread_km": 15, "decay_hours": 24},
    "landslide":       {"spread_km": 5,  "decay_hours": 12},
    "earthquake":      {"spread_km": 50, "decay_hours": 72},
    "cyclone_storm":   {"spread_km": 100,"decay_hours": 48},
    "fire":            {"spread_km": 10, "decay_hours": 6},
    "road_accident":   {"spread_km": 1,  "decay_hours": 2},
    "crime_robbery":   {"spread_km": 0.5,"decay_hours": 1},
    "crime_assault":   {"spread_km": 0.5,"decay_hours": 1},
    "wildlife":        {"spread_km": 3,  "decay_hours": 4},
    "medical_emergency":{"spread_km":0.1,"decay_hours": 0.5},
    "stranded":        {"spread_km": 2,  "decay_hours": 6},
    "unknown":         {"spread_km": 5,  "decay_hours": 8},
}

def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def run_spatial_risk(req: SpatialRiskRequest, registry: ModelRegistry) -> SpatialRiskResponse:
    profiles = registry.propagation_profiles or _DEFAULT_PROFILES

    contributions = []
    risks = []

    for inc in req.incidents:
        profile = profiles.get(inc.type, _DEFAULT_PROFILES.get("unknown", {"spread_km": 5, "decay_hours": 8}))
        if isinstance(profile, dict):
            spread_km = float(profile.get("spread_km", 5))
            decay_hours = float(profile.get("decay_hours", 8))
        else:
            spread_km, decay_hours = 5.0, 8.0

        dist_km = _haversine_km(req.target_lat, req.target_lon, inc.lat, inc.lon)

        # Quick exit
        if dist_km > 3 * spread_km:
            continue

        intensity = inc.severity
        r = intensity * math.exp(-dist_km / spread_km) * math.exp(-inc.hours_since / decay_hours)
        risks.append(r)
        contributions.append({
            "type": inc.type,
            "dist_km": round(dist_km, 2),
            "risk": round(r, 4),
        })

    # Complement product prevents super-additive risk
    total = 1.0 - math.prod(1 - r for r in risks) if risks else 0.0

    return SpatialRiskResponse(
        total_risk=round(min(total, 1.0), 4),
        incident_contributions=contributions,
        model_version="5.0.0-parametric",
    )


# ─── ALERT TIMING ENGINE ──────────────────────────────────────────────────────

def _decide_alert_action(
    score: float,
    score_change_rate: float,
    anomaly: AnomalyResult,
    forecast: list[ForecastPoint],
    override: dict[str, Any],
) -> str:
    """Hard overrides first (§5.5.6), then heuristic."""
    # Hard overrides
    if score < 15:
        return "emergency"
    if score < 25 and score_change_rate < -10:
        return "emergency"

    battery = override.get("battery_pct")
    network = str(override.get("network_type") or "4g").lower()
    if battery is not None and float(battery) < 5 and network in ("none", "2g"):
        return "urgent_alert"

    # Anomaly-driven
    if anomaly.detected:
        if anomaly.severity == "High":
            return "urgent_alert"
        return "standard_alert"

    # Score-based heuristic
    if score < 40:
        return "standard_alert"
    if score < 60:
        return "soft_nudge"
    return "wait"


# ─── MAIN ORCHESTRATOR ────────────────────────────────────────────────────────

def evaluate(req: PredictSafetyRequest, registry: ModelRegistry) -> PredictSafetyResponse:
    """
    Full inference chain. Falls back gracefully at each step.
    """
    override: dict[str, Any] = {k: v for k, v in req.features.items() if v is not None}

    lat = float(override.get("latitude") or 26.2)
    lon = float(override.get("longitude") or 92.9)

    # ── Step 1: Grid cell lookup ──────────────────────────────────────────────
    grid_feats = get_grid_features(lat, lon)

    # Apply live weather / AQI overrides from gateway
    for live_key in ("weather_severity", "aqi"):
        if live_key in override and override[live_key] is not None:
            grid_feats[live_key] = float(override[live_key])

    # ── Step 2: Safety Scorer ─────────────────────────────────────────────────
    source = "ml"
    safety_score = 65.0  # conservative fallback

    if registry.loaded.get("safety_scorer"):
        try:
            vec = _build_safety_vector(grid_feats, override, registry.safety_scorer_features)
            raw = float(registry.safety_scorer.predict(vec)[0])
            safety_score = clamp(raw)
        except Exception as exc:
            logger.warning("safety scorer failed: %s", exc)
            source = "fallback"
    else:
        source = "fallback"

    factors = _build_factors(grid_feats, safety_score)

    # ── Step 3: Anomaly Detection ─────────────────────────────────────────────
    anomaly = _run_anomaly(registry, grid_feats)

    # Apply anomaly penalty to score
    if anomaly.detected:
        penalty = 15.0 if anomaly.severity == "High" else 8.0
        safety_score = max(0.0, safety_score - penalty)

    # ── Step 4: Incident Classifier (only when anomaly detected) ─────────────
    incident_class: Optional[str] = None
    if anomaly.detected:
        incident_class = _run_incident_classifier(registry, grid_feats, override)

    # ── Step 5: Trajectory Forecaster ────────────────────────────────────────
    horizons = req.forecast_hours or [1, 3, 6]
    # Rate of change: approximate as -1.5 per hour as safe default
    score_change_rate = -1.5 if anomaly.detected else 0.0
    forecast = _run_trajectory(registry, safety_score, override, horizons)

    # ── Step 6: Spatial Risk (if nearby active alerts in payload) ─────────────
    # Gateway sends active_alerts_nearby as part of override dict
    nearby = override.get("active_alerts_nearby")
    if nearby and isinstance(nearby, int) and nearby > 0:
        spatial_penalty = min(nearby * 3.0, 20.0)
        safety_score = max(0.0, safety_score - spatial_penalty)

    # ── Step 7: Alert Timing Engine ───────────────────────────────────────────
    recommended_action = _decide_alert_action(
        safety_score, score_change_rate, anomaly, forecast, override
    )

    # ── Final response ────────────────────────────────────────────────────────
    danger_score = round(clamp(100 - safety_score, 0, 100) / 100, 4)
    safety_score_final = round(safety_score, 2)
    status = score_to_status(safety_score_final)

    recommendation = _make_recommendation(status, anomaly, incident_class, override)

    from app.config import get_settings
    cfg = get_settings()

    return PredictSafetyResponse(
        safety_score=safety_score_final,
        danger_score=danger_score,
        status=status,
        recommendation=recommendation,
        capped_by=None,
        environment=f"grid_cell:{round(lat,1)},{round(lon,1)}",
        factors=factors,
        forecast=forecast,
        anomaly=anomaly,
        incident_class=incident_class,
        recommended_alert_action=recommended_action,
        model_version=cfg.model_version,
        source=source,
    )


def _make_recommendation(
    status: str,
    anomaly: AnomalyResult,
    incident_class: Optional[str],
    override: dict[str, Any],
) -> str:
    if status == "danger":
        if incident_class in ("flood", "cyclone_storm"):
            return "Severe weather event detected — move to high ground or shelter immediately."
        if incident_class in ("crime_robbery", "crime_assault"):
            return "Elevated crime risk — move to a populated, well-lit area."
        if incident_class == "medical_emergency":
            return "Medical risk elevated — locate nearest hospital and keep emergency contacts ready."
        if anomaly.detected:
            return f"Unusual conditions detected ({anomaly.explanation or 'anomaly'}). Exercise extreme caution."
        return "Danger level detected. Leave this area or seek shelter immediately."
    if status == "caution":
        h = int(override.get("hour") or 12)
        if h >= 22 or h < 5:
            return "Late night — find a well-lit, populated area and stay alert."
        if incident_class == "flood":
            return "Flood risk present — avoid low-lying areas and water crossings."
        return "Stay aware of your surroundings and keep emergency contacts ready."
    return "Conditions are favourable — enjoy your visit!"
