from __future__ import annotations

from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool

from scripts.ensure_demo_data import missing_required_tables, should_seed_database
from tests.test_helpers import create_all_tables, populate_test_data


def build_engine():
    return create_engine(
        "sqlite://",
        future=True,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )


def test_missing_required_tables_detects_uninitialized_database() -> None:
    engine = build_engine()

    missing = missing_required_tables(engine)

    assert "plants" in missing
    assert "forecast_runs" in missing


def test_should_seed_database_is_false_when_demo_data_exists() -> None:
    engine = build_engine()
    create_all_tables(engine)

    with engine.begin() as connection:
        pass

    session = None
    try:
        from sqlalchemy.orm import Session

        session = Session(engine)
        populate_test_data(session)
    finally:
        if session is not None:
            session.close()

    assert should_seed_database(engine) is False
