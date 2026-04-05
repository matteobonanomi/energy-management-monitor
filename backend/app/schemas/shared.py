from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class TechnologyOption(BaseModel):
    code: str
    label: str


class TimeSeriesPoint(BaseModel):
    timestamp: datetime
    value: float


class NamedSeries(BaseModel):
    key: str
    label: str
    points: list[TimeSeriesPoint]
