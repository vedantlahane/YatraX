"""
Ingest and normalize all crime datasets into a unified grid.

Input:  data/raw/crime/*.csv (multiple NCRB datasets)
Output: data/processed/crime_grid.parquet
"""

from __future__ import annotations

import glob
from pathlib import Path

import numpy as np
import pandas as pd

from config.settings import RAW_CRIME, PROCESSED_DIR, RANDOM_SEED


# Known column name mappings across different NCRB datasets
DISTRICT_COL_NAMES = [
    "district",
    "district_name",
    "District",
    "DISTRICT",
]
STATE_COL_NAMES = [
    "state",
    "state_name",
    "State",
    "STATE_UT",
    "state_ut",
    "STATE/UT",
    "States/UTs",
    "States/UT",
    "STATE/UTS",
]
YEAR_COL_NAMES = ["year", "Year", "YEAR"]

# Crime type columns we look for
CRIME_COLUMNS = {
    "murder": ["murder", "Murder", "MURDER"],
    "robbery": ["robbery", "Robbery", "ROBBERY", "dacoity", "Dacoity"],
    "theft": ["theft", "Theft", "THEFT"],
    "rape": ["rape", "Rape", "RAPE"],
    "kidnapping": [
        "kidnapping",
        "Kidnapping",
        "KIDNAPPING",
        "kidnapping_abduction",
        "KIDNAPPING & ABDUCTION",
        "Kidnapping & Abduction",
        "Kidnapping and Abduction",
    ],
    "assault": [
        "assault",
        "Assault",
        "ASSAULT",
        "assault_on_women",
        "ASSAULT ON WOMEN WITH INTENT TO OUTRAGE HER MODESTY",
        "Assault on women with intent to outrage her modesty",
        "HURT/GREVIOUS HURT",
    ],
    "riots": ["riots", "Riots", "RIOTS"],
    "total_ipc": [
        "total_ipc_crimes",
        "Total_IPC_crimes",
        "TOTAL_IPC_CRIMES",
        "TOTAL IPC CRIMES",
        "Total IPC Crimes",
        "total ipc crimes",
        "total",
    ],
}

# District centroids (a subset — full version would have all 700+ districts)
# In production, use the census geospatial index dataset
DISTRICT_CENTROIDS_PATH = RAW_CRIME.parent / "population" / "district_centroids.csv"


def _crime_file_kind(file_path: Path) -> str | None:
    """
    Classify raw NCRB files into the small subset we can safely merge.

    We currently keep only district-level IPC totals and district-level
    crimes-against-women tables. Other NCRB exports (arrests, police staffing,
    property recovery, etc.) are valid datasets, but they do not map cleanly
    into the current feature engineering logic and would otherwise distort the
    district aggregates.
    """
    name = file_path.name.lower()
    if "district_wise_crimes_committed_ipc" in name:
        return "ipc"
    if "district_wise_crimes_committed_against_women" in name:
        return "women"
    return None


def _dedupe_csv_files(csv_files: list[Path]) -> list[Path]:
    """
    Keep one copy per filename, preferring the shallowest path.

    Some Kaggle crime dumps contain the same NCRB files nested under repeated
    `crime/` folders. Processing every duplicate would double-count rows.
    """
    chosen: dict[str, Path] = {}
    for path in csv_files:
        key = path.name.lower()
        current = chosen.get(key)
        if current is None or len(path.parts) < len(current.parts):
            chosen[key] = path
    return sorted(chosen.values(), key=lambda p: p.name.lower())


def _find_column(df: pd.DataFrame, candidates: list[str]) -> str | None:
    """Find the first matching column name from a list of candidates."""
    for col in candidates:
        if col in df.columns:
            return col
    # Case-insensitive fallback
    lower_map = {c.lower().strip(): c for c in df.columns}
    for candidate in candidates:
        if candidate.lower().strip() in lower_map:
            return lower_map[candidate.lower().strip()]
    return None


def _safe_float(series: pd.Series) -> pd.Series:
    """Convert series to float, coercing errors."""
    return pd.to_numeric(series, errors="coerce").fillna(0.0)


def _load_district_centroids() -> pd.DataFrame:
    """
    Load district → lat/lon mapping.
    If geospatial census dataset exists, use it.
    Otherwise, generate approximate centroids from state averages.
    """
    if DISTRICT_CENTROIDS_PATH.exists():
        centroids = pd.read_csv(DISTRICT_CENTROIDS_PATH)
        # Normalize column names to lowercase
        centroids.columns = [c.strip().lower() for c in centroids.columns]
        # Ensure state column is lowercase string
        if "state" in centroids.columns:
            centroids["state"] = centroids["state"].astype(str).str.strip().str.lower()
        # Rename common variants
        rename_map = {}
        for col in centroids.columns:
            if col in ("lat", "latitude"):
                rename_map[col] = "latitude"
            elif col in ("lon", "lng", "longitude"):
                rename_map[col] = "longitude"
        if rename_map:
            centroids = centroids.rename(columns=rename_map)
        return centroids

    # Fallback: state-level approximate centroids
    # These are rough centers — real pipeline uses census geospatial dataset
    state_coords = {
        "andhra pradesh": (15.9, 79.7),
        "arunachal pradesh": (28.2, 94.7),
        "assam": (26.2, 92.9),
        "bihar": (25.1, 85.3),
        "chhattisgarh": (21.3, 81.6),
        "delhi": (28.7, 77.1),
        "delhi ut": (28.7, 77.1),
        "goa": (15.4, 74.0),
        "gujarat": (22.3, 71.2),
        "haryana": (29.0, 76.1),
        "himachal pradesh": (31.1, 77.2),
        "jharkhand": (23.6, 85.3),
        "karnataka": (15.3, 75.7),
        "kerala": (10.9, 76.3),
        "madhya pradesh": (22.9, 78.7),
        "maharashtra": (19.8, 75.3),
        "manipur": (24.7, 93.9),
        "meghalaya": (25.5, 91.4),
        "mizoram": (23.2, 92.9),
        "nagaland": (26.2, 94.6),
        "odisha": (20.9, 84.8),
        "punjab": (31.1, 75.3),
        "rajasthan": (27.0, 74.2),
        "sikkim": (27.5, 88.5),
        "tamil nadu": (11.1, 78.7),
        "telangana": (18.1, 79.0),
        "tripura": (23.9, 91.9),
        "uttar pradesh": (26.8, 80.9),
        "uttarakhand": (30.1, 79.0),
        "west bengal": (22.9, 87.9),
        "jammu and kashmir": (33.8, 76.6),
        "jammu & kashmir": (33.8, 76.6),
        "ladakh": (34.2, 77.6),
        "a & n islands": (11.7, 92.7),
        "andaman & nicobar islands": (11.7, 92.7),
        "chandigarh": (30.7, 76.8),
        "d & n haveli": (20.3, 73.0),
        "daman & diu": (20.4, 72.8),
        "lakshadweep": (10.6, 72.6),
        "puducherry": (11.9, 79.8),
    }

    rows = []
    for state, (lat, lon) in state_coords.items():
        rows.append({"state": state, "latitude": lat, "longitude": lon})
    return pd.DataFrame(rows)


def ingest_crime_dataset(file_path: Path) -> pd.DataFrame | None:
    """
    Parse a single crime CSV file into normalized rows.
    Handles varying column names across NCRB releases.
    """
    try:
        df = pd.read_csv(file_path, encoding="utf-8", low_memory=False)
    except Exception:
        try:
            df = pd.read_csv(file_path, encoding="latin-1", low_memory=False)
        except Exception as e:
            print(f"  Cannot read {file_path.name}: {e}")
            return None

    if df.empty or len(df.columns) < 3:
        return None

    file_kind = _crime_file_kind(file_path)
    if file_kind is None:
        return None

    # Find key columns
    state_col = _find_column(df, STATE_COL_NAMES)
    district_col = _find_column(df, DISTRICT_COL_NAMES)
    year_col = _find_column(df, YEAR_COL_NAMES)

    if state_col is None or district_col is None:
        return None

    result = pd.DataFrame()
    result["state"] = df[state_col].astype(str).str.strip().str.lower()
    result["district"] = df[district_col].astype(str).str.strip().str.lower()

    if year_col:
        result["year"] = _safe_float(df[year_col]).astype(int)
    else:
        result["year"] = 0

    matched_crime_cols = 0

    # Extract crime type columns
    for crime_type, col_candidates in CRIME_COLUMNS.items():
        col = _find_column(df, col_candidates)
        if col:
            result[crime_type] = _safe_float(df[col])
            matched_crime_cols += 1
        else:
            result[crime_type] = 0.0

    if matched_crime_cols == 0:
        return None

    # Filter out aggregation rows
    result = result[
        ~result["state"].str.contains("total|all india|^india$", case=False, na=False)
    ].copy()
    result = result[
        ~result["district"].str.contains("total|all district|^zz total$|^sstotal$",
                                         case=False, na=False)
    ].copy()

    if result.empty:
        return None

    result["source_file"] = file_path.name
    result["source_kind"] = file_kind

    return result


def compute_crime_factors(crime_df: pd.DataFrame) -> pd.DataFrame:
    """
    Compute safety-relevant crime factors from raw crime counts.
    
    Outputs per district:
    - crime_rate_per_100k (total IPC crimes normalized)
    - crime_type_distribution_risk (violent crime ratio)
    - gender_safety_index (inverse of crimes against women ratio)
    - tourist_targeted_crime_index (robbery + theft ratio)
    - scam_risk_proxy (cheating + fraud ratio where available)
    """

    # Use most recent year per district
    if "year" in crime_df.columns and crime_df["year"].max() > 0:
        latest_year = crime_df["year"].max()
        recent = crime_df[crime_df["year"] >= latest_year - 2].copy()
    else:
        recent = crime_df.copy()

    ipc = recent[recent["source_kind"] == "ipc"].copy()
    if ipc.empty:
        return pd.DataFrame()

    # Aggregate IPC crimes by state+district (average across years)
    grouped = ipc.groupby(["state", "district"]).agg({
        "murder": "mean",
        "robbery": "mean",
        "theft": "mean",
        "rape": "mean",
        "kidnapping": "mean",
        "assault": "mean",
        "riots": "mean",
        "total_ipc": "mean",
    }).reset_index()

    grouped = grouped[grouped["total_ipc"] > 0].copy()
    if grouped.empty:
        return grouped

    # We do not have reliable district population in the current crime ingest,
    # so convert IPC counts into a bounded district crime-intensity proxy.
    # This preserves relative ordering without saturating nearly every district.
    p95_total = grouped["total_ipc"].quantile(0.95)
    total = grouped["total_ipc"].clip(lower=1)
    grouped["crime_rate_per_100k"] = (
        total / max(p95_total, 1.0) * 750.0
    ).clip(0, 750)

    # Violent crime ratio
    violent = grouped["murder"] + grouped["robbery"] + grouped["assault"] + grouped["riots"]
    grouped["crime_type_distribution_risk"] = (violent / total).clip(0, 1)

    # Tourist-targeted crime proxy
    tourist_crimes = grouped["robbery"] + grouped["theft"]
    grouped["tourist_targeted_crime_index"] = (tourist_crimes / total).clip(0, 1)

    # Prefer women-specific district tables for gender safety when present.
    women = recent[recent["source_kind"] == "women"].copy()
    if not women.empty:
        women_grouped = women.groupby(["state", "district"]).agg({
            "rape": "mean",
            "kidnapping": "mean",
            "assault": "mean",
        }).reset_index()
        women_grouped["women_risk_total"] = (
            women_grouped["rape"] +
            women_grouped["kidnapping"] +
            women_grouped["assault"]
        )
        grouped = grouped.merge(
            women_grouped[["state", "district", "women_risk_total"]],
            on=["state", "district"],
            how="left",
        )
        women_risk = grouped["women_risk_total"].fillna(grouped["rape"] + grouped["kidnapping"])
    else:
        women_risk = grouped["rape"] + grouped["kidnapping"]

    women_risk = women_risk.fillna(0.0)
    total = grouped["total_ipc"].clip(lower=1)

    grouped["gender_safety_index"] = (
        1.0 - (women_risk / total).clip(0, 1)
    ).clip(0.15, 0.98)

    return grouped


def ingest_all_crime() -> pd.DataFrame:
    """
    Main entry point: ingest all crime CSVs, compute factors, 
    attach coordinates, save as grid.
    """
    csv_files = _dedupe_csv_files(list(RAW_CRIME.glob("**/*.csv")))
    print(f"Found {len(csv_files)} crime CSV files")

    all_frames = []
    for f in csv_files:
        df = ingest_crime_dataset(f)
        if df is not None and not df.empty:
            all_frames.append(df)
            print(f"  Parsed {f.name}: {len(df)} rows")

    if not all_frames:
        print("No crime data found!")
        return pd.DataFrame()

    combined = pd.concat(all_frames, ignore_index=True)
    print(f"Combined: {len(combined)} rows")

    # Compute factors
    factors = compute_crime_factors(combined)
    print(f"Crime factors computed: {len(factors)} districts")

    # Attach coordinates
    centroids = _load_district_centroids()

    # Ensure merge column types match
    factors["state"] = factors["state"].astype(str).str.strip().str.lower()

    # Try district-level merge first, then state-level fallback
    if "district" in centroids.columns:
        merge_cols = ["state", "district"]
        centroids["district"] = centroids["district"].astype(str).str.strip().str.lower()
        merged = factors.merge(
            centroids[["state", "district", "latitude", "longitude"]].drop_duplicates(),
            on=merge_cols,
            how="left",
        )
        # For unmatched districts, fall back to state-level centroids
        unmatched = merged["latitude"].isna()
        if unmatched.any():
            state_centroids = centroids.groupby("state")[["latitude", "longitude"]].mean().reset_index()
            for idx in merged[unmatched].index:
                st = merged.at[idx, "state"]
                match = state_centroids[state_centroids["state"] == st]
                if not match.empty:
                    merged.at[idx, "latitude"] = match.iloc[0]["latitude"]
                    merged.at[idx, "longitude"] = match.iloc[0]["longitude"]
        factors = merged
    else:
        # State-level centroids only — keep only lat/lon columns to avoid conflicts
        centroid_cols = [c for c in ["state", "latitude", "longitude"] if c in centroids.columns]
        factors = factors.merge(
            centroids[centroid_cols].drop_duplicates(subset=["state"]),
            on="state",
            how="left",
        )

    # Add jitter for districts (since we only have state centroids in fallback)
    rng = np.random.default_rng(RANDOM_SEED)
    if "latitude" in factors.columns:
        valid_mask = factors["latitude"].notna()
        n_valid = valid_mask.sum()
        if n_valid > 0:
            factors.loc[valid_mask, "latitude"] += rng.normal(0, 0.5, n_valid)
            factors.loc[valid_mask, "longitude"] += rng.normal(0, 0.5, n_valid)

    # Drop rows without coordinates
    factors = factors.dropna(subset=["latitude", "longitude"]).copy()

    # Save
    output_path = PROCESSED_DIR / "crime_grid.parquet"
    factors.to_parquet(output_path, index=False)
    print(f"Saved: {output_path} ({len(factors)} rows)")

    return factors


if __name__ == "__main__":
    ingest_all_crime()
