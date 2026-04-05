from __future__ import annotations

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.repositories.metadata_repository import MetadataRepository
from app.services.metadata_service import MetadataService
from tests.test_helpers import create_all_tables, populate_test_data


def build_session() -> Session:
    engine = create_engine(
        "sqlite://",
        future=True,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    create_all_tables(engine)
    session_factory = sessionmaker(bind=engine, expire_on_commit=False)
    session = session_factory()
    populate_test_data(session)
    return session


def test_metadata_service_returns_expected_filters() -> None:
    session = build_session()
    service = MetadataService(MetadataRepository())

    response = service.get_filters(session)

    assert len(response.plants) == 75
    assert [technology.code for technology in response.technologies] == ["gas", "hydro", "pv", "wind"]
    assert [technology.label for technology in response.technologies] == ["GAS", "IDRO", "PV", "WIND"]
    assert response.market_zones == ["EST", "NORD", "OVEST", "SUD"]
    assert response.market_sessions == ["MGP", "MI1", "MI2", "MI3"]
    assert response.granularities == ["15m", "1h"]
    assert response.date_range.min_timestamp is not None
    assert response.date_range.max_timestamp is not None
