from __future__ import annotations

from app.schemas.events import UserActionEventsRequest, UserActionEventCreate
from app.services.user_action_service import UserActionService


class InMemoryUserActionRepository:
    def __init__(self, enabled: bool = True, fail: bool = False) -> None:
        self.enabled = enabled
        self.fail = fail
        self.documents: list[dict] = []

    def is_enabled(self) -> bool:
        return self.enabled

    def insert_events(self, documents: list[dict]) -> int:
        if self.fail:
            raise RuntimeError("mongo unavailable")
        self.documents.extend(documents)
        return len(documents)


def test_user_action_service_stores_enriched_documents() -> None:
    repository = InMemoryUserActionRepository()
    service = UserActionService(repository)

    response = service.track_events(
        UserActionEventsRequest(
            events=[
                UserActionEventCreate(
                    event_name="granularity_changed",
                    surface="header",
                    granularity="1h",
                    payload={"next_granularity": "1h"},
                )
            ]
        ),
        request_id="req-123",
        path="/events/actions",
        client_host="127.0.0.1",
        user_agent="pytest",
    )

    assert response.status == "stored"
    assert response.accepted_count == 1
    assert response.stored_count == 1
    assert repository.documents[0]["request"]["request_id"] == "req-123"
    assert repository.documents[0]["payload"]["next_granularity"] == "1h"


def test_user_action_service_skips_when_tracking_is_disabled() -> None:
    repository = InMemoryUserActionRepository(enabled=False)
    service = UserActionService(repository)

    response = service.track_events(
        UserActionEventsRequest(
            events=[UserActionEventCreate(event_name="theme_changed", surface="header")]
        ),
        request_id=None,
        path="/events/actions",
        client_host=None,
        user_agent=None,
    )

    assert response.status == "skipped"
    assert response.tracking_enabled is False
    assert response.stored_count == 0


def test_user_action_service_handles_repository_failures_gracefully() -> None:
    repository = InMemoryUserActionRepository(fail=True)
    service = UserActionService(repository)

    response = service.track_events(
        UserActionEventsRequest(
            events=[
                UserActionEventCreate(
                    event_name="forecast_run_completed",
                    surface="forecast_engine",
                    outcome="failed",
                )
            ]
        ),
        request_id="req-456",
        path="/events/actions",
        client_host="127.0.0.1",
        user_agent="pytest",
    )

    assert response.status == "failed"
    assert response.tracking_enabled is True
    assert response.stored_count == 0
