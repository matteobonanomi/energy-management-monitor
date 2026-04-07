"""Schemas for dashboard bootstrap filters.

The frontend relies on these payloads to initialize filter state without
guessing backend-supported values.
"""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel

from app.schemas.shared import TechnologyOption


class DateRange(BaseModel):
    """Capture the available time span so the UI can constrain selections sensibly."""

    min_timestamp: datetime | None
    max_timestamp: datetime | None


class FilterPlantOption(BaseModel):
    """Expose plant metadata needed for filter pickers and labels."""

    code: str
    name: str
    technology: str
    market_zone: str
    capacity_mw: float


class FiltersResponse(BaseModel):
    """Bundle every filter dimension needed to bootstrap the dashboard once."""

    technologies: list[TechnologyOption]
    market_zones: list[str]
    market_sessions: list[str]
    granularities: list[str]
    plants: list[FilterPlantOption]
    date_range: DateRange
