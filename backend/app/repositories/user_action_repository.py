from __future__ import annotations

from functools import lru_cache
from typing import Any, Protocol

from pymongo import MongoClient

from app.core.settings import Settings, get_settings


class UserActionRepository(Protocol):
    def is_enabled(self) -> bool: ...

    def insert_events(self, documents: list[dict[str, Any]]) -> int: ...


class NoOpUserActionRepository:
    def is_enabled(self) -> bool:
        return False

    def insert_events(self, documents: list[dict[str, Any]]) -> int:
        return 0


class MongoUserActionRepository:
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
    return build_user_action_repository(get_settings())


def build_user_action_repository(settings: Settings) -> UserActionRepository:
    if not settings.mongo_enabled or not settings.mongo_url:
        return NoOpUserActionRepository()

    return MongoUserActionRepository(
        mongo_url=settings.mongo_url,
        database_name=settings.mongo_database,
        collection_name=settings.mongo_action_collection,
        app_name=settings.app_name,
    )
