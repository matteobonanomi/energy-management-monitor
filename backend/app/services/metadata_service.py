from __future__ import annotations

import structlog
from sqlalchemy.orm import Session

from app.repositories.metadata_repository import MetadataRepository
from app.schemas.filters import FiltersResponse

logger = structlog.get_logger(__name__)


class MetadataService:
    def __init__(self, repository: MetadataRepository | None = None) -> None:
        self.repository = repository or MetadataRepository()

    def get_filters(self, session: Session) -> FiltersResponse:
        response = self.repository.get_filters(session)
        logger.info(
            "filters_loaded",
            plants=len(response.plants),
            technologies=len(response.technologies),
        )
        return response
