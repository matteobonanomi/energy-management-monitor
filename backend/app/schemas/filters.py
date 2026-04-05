from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel

from app.schemas.shared import TechnologyOption


class DateRange(BaseModel):
    min_timestamp: datetime | None
    max_timestamp: datetime | None


class FilterPlantOption(BaseModel):
    code: str
    name: str
    technology: str
    market_zone: str
    capacity_mw: float


class FiltersResponse(BaseModel):
    technologies: list[TechnologyOption]
    market_zones: list[str]
    market_sessions: list[str]
    granularities: list[str]
    plants: list[FilterPlantOption]
    date_range: DateRange
