"""
Central config loaded from .env via pydantic-settings.
Fail-fast: if required env vars are missing, the service won't start.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache
from pathlib import Path


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Service identity
    service_name: str = "yatrax-ml"
    model_version: str = "4.0.0"
    host: str = "0.0.0.0"
    port: int = 8000
    workers: int = 1
    log_level: str = "info"

    # Paths (relative to repo root — resolved in model loaders)
    models_dir: str = "models"
    data_processed_dir: str = "data/processed"

    # Scoring defaults for unknown grid cells
    # Conservative: unknown ≠ safe (per methodology §5.3)
    default_crime_rate: float = 50.0
    default_aqi: float = 75.0
    default_hospital_distance_km: float = 35.0
    default_weather_severity: float = 20.0

    # Trajectory forecaster
    trajectory_history_hours: int = 6
    trajectory_horizons: list[int] = [1, 3, 6]

    # Grid cell lookup
    grid_resolution_deg: float = 0.1


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
