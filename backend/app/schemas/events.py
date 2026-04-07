"""Schemas for user action tracking.

Telemetry payloads are modeled separately so the main product APIs do not
need to couple themselves to MongoDB or analytics-specific fields.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


TrackingStatus = Literal["stored", "skipped", "failed"]
TrackingOutcome = Literal["changed", "attempted", "succeeded", "failed"]


class UserActionEventCreate(BaseModel):
    """Define one tracked user action before backend enrichment adds request context."""

    event_name: str = Field(min_length=3, max_length=100)
    surface: str = Field(min_length=2, max_length=80)
    outcome: TrackingOutcome = "changed"
    occurred_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    session_id: str | None = Field(default=None, max_length=120)
    user_role: str | None = Field(default=None, max_length=64)
    theme: str | None = Field(default=None, max_length=32)
    granularity: str | None = Field(default=None, max_length=16)
    context: dict[str, Any] | None = None
    payload: dict[str, Any] | None = None


class UserActionEventsRequest(BaseModel):
    """Batch tracked events so the frontend can report interactions efficiently."""

    events: list[UserActionEventCreate] = Field(min_length=1, max_length=50)


class UserActionTrackingResponse(BaseModel):
    """Describe how the backend handled a tracking batch without blocking the caller."""

    accepted_count: int
    stored_count: int
    tracking_enabled: bool
    status: TrackingStatus
