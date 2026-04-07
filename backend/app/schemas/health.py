"""Response schemas for backend liveness and readiness endpoints.

These contracts stay small on purpose so operational checks remain easy to
consume from containers, scripts, or manual inspection.
"""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class HealthResponse(BaseModel):
    """Describe whether the API process itself is alive."""

    status: str
    service: str


class ReadyResponse(BaseModel):
    """Describe whether the API can currently serve requests with its dependencies."""

    status: str
    service: str
    environment: str
    database: str
    forecast_service_url: str
    timestamp: datetime
