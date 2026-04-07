"""Telemetry storage abstractions for user action tracking.

Tracking persistence is optional in local environments, so the repository
layer hides whether events are stored or intentionally skipped.
"""

from __future__ import annotations

from functools import lru_cache
from typing import Any, Protocol

from pymongo import MongoClient

from app.core.settings import Settings, get_settings


class UserActionRepository(Protocol):
    """Describe the tracking persistence contract independent of MongoDB."""

    def is_enabled(self) -> bool: ...

    def insert_events(self, documents: list[dict[str, Any]]) -> int: ...


class NoOpUserActionRepository:
    """Provide a safe fallback when tracking is disabled for the environment."""

    def is_enabled(self) -> bool:
        return False

    def insert_events(self, documents: list[dict[str, Any]]) -> int:
        return 0


class MongoUserActionRepository:
    """Store user actions in MongoDB without leaking driver details upward."""

    def __init__(
        self,
        *,
        mongo_url: str,
        database_name: str,
        collection_name: str,
        app_name: str,
    ) -> None:
        self._client = MongoClient(
            mongo_url,
            appname=app_name,
            serverSelectionTimeoutMS=1_500,
            connectTimeoutMS=1_500,
        )
        self._collection = self._client[database_name][collection_name]

    def is_enabled(self) -> bool:
        return True

    def insert_events(self, documents: list[dict[str, Any]]) -> int:
        if not documents:
            return 0
        result = self._collection.insert_many(documents, ordered=False)
        return len(result.inserted_ids)


@lru_cache
def get_user_action_repository() -> UserActionRepository:
    """Cache the tracking repository so request handling does not rebuild clients."""
    return build_user_action_repository(get_settings())


def build_user_action_repository(settings: Settings) -> UserActionRepository:
    """Choose the least risky tracking backend for the current environment."""
    if not settings.mongo_enabled or not settings.mongo_url:
        return NoOpUserActionRepository()

    return MongoUserActionRepository(
        mongo_url=settings.mongo_url,
        database_name=settings.mongo_database,
        collection_name=settings.mongo_action_collection,
        app_name=settings.app_name,
    )
