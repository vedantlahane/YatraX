"""
Ingest noise monitoring datasets.

Input:  data/raw/noise/*.csv
Output: data/processed/noise_grid.parquet

Sources:
  - rohanrao/noise-monitoring-data-in-india
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd

from config.settings import RAW_NOISE, PROCESSED_DIR

# CPCB noise standards (dB)
NOISE_LIMITS = {
    "industrial": {"day": 75, "night": 70},
    "commercial": {"day": 65, "night": 55},
    "residential": {"day": 55, "night": 45},
    "silence_zone": {"day": 50, "night": 40},
}

# Known CPCB noise monitoring city coordinates
NOISE_CITY_COORDS = {
    "delhi": (28.6139, 77.2090),
    "new delhi": (28.6139, 77.2090),
    "mumbai": (19.0760, 72.8777),
    "kolkata": (22.5726, 88.3639),
    "chennai": (13.0827, 80.2707),
    "bangalore": (12.9716, 77.5946),
    "bengaluru": (12.9716, 77.5946),
    "hyderabad": (17.3850, 78.4867),
    "ahmedabad": (23.0225, 72.5714),
    "pune": (18.5204, 73.8567),
    "lucknow": (26.8467, 80.9462),
    "jaipur": (26.9124, 75.7873),
    "chandigarh": (30.7333, 76.7794),
    "patna": (25.6093, 85.1376),
    "bhopal": (23.2599, 77.4126),
    "nagpur": (21.1458, 79.0882),
    "indore": (22.7196, 75.8577),
    "surat": (21.1702, 72.8311),
    "visakhapatnam": (17.6868, 83.2185),
    "coimbatore": (11.0168, 76.9558),
    "kochi": (9.9312, 76.2673),
    "thiruvananthapuram": (8.5241, 76.9366),
    "dehradun": (30.3165, 78.0322),
    "ranchi": (23.3441, 85.3096),
    "bhubaneswar": (20.2961, 85.8245),
    "raipur": (21.2514, 81.6296),
    "guwahati": (26.1445, 91.7362),
    "varanasi": (25.3176, 83.0064),
    "agra": (27.1767, 78.0081),
    "kanpur": (26.4499, 80.3319),
    "noida": (28.5355, 77.3910),
    "gurgaon": (28.4595, 77.0266),
    "gurugram": (28.4595, 77.0266),
    "faridabad": (28.4089, 77.3178),
    "ghaziabad": (28.6692, 77.4538),
    "mysore": (12.2958, 76.6394),
    "vijayawada": (16.5062, 80.6480),
    "rajkot": (22.3039, 70.8022),
    "madurai": (9.9252, 78.1198),
}


def _find_col(df: pd.DataFrame, candidates: list[str]) -> str | None:
    for c in candidates:
        if c in df.columns:
            return c
    lower_map = {col.lower().strip(): col for col in df.columns}
    for c in candidates:
        if c.lower().strip() in lower_map:
            return lower_map[c.lower().strip()]
    return None


def ingest_noise_file(file_path: Path) -> pd.DataFrame | None:
    """Parse a single noise monitoring CSV."""
    try:
        df = pd.read_csv(file_path, low_memory=False)
    except Exception as e:
        print(f"  Cannot read {file_path.name}: {e}")
        return None

    if df.empty:
        return None

    result = pd.DataFrame()

    # Location
    lat_col = _find_col(df, ["latitude", "lat", "Latitude"])
    lon_col = _find_col(df, ["longitude", "lon", "Longitude"])
    city_col = _find_col(df, ["city", "City", "location", "Location", "station", "Station", "station_name", "Station_Name"])
    state_col = _find_col(df, ["state", "State", "STATE", "City", "city"])

    if lat_col and lon_col:
        result["latitude"] = pd.to_numeric(df[lat_col], errors="coerce")
        result["longitude"] = pd.to_numeric(df[lon_col], errors="coerce")
    else:
        result["latitude"] = np.nan
        result["longitude"] = np.nan

    if city_col:
        result["city"] = df[city_col].astype(str).str.strip().str.lower()
        # Geocode: try matching station name parts against known cities
        for idx in result.index:
            if pd.isna(result.at[idx, "latitude"]):
                station_name = str(result.at[idx, "city"]).lower().strip()
                # Try direct matching first
                matched = False
                for city_key, (lat, lon) in NOISE_CITY_COORDS.items():
                    if city_key in station_name:
                        result.at[idx, "latitude"] = lat
                        result.at[idx, "longitude"] = lon
                        matched = True
                        break
                # If not matched, try extracting city from station name
                # Station names are often like 'RK Puram, New Delhi' or 'Anand Vihar-Delhi'
                if not matched:
                    for sep in [",", "-", "_", "("]:
                        parts = station_name.split(sep)
                        for part in parts:
                            part_clean = part.strip().rstrip(")")
                            for city_key, (lat, lon) in NOISE_CITY_COORDS.items():
                                if city_key in part_clean or part_clean in city_key:
                                    result.at[idx, "latitude"] = lat
                                    result.at[idx, "longitude"] = lon
                                    matched = True
                                    break
                            if matched:
                                break
                        if matched:
                            break

    # State-level fallbacks removed to prevent faking sparse coverage

    if state_col and state_col != city_col:
        result["state"] = df[state_col].astype(str).str.strip().str.lower()
    elif state_col:
        result["state"] = df[state_col].astype(str).str.strip().str.lower()
    
    # Date
    date_col = _find_col(df, ["date", "Date", "year", "Year"])
    if date_col:
        parsed = pd.to_datetime(df[date_col], errors="coerce")
        if parsed.notna().sum() > len(df) * 0.3:
            result["date"] = parsed
            result["year"] = parsed.dt.year
        else:
            result["year"] = pd.to_numeric(df[date_col], errors="coerce")
            result["date"] = pd.NaT
    else:
        result["date"] = pd.NaT
        result["year"] = np.nan

    # Noise levels (dB)
    day_col = _find_col(df, [
        "day_noise", "day_db", "Leq_Day", "leq_day",
        "day_level", "Day", "noise_day", "day_time",
    ])
    night_col = _find_col(df, [
        "night_noise", "night_db", "Leq_Night", "leq_night",
        "night_level", "Night", "noise_night", "night_time",
    ])
    general_col = _find_col(df, [
        "noise_level", "noise", "decibel", "db", "Leq",
        "average_noise", "level",
    ])

    if day_col:
        result["noise_day_db"] = pd.to_numeric(df[day_col], errors="coerce").clip(20, 120)
    elif general_col:
        result["noise_day_db"] = pd.to_numeric(df[general_col], errors="coerce").clip(20, 120)
    else:
        result["noise_day_db"] = np.nan

    if night_col:
        result["noise_night_db"] = pd.to_numeric(df[night_col], errors="coerce").clip(20, 120)
    else:
        result["noise_night_db"] = np.nan

    # Area type
    area_col = _find_col(df, [
        "area_type", "zone", "Zone", "area_category",
        "category", "Category", "type",
    ])
    if area_col:
        result["area_type"] = df[area_col].astype(str).str.strip().str.lower()
    else:
        result["area_type"] = "commercial"

    # Compute noise violation score
    result["noise_violation_score"] = _compute_noise_violation(result)

    # Drop rows with no noise data
    noise_cols = ["noise_day_db", "noise_night_db"]
    available = [c for c in noise_cols if c in result.columns]
    if available:
        result = result[result[available].notna().any(axis=1)].copy()

    result["source_file"] = file_path.name
    return result


def _compute_noise_violation(df: pd.DataFrame) -> pd.Series:
    """
    How much does noise exceed safe limits?
    Returns 0-1 score: 0 = within limits, 1 = severely exceeding.
    """
    scores = pd.Series(0.0, index=df.index)

    for idx in df.index:
        area = str(df.at[idx, "area_type"]) if "area_type" in df.columns else "commercial"

        # Find matching limit
        limit_key = "commercial"  # default
        for key in NOISE_LIMITS:
            if key in area:
                limit_key = key
                break

        limits = NOISE_LIMITS[limit_key]

        day_db = df.at[idx, "noise_day_db"] if "noise_day_db" in df.columns else np.nan
        night_db = df.at[idx, "noise_night_db"] if "noise_night_db" in df.columns else np.nan

        violations = []
        if pd.notna(day_db):
            excess = max(0, day_db - limits["day"])
            violations.append(min(1.0, excess / 20.0))  # 20dB over = max violation
        if pd.notna(night_db):
            excess = max(0, night_db - limits["night"])
            violations.append(min(1.0, excess / 20.0))

        if violations:
            scores.at[idx] = max(violations)

    return scores


def compute_noise_factors(noise_df: pd.DataFrame) -> pd.DataFrame:
    """
    Compute noise-related safety factors per grid cell.

    Outputs:
    - noise_level_proxy (0-1): average noise violation score
    - avg_noise_day_db
    - avg_noise_night_db
    """
    if noise_df.empty:
        return pd.DataFrame()

    geo = noise_df.dropna(subset=["latitude", "longitude"]).copy()
    if geo.empty:
        return pd.DataFrame()

    geo["grid_lat"] = (geo["latitude"] / 0.1).round() * 0.1
    geo["grid_lon"] = (geo["longitude"] / 0.1).round() * 0.1

    grouped = geo.groupby(["grid_lat", "grid_lon"]).agg(
        noise_level_proxy=("noise_violation_score", "mean"),
        avg_noise_day_db=("noise_day_db", "mean"),
        avg_noise_night_db=("noise_night_db", "mean"),
        station_count=("noise_day_db", "size"),
    ).reset_index()

    grouped["latitude"] = grouped["grid_lat"]
    grouped["longitude"] = grouped["grid_lon"]

    return grouped


def ingest_all_noise() -> pd.DataFrame:
    csv_files = list(RAW_NOISE.glob("**/*.csv"))
    print(f"Found {len(csv_files)} noise CSV files")

    all_frames = []
    for f in csv_files:
        df = ingest_noise_file(f)
        if df is not None and not df.empty:
            all_frames.append(df)
            print(f"  Parsed {f.name}: {len(df)} rows")

    if not all_frames:
        print("No noise data found!")
        return pd.DataFrame()

    combined = pd.concat(all_frames, ignore_index=True)
    print(f"Combined: {len(combined)} noise records")
    
    if "latitude" in combined.columns:
        coord_pct = combined["latitude"].notna().mean() * 100
        print(f"Coordinate coverage: {coord_pct:.1f}%")
        matched = combined["latitude"].notna().sum()
        print(f"Stations matched: {matched}")
        if coord_pct < 50.0:
            raise ValueError(f"Coordinate coverage too low ({coord_pct:.1f}%), failing noise ingestion.")

    factors = compute_noise_factors(combined)

    output_path = PROCESSED_DIR / "noise_grid.parquet"
    factors.to_parquet(output_path, index=False)
    print(f"Saved: {output_path} ({len(factors)} grid cells)")

    return factors


if __name__ == "__main__":
    ingest_all_noise()