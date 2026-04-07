"""Endpoints for non-blocking user action tracking.

Tracking is isolated from the rest of the API surface so telemetry concerns
can fail independently without affecting dashboard and forecast flows.
"""

from __future__ import annotations

from fastapi import APIRouter, Request
from structlog.contextvars import get_contextvars

from app.api.dependencies import UserActionTracker
from app.schemas.events import UserActionEventsRequest, UserActionTrackingResponse

router = APIRouter(prefix="/events", tags=["events"])


@router.post("/actions", response_model=UserActionTrackingResponse)
def track_user_actions(
    payload: UserActionEventsRequest,
    request: Request,
    tracker: UserActionTracker,
) -> UserActionTrackingResponse:
    """Enrich client events with request context before handing them to the tracker."""
    context = get_contextvars()
    return tracker.track_events(
        payload,
        request_id=context.get("request_id") or request.headers.get("x-request-id"),
        path=request.url.path,
        client_host=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
