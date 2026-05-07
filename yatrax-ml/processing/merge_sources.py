"""
Merge all processed data sources into a unified grid.
Each grid cell gets values from every data source.

Input:  data/processed/*_grid.parquet
Output: data/processed/unified_grid.parquet
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd

from config.settings import PROCESSED_DIR
from processing.geo_grid import generate_india_grid, spatial_interpolate


# Column mapping: processed file → columns to merge
MERGE_CONFIG = {
    "crime_grid.parquet": {
        "columns": [
            "crime_rate_per_100k",
            "crime_type_distribution_risk",
            "gender_safety_index",
            "tourist_targeted_crime_index",
        ],
        "fill_defaults": {
            "crime_rate_per_100k": 50.0,
            "crime_type_distribution_risk": 0.10,
            "gender_safety_index": 0.80,
            "tourist_targeted_crime_index": 0.05,
        },
    },
    "weather_grid.parquet": {
        "columns": [
            "temperature_c",
            "humidity_pct",
            "wind_speed_kmph",
            "rainfall_mmph",
            "visibility_km",
            "uv_index",
            "weather_severity",
        ],
        "fill_defaults": {
            "temperature_c": 28.0,
            "humidity_pct": 60.0,
            "wind_speed_kmph": 12.0,
            "rainfall_mmph": 2.0,
            "visibility_km": 8.0,
            "uv_index": 5.0,
            "weather_severity": 20.0,
        },
    },
    "aqi_grid.parquet": {
        "columns": ["aqi", "pm25", "pm10"],
        "fill_defaults": {
            "aqi": 75.0,
            "pm25": 40.0,
            "pm10": 70.0,
        },
    },
    "water_quality_grid.parquet": {
        "columns": ["water_safety_score", "water_contamination_risk"],
        "fill_defaults": {
            "water_safety_score": 70.0,
            "water_contamination_risk": 0.15,
        },
    },
    "accident_grid.parquet": {
        "columns": [
            "road_accident_hotspot_risk",
            "accident_severity_index",
            "fatality_rate",
        ],
        "fill_defaults": {
            "road_accident_hotspot_risk": 0.20,
            "accident_severity_index": 0.40,
            "fatality_rate": 0.10,
        },
    },
    "disaster_grid.parquet": {
        "columns": [
            "flood_risk", "earthquake_risk",
            "cyclone_risk", "landslide_risk",
            "total_events",
        ],
        "fill_defaults": {
            "flood_risk": 0.10,
            "earthquake_risk": 0.20,
            "cyclone_risk": 0.05,
            "landslide_risk": 0.08,
            "total_events": 0,
        },
    },
    "health_grid.parquet": {
        "columns": [
            "hospital_level_score",
            "emergency_availability_score",
            "ambulance_response_score",
            "nearest_hospital_proxy_km",
        ],
        "fill_defaults": {
            "hospital_level_score": 30.0,
            "emergency_availability_score": 20.0,
            "ambulance_response_score": 15.0,
            "nearest_hospital_proxy_km": 35.0,
        },
    },
    "fire_grid.parquet": {
        "columns": ["fire_risk_index", "fire_intensity_score"],
        "fill_defaults": {
            "fire_risk_index": 0.05,
            "fire_intensity_score": 0.03,
        },
    },
    "population_grid.parquet": {
        "columns": ["population_density_per_km2"],
        "fill_defaults": {
            "population_density_per_km2": 400.0,
        },
    },
    "noise_grid.parquet": {
        "columns": ["noise_level_proxy"],
        "fill_defaults": {
            "noise_level_proxy": 0.20,
        },
    },
}


def _load_processed(filename: str) -> pd.DataFrame | None:
    """Load a processed parquet file if it exists."""
    path = PROCESSED_DIR / filename
    if not path.exists():
        print(f"  Not found: {filename}")
        return None

    df = pd.read_parquet(path)
    print(f"  Loaded {filename}: {len(df)} rows, columns: {list(df.columns)}")
    return df


def _merge_source(
    grid: pd.DataFrame,
    source_df: pd.DataFrame,
    source_name: str,
    columns: list[str],
    defaults: dict[str, float],
    interpolate_radius_km: float = 30.0,
) -> pd.DataFrame:
    """Merge a single source into the grid."""
    original_grid_cols = set(grid.columns)

    avail_col = f"{source_name}_data_available"
    grid[avail_col] = 0

    if len(source_df) < 10:
        raise ValueError(f"Source {source_name} has too few rows ({len(source_df)}). Failing merge.")

    # Ensure grid columns exist in source
    available_cols = [c for c in columns if c in source_df.columns]
    if not available_cols:
        raise ValueError(f"Source {source_name} is missing all key columns: {columns}. Failing merge.")


    # Check if source has grid coordinates already
    if "grid_lat" in source_df.columns and "grid_lon" in source_df.columns:
        # Direct merge on grid coordinates
        source_agg = source_df.groupby(["grid_lat", "grid_lon"])[available_cols].mean().reset_index()
        grid = grid.merge(
            source_agg,
            on=["grid_lat", "grid_lon"],
            how="left",
        )
        if available_cols:
            hit_mask = grid[available_cols[0]].notna()
            grid.loc[hit_mask, avail_col] = 1
    elif "latitude" in source_df.columns and "longitude" in source_df.columns:
        # Spatial interpolation
        grid = spatial_interpolate(
            source_df=source_df,
            target_grid=grid,
            value_columns=available_cols,
            radius_km=interpolate_radius_km,
        )
        if available_cols:
            hit_mask = grid[available_cols[0]].notna()
            grid.loc[hit_mask, avail_col] = 1
    else:
        # No spatial info — apply defaults
        for col in available_cols:
            grid[col] = defaults.get(col, np.nan)

    # Fill remaining NaN with defaults
    coverage_report: list[str] = []
    overall_coverage = 0.0
    for col, default in defaults.items():
        if col in grid.columns:
            non_default_mask = grid[col].notna()
            coverage_pct = float(non_default_mask.mean() * 100)
            overall_coverage = max(overall_coverage, coverage_pct)
            grid[col] = grid[col].fillna(default)
            default_pct = float((grid[col] == default).mean() * 100)
        else:
            grid[col] = default
            coverage_pct = 0.0
            default_pct = 100.0
        is_new_col = col not in original_grid_cols
        if is_new_col:
            coverage_report.append(
                f"{col}: source_coverage={coverage_pct:.2f}% default_pct={default_pct:.2f}%"
            )

    if coverage_report:
        print("  Coverage: " + "; ".join(coverage_report))

        if overall_coverage < 5.0:
            raise ValueError(f"Source {source_name} coverage is too sparse ({overall_coverage:.2f}%). Failing merge.")
        
        for col in available_cols:
            if col in grid.columns:
                unique_vals = grid[col].nunique()
                if unique_vals < 5 and col not in ["total_events"]:
                    raise ValueError(f"Feature {col} from {source_name} has too few unique values ({unique_vals}).")

                default_val = defaults.get(col)
                if default_val is not None:
                    default_pct = float((grid[col] == default_val).mean() * 100)
                    if default_pct > 95.0:
                        raise ValueError(f"Feature {col} from {source_name} is mostly default-filled ({default_pct:.2f}%).")

    return grid


def merge_all_sources() -> pd.DataFrame:
    """
    Main entry: generate India grid and merge all processed sources.
    """
    print("Generating India grid...")
    grid = generate_india_grid()
    print(f"Grid: {len(grid)} cells")

    for filename, config in MERGE_CONFIG.items():
        print(f"\nMerging: {filename}")
        source_name = filename.split('_')[0]
        source = _load_processed(filename)

        if source is not None:
            grid = _merge_source(
                grid=grid,
                source_df=source,
                source_name=source_name,
                columns=config["columns"],
                defaults=config["fill_defaults"],
            )
        else:
            # Apply all defaults
            grid[f"{source_name}_data_available"] = 0
            for col, default in config["fill_defaults"].items():
                grid[col] = default

    print(f"\nUnified grid: {len(grid)} cells × {len(grid.columns)} columns")
    print(f"Columns: {sorted(grid.columns.tolist())}")

    # Check NaN coverage
    nan_pct = grid.isna().mean()
    high_nan = nan_pct[nan_pct > 0.5]
    if not high_nan.empty:
        print(f"\nWarning: columns with >50% NaN: {high_nan.to_dict()}")

    output_path = PROCESSED_DIR / "unified_grid.parquet"
    grid.to_parquet(output_path, index=False)
    print(f"\nSaved: {output_path}")

    return grid


if __name__ == "__main__":
    merge_all_sources()
