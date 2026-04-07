"""Metadata endpoints used to bootstrap dashboard filters.

Keeping this route separate from dashboard data avoids coupling filter
discovery to heavier analytical queries.
"""

from __future__ import annotations

from fastapi import APIRouter

from app.api.dependencies import DbSession
from app.schemas.filters import FiltersResponse
from app.services.metadata_service import MetadataService

router = APIRouter(tags=["metadata"])


@router.get("/filters", response_model=FiltersResponse)
def get_filters(session: DbSession) -> FiltersResponse:
    """Return UI filter metadata from the canonical backend sources."""
    return MetadataService().get_filters(session)
