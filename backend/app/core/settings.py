"""Centralized settings for backend runtime dependencies.

Keeping configuration in one model makes local bootstrap predictable and
reduces the risk of different modules interpreting environment variables in
different ways.
"""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Expose backend configuration through a validated, typed contract."""

    app_name: str = "energy-monitor-api"
    app_env: str = "local"
    log_level: str = "INFO"
    database_url: str = "postgresql+psycopg://energy_user:energy_pass@postgres:5432/energy_monitor"
    forecast_service_url: str = "http://forecast-service:8001"
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    mongo_enabled: bool = False
    mongo_url: str | None = None
    mongo_database: str = "energy_monitor"
    mongo_action_collection: str = "user_action_events"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_prefix="",
        extra="ignore",
    )

    def cors_origin_list(self) -> list[str]:
        """Normalize CORS origins once so middleware setup stays deterministic."""
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    """Reuse a single settings instance to avoid configuration drift per request."""
    return Settings()
