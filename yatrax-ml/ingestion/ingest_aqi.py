"""
Ingest air quality datasets.

Input:  data/raw/air_quality/*.csv
Output: data/processed/aqi_grid.parquet
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd

from config.settings import RAW_AQI, PROCESSED_DIR
from processing.geo_grid import snap_dataframe


AQI_COLS = ["aqi", "AQI", "air_quality_index", "AQI_Value"]
PM25_COLS = ["pm2.5", "PM2.5", "pm25", "PM25"]
PM10_COLS = ["pm10", "PM10"]
NO2_COLS = ["no2", "NO2"]
SO2_COLS = ["so2", "SO2"]
CO_COLS = ["co", "CO"]
O3_COLS = ["ozone", "o3", "O3"]
DATE_COLS = ["date", "Date", "datetime", "Datetime", "sampling_date"]
CITY_COLS = ["city", "City", "station", "StationId", "location"]
STATE_COLS = ["state", "State"]
LAT_COLS = ["latitude", "lat"]
LON_COLS = ["longitude", "lon", "lng"]


# City-level coordinates for common CPCB / Kaggle AQI datasets.
AQI_CITY_COORDS = {
    "agra": (27.1767, 78.0081),
    "ahmedabad": (23.0225, 72.5714),
    "amritsar": (31.6340, 74.8723),
    "bengaluru": (12.9716, 77.5946),
    "bangalore": (12.9716, 77.5946),
    "bhopal": (23.2599, 77.4126),
    "chandigarh": (30.7333, 76.7794),
    "chennai": (13.0827, 80.2707),
    "coimbatore": (11.0168, 76.9558),
    "delhi": (28.6139, 77.2090),
    "faridabad": (28.4089, 77.3178),
    "ghaziabad": (28.6692, 77.4538),
    "gurgaon": (28.4595, 77.0266),
    "gurugram": (28.4595, 77.0266),
    "guwahati": (26.1445, 91.7362),
    "hyderabad": (17.3850, 78.4867),
    "jaipur": (26.9124, 75.7873),
    "jodhpur": (26.2389, 73.0243),
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
    "rajkot": (22.3039, 70.8022),
    "ranchi": (23.3441, 85.3096),
    "surat": (21.1702, 72.8311),
    "thiruvananthapuram": (8.5241, 76.9366),
    "trivandrum": (8.5241, 76.9366),
    "varanasi": (25.3176, 83.0064),
    "visakhapatnam": (17.6868, 83.2185),
    "vijayawada": (16.5062, 80.6480),
}

# Station-code prefixes seen in CPCB-style exports. These are coarse fallbacks
# but still far better than losing all spatial information and defaulting AQI.
AQI_CODE_PREFIX_COORDS = {
    "ap": AQI_CITY_COORDS["visakhapatnam"],
    "br": AQI_CITY_COORDS["patna"],
    "dl": AQI_CITY_COORDS["delhi"],
    "gj": AQI_CITY_COORDS["ahmedabad"],
    "hr": AQI_CITY_COORDS["gurugram"],
    "ka": AQI_CITY_COORDS["bengaluru"],
    "kl": AQI_CITY_COORDS["thiruvananthapuram"],
    "pb": AQI_CITY_COORDS["amritsar"],
    "rj": AQI_CITY_COORDS["jaipur"],
    "tg": AQI_CITY_COORDS["hyderabad"],
    "tn": AQI_CITY_COORDS["chennai"],
    "up": AQI_CITY_COORDS["lucknow"],
    "wb": AQI_CITY_COORDS["kolkata"],
}

AQI_STATE_COORDS = {
    "andhra pradesh": AQI_CITY_COORDS["visakhapatnam"],
    "bihar": AQI_CITY_COORDS["patna"],
    "chandigarh": AQI_CITY_COORDS["chandigarh"],
    "delhi": AQI_CITY_COORDS["delhi"],
    "gujarat": AQI_CITY_COORDS["ahmedabad"],
    "haryana": AQI_CITY_COORDS["gurugram"],
    "karnataka": AQI_CITY_COORDS["bengaluru"],
    "kerala": AQI_CITY_COORDS["thiruvananthapuram"],
    "maharashtra": AQI_CITY_COORDS["mumbai"],
    "punjab": AQI_CITY_COORDS["amritsar"],
    "rajasthan": AQI_CITY_COORDS["jaipur"],
    "tamil nadu": AQI_CITY_COORDS["chennai"],
    "telangana": AQI_CITY_COORDS["hyderabad"],
    "uttar pradesh": AQI_CITY_COORDS["lucknow"],
    "west bengal": AQI_CITY_COORDS["kolkata"],
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


def _lookup_city_coords(name: str) -> tuple[float, float] | None:
    text = str(name).strip().lower()
    if text in {"", "nan", "none", "null"}:
        return None

    if text in AQI_CITY_COORDS:
        return AQI_CITY_COORDS[text]

    for city, coords in AQI_CITY_COORDS.items():
        if city in text or (len(text) >= 4 and text in city):
            return coords

    prefix = text[:2]
    if prefix in AQI_CODE_PREFIX_COORDS:
        return AQI_CODE_PREFIX_COORDS[prefix]

    return None


def _assign_spatial_fallbacks(result: pd.DataFrame) -> pd.DataFrame:
    if "latitude" not in result.columns:
        result["latitude"] = np.nan
    if "longitude" not in result.columns:
        result["longitude"] = np.nan

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
            coords = AQI_STATE_COORDS.get(state)
            if coords is not None:
                result.at[idx, "latitude"] = coords[0]
                result.at[idx, "longitude"] = coords[1]

    return result


def _compute_aqi_from_pollutants(df: pd.DataFrame) -> pd.Series:
    """
    If AQI column is missing, estimate from individual pollutants.
    Uses India's National AQI breakpoint system (simplified).
    """
    aqi = pd.Series(np.nan, index=df.index)

    # PM2.5 based AQI (dominant pollutant in India)
    pm25_col = _find_col(df, PM25_COLS)
    if pm25_col:
        pm25 = pd.to_numeric(df[pm25_col], errors="coerce")
        # Simplified Indian AQI breakpoints for PM2.5
        conditions = [
            pm25 <= 30,       # Good (0-50)
            pm25 <= 60,       # Satisfactory (51-100)
            pm25 <= 90,       # Moderate (101-200)
            pm25 <= 120,      # Poor (201-300)
            pm25 <= 250,      # Very Poor (301-400)
            pm25 > 250,       # Severe (401-500)
        ]
        values = [
            pm25 / 30.0 * 50.0,
            50.0 + (pm25 - 30.0) / 30.0 * 50.0,
            100.0 + (pm25 - 60.0) / 30.0 * 100.0,
            200.0 + (pm25 - 90.0) / 30.0 * 100.0,
            300.0 + (pm25 - 120.0) / 130.0 * 100.0,
            400.0 + (pm25 - 250.0) / 130.0 * 100.0,
        ]
        aqi = np.select(conditions, values, default=np.nan)
        aqi = pd.Series(aqi, index=df.index).clip(0, 500)

    return aqi


def compute_aqi_factors(aqi_df: pd.DataFrame) -> pd.DataFrame:
    """
    Collapse AQI time-series records into static spatial features per grid cell.
    """
    if aqi_df.empty:
        return pd.DataFrame()

    geo = aqi_df.dropna(subset=["latitude", "longitude"]).copy()
    if geo.empty:
        return pd.DataFrame()

    geo = snap_dataframe(geo)

    agg_map: dict[str, tuple[str, str]] = {
        "aqi": ("aqi", "mean"),
        "pm25": ("pm25", "mean"),
        "pm10": ("pm10", "mean"),
    }

    available = {
        out_col: spec for out_col, spec in agg_map.items()
        if spec[0] in geo.columns
    }
    if not available:
        return pd.DataFrame()

    grouped = geo.groupby(["grid_lat", "grid_lon"]).agg(
        **{
            out_col: pd.NamedAgg(column=in_col, aggfunc=agg_func)
            for out_col, (in_col, agg_func) in available.items()
        },
        sample_count=pd.NamedAgg(column="aqi", aggfunc="size"),
    ).reset_index()

    grouped["latitude"] = grouped["grid_lat"]
    grouped["longitude"] = grouped["grid_lon"]

    return grouped


def ingest_aqi_file(file_path: Path) -> pd.DataFrame | None:
    """Parse a single AQI CSV."""
    try:
        df = pd.read_csv(file_path, low_memory=False)
    except Exception as e:
        print(f"  Cannot read {file_path.name}: {e}")
        return None

    if df.empty:
        return None

    result = pd.DataFrame()

    # Location
    lat_col = _find_col(df, LAT_COLS)
    lon_col = _find_col(df, LON_COLS)
    city_col = _find_col(df, CITY_COLS)
    state_col = _find_col(df, STATE_COLS)

    if lat_col and lon_col:
        result["latitude"] = pd.to_numeric(df[lat_col], errors="coerce")
        result["longitude"] = pd.to_numeric(df[lon_col], errors="coerce")

    if city_col:
        result["city"] = df[city_col].astype(str).str.strip().str.lower()
    if state_col:
        result["state"] = df[state_col].astype(str).str.strip().str.lower()

    result = _assign_spatial_fallbacks(result)

    # Date
    date_col = _find_col(df, DATE_COLS)
    if date_col:
        result["date"] = pd.to_datetime(df[date_col], errors="coerce")
        result["month"] = result["date"].dt.month
        result["year"] = result["date"].dt.year
    else:
        result["date"] = pd.NaT
        result["month"] = np.nan
        result["year"] = np.nan

    # AQI
    aqi_col = _find_col(df, AQI_COLS)
    if aqi_col:
        result["aqi"] = pd.to_numeric(df[aqi_col], errors="coerce").clip(0, 500)
    else:
        result["aqi"] = _compute_aqi_from_pollutants(df)

    # Individual pollutants
    for name, cols in [
        ("pm25", PM25_COLS), ("pm10", PM10_COLS),
        ("no2", NO2_COLS), ("so2", SO2_COLS),
        ("co", CO_COLS), ("o3", O3_COLS),
    ]:
        col = _find_col(df, cols)
        if col:
            result[name] = pd.to_numeric(df[col], errors="coerce")
        else:
            result[name] = np.nan

    # Drop rows with no AQI data at all
    result = result.dropna(subset=["aqi"]).copy()
    result["source_file"] = file_path.name

    return result


def ingest_all_aqi() -> pd.DataFrame:
    csv_files = list(RAW_AQI.glob("**/*.csv"))
    print(f"Found {len(csv_files)} AQI CSV files")

    all_frames = []
    for f in csv_files:
        df = ingest_aqi_file(f)
        if df is not None and not df.empty:
            all_frames.append(df)
            print(f"  Parsed {f.name}: {len(df)} rows, AQI range: {df['aqi'].min():.0f}-{df['aqi'].max():.0f}")

    if not all_frames:
        print("No AQI data found!")
        return pd.DataFrame()

    combined = pd.concat(all_frames, ignore_index=True)
    print(f"Combined AQI data: {len(combined)} rows")

    coord_pct = float(combined["latitude"].notna().mean() * 100) if "latitude" in combined.columns else 0.0
    print(f"Coordinate coverage: {coord_pct:.1f}%")

    factors = compute_aqi_factors(combined)
    if factors.empty:
        print("No spatial AQI factors could be computed!")
        return pd.DataFrame()

    output_path = PROCESSED_DIR / "aqi_grid.parquet"
    factors.to_parquet(output_path, index=False)
    print(f"Saved: {output_path} ({len(factors)} grid cells)")

    return factors


if __name__ == "__main__":
    ingest_all_aqi()
