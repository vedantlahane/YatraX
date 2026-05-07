"""
Ingest hospital and health infrastructure datasets.

Input:  data/raw/health/*.csv
Output: data/processed/health_grid.parquet
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd

from config.settings import RAW_HEALTH, PROCESSED_DIR
from processing.geo_grid import snap_dataframe


HOSPITAL_TYPE_SCORES = {
    # Higher score = better equipped facility
    "aiims": 100,
    "medical college": 95,
    "district hospital": 85,
    "sub-district hospital": 75,
    "community health centre": 65,
    "chc": 65,
    "primary health centre": 50,
    "phc": 50,
    "sub centre": 30,
    "dispensary": 35,
    "private": 70,
    "government": 60,
    "charitable": 55,
}


HEALTH_CITY_COORDS = {
    "agra": (27.1767, 78.0081),
    "ahmedabad": (23.0225, 72.5714),
    "amritsar": (31.6340, 74.8723),
    "bengaluru": (12.9716, 77.5946),
    "bangalore": (12.9716, 77.5946),
    "bhopal": (23.2599, 77.4126),
    "bhubaneswar": (20.2961, 85.8245),
    "chandigarh": (30.7333, 76.7794),
    "chennai": (13.0827, 80.2707),
    "coimbatore": (11.0168, 76.9558),
    "dehradun": (30.3165, 78.0322),
    "delhi": (28.6139, 77.2090),
    "faridabad": (28.4089, 77.3178),
    "ghaziabad": (28.6692, 77.4538),
    "guwahati": (26.1445, 91.7362),
    "gurgaon": (28.4595, 77.0266),
    "gurugram": (28.4595, 77.0266),
    "hyderabad": (17.3850, 78.4867),
    "indore": (22.7196, 75.8577),
    "jaipur": (26.9124, 75.7873),
    "kanpur": (26.4499, 80.3319),
    "kochi": (9.9312, 76.2673),
    "kolkata": (22.5726, 88.3639),
    "lucknow": (26.8467, 80.9462),
    "ludhiana": (30.9010, 75.8573),
    "mumbai": (19.0760, 72.8777),
    "mysore": (12.2958, 76.6394),
    "mysuru": (12.2958, 76.6394),
    "nagpur": (21.1458, 79.0882),
    "noida": (28.5355, 77.3910),
    "patna": (25.6093, 85.1376),
    "pune": (18.5204, 73.8567),
    "ranchi": (23.3441, 85.3096),
    "raipur": (21.2514, 81.6296),
    "surat": (21.1702, 72.8311),
    "thiruvananthapuram": (8.5241, 76.9366),
    "trivandrum": (8.5241, 76.9366),
    "varanasi": (25.3176, 83.0064),
    "visakhapatnam": (17.6868, 83.2185),
    "vijayawada": (16.5062, 80.6480),
}


HEALTH_STATE_COORDS = {
    "andhra pradesh": HEALTH_CITY_COORDS["visakhapatnam"],
    "assam": HEALTH_CITY_COORDS["guwahati"],
    "bihar": HEALTH_CITY_COORDS["patna"],
    "chandigarh": HEALTH_CITY_COORDS["chandigarh"],
    "chhattisgarh": HEALTH_CITY_COORDS["raipur"],
    "delhi": HEALTH_CITY_COORDS["delhi"],
    "gujarat": HEALTH_CITY_COORDS["ahmedabad"],
    "haryana": HEALTH_CITY_COORDS["gurugram"],
    "jharkhand": HEALTH_CITY_COORDS["ranchi"],
    "karnataka": HEALTH_CITY_COORDS["bengaluru"],
    "kerala": HEALTH_CITY_COORDS["thiruvananthapuram"],
    "madhya pradesh": HEALTH_CITY_COORDS["bhopal"],
    "maharashtra": HEALTH_CITY_COORDS["mumbai"],
    "odisha": HEALTH_CITY_COORDS["bhubaneswar"],
    "punjab": HEALTH_CITY_COORDS["amritsar"],
    "rajasthan": HEALTH_CITY_COORDS["jaipur"],
    "tamil nadu": HEALTH_CITY_COORDS["chennai"],
    "telangana": HEALTH_CITY_COORDS["hyderabad"],
    "uttar pradesh": HEALTH_CITY_COORDS["lucknow"],
    "uttarakhand": HEALTH_CITY_COORDS["dehradun"],
    "west bengal": HEALTH_CITY_COORDS["kolkata"],
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


def _lookup_city_coords(text: str) -> tuple[float, float] | None:
    value = str(text).strip().lower()
    if value in {"", "nan", "none", "null"}:
        return None
    if value in HEALTH_CITY_COORDS:
        return HEALTH_CITY_COORDS[value]
    for city, coords in HEALTH_CITY_COORDS.items():
        if city in value or (len(value) >= 4 and value in city):
            return coords
    return None


def _assign_spatial_fallbacks(result: pd.DataFrame) -> pd.DataFrame:
    from ingestion.ingest_crime import _load_district_centroids

    if "latitude" not in result.columns:
        result["latitude"] = np.nan
    if "longitude" not in result.columns:
        result["longitude"] = np.nan

    centroids = _load_district_centroids()
    if not centroids.empty:
        centroids = centroids.copy()
        centroids.columns = [c.strip().lower() for c in centroids.columns]
        if "state" in centroids.columns:
            centroids["state"] = centroids["state"].astype(str).str.strip().str.lower()
        if "district" in centroids.columns:
            centroids["district"] = centroids["district"].astype(str).str.strip().str.lower()

        if "district" in result.columns and "state" in result.columns and "district" in centroids.columns:
            missing = result["latitude"].isna() | result["longitude"].isna()
            merged = result.loc[missing, ["state", "district"]].merge(
                centroids[["state", "district", "latitude", "longitude"]].drop_duplicates(),
                on=["state", "district"],
                how="left",
            )
            for idx, row in zip(result.loc[missing].index, merged.itertuples(index=False)):
                if pd.notna(row.latitude) and pd.notna(row.longitude):
                    result.at[idx, "latitude"] = row.latitude
                    result.at[idx, "longitude"] = row.longitude

    if "city" in result.columns:
        missing = result["latitude"].isna() | result["longitude"].isna()
        for idx in result[missing].index:
            coords = _lookup_city_coords(result.at[idx, "city"])
            if coords is not None:
                result.at[idx, "latitude"] = coords[0]
                result.at[idx, "longitude"] = coords[1]

    if "state" in result.columns:
        missing = result["latitude"].isna() | result["longitude"].isna()
        for idx in result[missing].index:
            state = str(result.at[idx, "state"]).strip().lower()
            coords = HEALTH_STATE_COORDS.get(state)
            if coords is not None:
                result.at[idx, "latitude"] = coords[0]
                result.at[idx, "longitude"] = coords[1]

    return result


def _classify_hospital_type(name_or_type: str) -> tuple[str, float]:
    """Classify hospital and return (type, capability_score)."""
    text = str(name_or_type).lower().strip()

    for keyword, score in HOSPITAL_TYPE_SCORES.items():
        if keyword in text:
            return keyword, float(score)

    # Default classification based on name patterns
    if any(w in text for w in ["super", "specialty", "multi"]):
        return "specialty", 90.0
    if any(w in text for w in ["clinic", "nursing home"]):
        return "clinic", 55.0
    if any(w in text for w in ["hospital", "medical"]):
        return "general_hospital", 65.0

    return "unknown", 50.0


def ingest_hospital_file(file_path: Path) -> pd.DataFrame | None:
    """Parse a single hospital/health CSV."""
    try:
        df = pd.read_csv(file_path, low_memory=False, encoding="utf-8")
    except Exception:
        try:
            df = pd.read_csv(file_path, low_memory=False, encoding="latin-1")
        except Exception as e:
            print(f"  Cannot read {file_path.name}: {e}")
            return None

    if df.empty:
        return None

    result = pd.DataFrame()

    # Location
    lat_col = _find_col(df, ["latitude", "lat", "Latitude", "hospital_latitude"])
    lon_col = _find_col(df, ["longitude", "lon", "lng", "Longitude", "hospital_longitude"])
    state_col = _find_col(df, ["state", "State", "STATE", "state_name"])
    district_col = _find_col(df, ["district", "District", "DISTRICT"])
    city_col = _find_col(df, ["city", "City", "location", "place"])

    if lat_col and lon_col:
        result["latitude"] = pd.to_numeric(df[lat_col], errors="coerce")
        result["longitude"] = pd.to_numeric(df[lon_col], errors="coerce")
    else:
        result["latitude"] = np.nan
        result["longitude"] = np.nan

    if state_col:
        result["state"] = df[state_col].astype(str).str.strip().str.lower()
    if district_col:
        result["district"] = df[district_col].astype(str).str.strip().str.lower()
    if city_col:
        result["city"] = df[city_col].astype(str).str.strip().str.lower()

    result = _assign_spatial_fallbacks(result)

    # Hospital name
    name_col = _find_col(df, [
        "hospital_name", "name", "Name", "Hospital_Name",
        "facility_name", "Facility_Name", "hospital",
    ])
    if name_col:
        result["hospital_name"] = df[name_col].astype(str).str.strip()
    else:
        result["hospital_name"] = "Unknown Hospital"

    # Hospital type
    type_col = _find_col(df, [
        "hospital_type", "type", "Type", "Hospital_Type",
        "facility_type", "category", "Category",
    ])
    type_source = df[type_col] if type_col else result["hospital_name"]

    classifications = type_source.apply(_classify_hospital_type)
    result["hospital_type"] = classifications.apply(lambda x: x[0])
    result["hospital_capability_score"] = classifications.apply(lambda x: x[1])

    # Beds
    beds_col = _find_col(df, [
        "beds", "total_beds", "Beds", "no_of_beds",
        "Total_Beds", "bed_count", "number_of_beds",
    ])
    if beds_col:
        result["bed_count"] = pd.to_numeric(df[beds_col], errors="coerce").fillna(0)
    else:
        result["bed_count"] = 0

    # Specialty departments / services
    for dept_name, dept_cols in {
        "has_emergency": ["emergency", "Emergency", "casualty", "trauma"],
        "has_icu": ["icu", "ICU", "intensive"],
        "has_surgery": ["surgery", "surgical", "operation"],
        "has_blood_bank": ["blood_bank", "blood bank", "Blood_Bank"],
    }.items():
        dept_col = _find_col(df, dept_cols)
        if dept_col:
            result[dept_name] = df[dept_col].apply(
                lambda v: 1 if str(v).strip().lower() in ["yes", "y", "1", "true", "available"] else 0
            )
        else:
            # Infer from name/type
            result[dept_name] = type_source.apply(
                lambda v: 1 if any(kw in str(v).lower() for kw in dept_cols) else 0
            )

    result["source_file"] = file_path.name
    return result


def compute_health_factors(hospital_df: pd.DataFrame) -> pd.DataFrame:
    """
    Compute health infrastructure factors per grid cell.

    Outputs:
    - hospital_density (hospitals per grid cell)
    - avg_hospital_capability (average capability score)
    - total_bed_count
    - emergency_availability_score
    - nearest_hospital_estimated_km (proxy based on density)
    """
    if hospital_df.empty:
        return pd.DataFrame()

    geo = hospital_df.dropna(subset=["latitude", "longitude"]).copy()

    if geo.empty:
        return pd.DataFrame()

    geo = snap_dataframe(geo)

    grouped = geo.groupby(["grid_lat", "grid_lon"]).agg(
        hospital_count=("hospital_name", "size"),
        avg_capability=("hospital_capability_score", "mean"),
        total_beds=("bed_count", "sum"),
        emergency_count=("has_emergency", "sum"),
        icu_count=("has_icu", "sum"),
    ).reset_index()

    # Hospital level score (0-100)
    grouped["hospital_level_score"] = grouped["avg_capability"].clip(0, 100)

    # Emergency availability score
    grouped["emergency_availability_score"] = np.where(
        grouped["hospital_count"] > 0,
        (grouped["emergency_count"] / grouped["hospital_count"] * 100).clip(0, 100),
        0.0,
    )

    # Ambulance response proxy: more hospitals = faster response
    # Rough estimate: each hospital "covers" about 15km radius
    grouped["ambulance_response_score"] = (
        grouped["hospital_count"].clip(0, 10) * 10.0
    ).clip(0, 100)

    # Nearest hospital proxy (inverse of density)
    # If 5 hospitals in an 11km cell, avg distance ≈ 2-3km
    grouped["nearest_hospital_proxy_km"] = np.where(
        grouped["hospital_count"] > 0,
        (11.0 / np.sqrt(grouped["hospital_count"])).clip(0.5, 100),
        50.0,
    )

    grouped["latitude"] = grouped["grid_lat"]
    grouped["longitude"] = grouped["grid_lon"]

    return grouped


def ingest_all_health() -> pd.DataFrame:
    csv_files = list(RAW_HEALTH.glob("**/*.csv"))
    print(f"Found {len(csv_files)} health CSV files")

    all_frames = []
    for f in csv_files:
        df = ingest_hospital_file(f)
        if df is not None and not df.empty:
            all_frames.append(df)
            print(f"  Parsed {f.name}: {len(df)} facilities")

    if not all_frames:
        print("No health data found!")
        return pd.DataFrame()

    combined = pd.concat(all_frames, ignore_index=True)
    combined["coord_key"] = combined.apply(
        lambda row: (
            round(float(row["latitude"]), 2), round(float(row["longitude"]), 2)
        ) if pd.notna(row.get("latitude")) and pd.notna(row.get("longitude")) else (
            str(row.get("city", "")),
            str(row.get("district", "")),
        ),
        axis=1,
    )
    # Deduplicate hospitals by name plus approximate location, not by state only.
    combined["name_lower"] = combined["hospital_name"].str.lower().str.strip()
    combined = combined.drop_duplicates(
        subset=["name_lower", "coord_key"],
        keep="first",
    ).drop(columns=["name_lower", "coord_key"])

    print(f"Combined: {len(combined)} unique facilities")

    coord_pct = float(combined["latitude"].notna().mean() * 100) if "latitude" in combined.columns else 0.0
    print(f"Coordinate coverage: {coord_pct:.1f}%")

    factors = compute_health_factors(combined)

    output_path = PROCESSED_DIR / "health_grid.parquet"
    factors.to_parquet(output_path, index=False)
    print(f"Saved: {output_path} ({len(factors)} grid cells)")

    return factors


if __name__ == "__main__":
    ingest_all_health()
