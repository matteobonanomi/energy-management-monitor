from __future__ import annotations

from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect


def test_alembic_upgrade_creates_expected_tables(tmp_path: Path) -> None:
    backend_dir = next(
        parent for parent in Path(__file__).resolve().parents if (parent / "alembic.ini").exists()
    )
    db_path = tmp_path / "migration-test.db"

    config = Config(str(backend_dir / "alembic.ini"))
    config.set_main_option("script_location", str(backend_dir / "alembic"))
    config.set_main_option("sqlalchemy.url", f"sqlite:///{db_path}")

    command.upgrade(config, "head")

    engine = create_engine(f"sqlite:///{db_path}")
    inspector = inspect(engine)
    table_names = set(inspector.get_table_names())

    assert table_names >= {
        "plants",
        "production_measurements",
        "market_prices",
        "forecast_runs",
        "forecast_values",
    }
