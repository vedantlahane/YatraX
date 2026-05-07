"""
Unified grid cell lookup.

The unified_grid.parquet (93,611 cells × 35 features) is the source of
spatial risk features.  A tourist's (lat, lon) is snapped to the nearest
0.1° cell; features from that cell are returned as a flat dict.

Conservative defaults are applied for unknown cells (methodology §5.3):
"unknown ≠ safe"
"""

from __future__ import annotations

import logging
from functools import lru_cache
from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd

from app.config import get_settings

logger = logging.getLogger(__name__)

_REPO_ROOT = Path(__file__).resolve().parent.parent

# Conservative defaults for unknown / sparse grid cells
_DEFAULTS: dict[str, float] = {
    "crime_rate_per_100k": 50.0,
    "crime_type_distribution_risk": 0.5,
    "gender_safety_index": 50.0,
    "tourist_targeted_crime_index": 0.5,
    "temperature_c": 28.0,
    "humidity_pct": 60.0,
    "wind_speed_kmph": 10.0,
    "rainfall_mmph": 0.0,
    "visibility_km": 8.0,
    "uv_index": 5.0,
    "weather_severity": 20.0,
    "aqi": 75.0,
    "pm25": 35.0,
    "pm10": 60.0,
    "water_safety_score": 50.0,
    "water_contamination_risk": 0.5,
    "road_accident_hotspot_risk": 0.5,
    "accident_severity_index": 0.5,
    "fatality_rate": 0.5,
    "flood_risk": 0.3,
    "earthquake_risk": 0.2,
    "cyclone_risk": 0.2,
    "landslide_risk": 0.2,
    "total_events": 5.0,
    "hospital_level_score": 50.0,
    "fire_risk_index": 0.3,
    "fire_intensity_score": 0.3,
    "population_density_per_km2": 200.0,
    "noise_level_proxy": 40.0,
    "nearest_hospital_proxy_km": 35.0,
    "emergency_availability_score": 50.0,
    "ambulance_response_score": 50.0,
    "elevation_m": 200.0,
    "slope_deg": 5.0,
    "terrain_difficulty_score": 0.3,
}


@lru_cache(maxsize=1)
def _load_grid() -> Optional[pd.DataFrame]:
    """Load grid once at first call (lazy, cached)."""
    cfg = get_settings()
    # Check multiple possible locations
    candidates = [
        _REPO_ROOT / cfg.data_processed_dir / "unified_grid.parquet",
        _REPO_ROOT / "data" / "processed" / "unified_grid.parquet",
        _REPO_ROOT / "unified_grid.parquet",
    ]
    for path in candidates:
        if path.exists():
            try:
                df = pd.read_parquet(path)
                logger.info("Loaded unified grid: %s cells, %s features from %s",
                            len(df), len(df.columns), path)
                return df
            except Exception as exc:
                logger.warning("Failed to load grid from %s: %s", path, exc)

    logger.warning(
        "unified_grid.parquet not found — all lookups will use conservative defaults. "
        "Run the training pipeline (python pipeline.py --skip-ingest) to generate it."
    )
    return None


def get_grid_features(lat: float, lon: float) -> dict[str, float]:
    """
    Return the 35 spatial grid features for the cell containing (lat, lon).

    Snapping: round to nearest GRID_RESOLUTION_DEG (0.1°).
    If grid is unavailable or cell not found, returns conservative defaults.
    """
    cfg = get_settings()
    res = cfg.grid_resolution_deg

    # Snap coordinates to grid centres
    cell_lat = round(round(lat / res) * res, 6)
    cell_lon = round(round(lon / res) * res, 6)

    grid = _load_grid()
    if grid is None:
        return dict(_DEFAULTS)

    # Try to find the exact cell
    col_lat = _find_column(grid, ["grid_lat", "lat_center", "lat", "latitude"])
    col_lon = _find_column(grid, ["grid_lon", "lon_center", "lon", "longitude"])

    if col_lat and col_lon:
        mask = (
            np.abs(grid[col_lat] - cell_lat) < res / 2
        ) & (
            np.abs(grid[col_lon] - cell_lon) < res / 2
        )
        hits = grid[mask]
        if len(hits) > 0:
            row = hits.iloc[0]
            result = dict(_DEFAULTS)
            for col in grid.columns:
                if col not in (col_lat, col_lon):
                    val = row[col]
                    if pd.notna(val):
                        try:
                            result[col] = float(val)
                        except (ValueError, TypeError):
                            pass
            return result

    return dict(_DEFAULTS)


def _find_column(df: pd.DataFrame, candidates: list[str]) -> Optional[str]:
    """Return the first candidate column name that exists in df."""
    lower_cols = {c.lower(): c for c in df.columns}
    for name in candidates:
        if name in df.columns:
            return name
        if name.lower() in lower_cols:
            return lower_cols[name.lower()]
    return None
