"""Shared schema fragments reused across backend endpoints.

These models reduce duplication and help keep timestamped series contracts
consistent between dashboard, forecast, and metadata responses.
"""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class TechnologyOption(BaseModel):
    """Represent technology labels once so filter payloads stay stable."""

    code: str
    label: str


class TimeSeriesPoint(BaseModel):
    """Provide a uniform point shape for historical and forecast series."""

    timestamp: datetime
    value: float


class NamedSeries(BaseModel):
    """Group points under one logical series key for chart-friendly responses."""

    key: str
    label: str
    points: list[TimeSeriesPoint]
