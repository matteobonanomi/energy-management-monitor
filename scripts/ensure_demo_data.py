from __future__ import annotations

import sys
from pathlib import Path

from sqlalchemy import create_engine, func, inspect, select
from sqlalchemy.orm import Session

ROOT = Path(__file__).resolve().parents[1]
BACKEND_DIR = ROOT / "backend"

if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.core.settings import get_settings
from app.db.models import MarketPrice, Plant, ProductionMeasurement
from scripts.seed_demo_data import build_dataset, write_dataset_to_database

REQUIRED_TABLES = {
    "plants",
    "production_measurements",
    "market_prices",
    "forecast_runs",
    "forecast_values",
}


def missing_required_tables(engine) -> list[str]:
    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())
    return sorted(REQUIRED_TABLES - existing_tables)


def should_seed_database(engine) -> bool:
    with Session(engine) as session:
        plant_count = session.execute(select(func.count()).select_from(Plant)).scalar_one()
        production_count = session.execute(
            select(func.count()).select_from(ProductionMeasurement)
        ).scalar_one()
        price_count = session.execute(select(func.count()).select_from(MarketPrice)).scalar_one()

    return not all(count > 0 for count in (plant_count, production_count, price_count))


def ensure_demo_data(seed: int = 42, days: int = 60) -> str:
    settings = get_settings()
    engine = create_engine(settings.database_url, future=True)

    missing_tables = missing_required_tables(engine)
    if missing_tables:
        raise RuntimeError(
            f"database schema is incomplete; missing tables: {', '.join(missing_tables)}"
        )

    if not should_seed_database(engine):
        return "existing"

    dataset = build_dataset(seed=seed, days=days)
    write_dataset_to_database(dataset, truncate=True)
    return "seeded"


def main() -> int:
    result = ensure_demo_data()
    print(f"demo_data_status={result}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
