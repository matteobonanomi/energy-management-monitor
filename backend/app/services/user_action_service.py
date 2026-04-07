"""Service layer for resilient user action tracking.

Telemetry should never block the main demo flows, so this service treats
tracking as best-effort while preserving enough context for later analysis.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

import structlog

from app.repositories.user_action_repository import UserActionRepository
from app.schemas.events import (
    UserActionEventsRequest,
    UserActionTrackingResponse,
)

logger = structlog.get_logger(__name__)


class UserActionService:
    """Enrich and persist user action events with a non-blocking policy."""

    def __init__(self, repository: UserActionRepository) -> None:
        self._repository = repository

    def track_events(
        self,
        payload: UserActionEventsRequest,
        *,
        request_id: str | None,
        path: str,
        client_host: str | None,
        user_agent: str | None,
    ) -> UserActionTrackingResponse:
        """Store tracking events when possible and degrade safely when persistence is unavailable."""
        accepted_count = len(payload.events)
        documents = [
            {
                "event_name": event.event_name,
                "surface": event.surface,
                "outcome": event.outcome,
                "occurred_at": event.occurred_at,
                "received_at": datetime.now(UTC),
                "session_id": event.session_id,
                "user_role": event.user_role,
                "theme": event.theme,
                "granularity": event.granularity,
                "context": event.context,
                "payload": event.payload,
                "request": {
                    "request_id": request_id,
                    "path": path,
                    "client_host": client_host,
                    "user_agent": user_agent,
                },
            }
            for event in payload.events
        ]

        if not self._repository.is_enabled():
            logger.info(
                "user_action_tracking_skipped",
                accepted_count=accepted_count,
                reason="tracking_disabled",
            )
            return UserActionTrackingResponse(
                accepted_count=accepted_count,
                stored_count=0,
                tracking_enabled=False,
                status="skipped",
            )

        try:
            stored_count = self._repository.insert_events(documents)
        except Exception as exc:  # pragma: no cover - exercised via tests with a fake repo
            logger.warning(
                "user_action_tracking_failed",
                accepted_count=accepted_count,
                error=str(exc),
            )
            return UserActionTrackingResponse(
                accepted_count=accepted_count,
                stored_count=0,
                tracking_enabled=True,
                status="failed",
            )

        logger.info(
            "user_action_tracking_stored",
            accepted_count=accepted_count,
            stored_count=stored_count,
        )
        return UserActionTrackingResponse(
            accepted_count=accepted_count,
            stored_count=stored_count,
            tracking_enabled=True,
            status="stored",
        )
