from __future__ import annotations

from datetime import timedelta, timezone

from sqlalchemy import insert
from sqlalchemy.orm import Session

from app.db.base import Base
from app.db.models import ForecastRun, ForecastValue, MarketPrice, Plant, ProductionMeasurement
from scripts.seed_demo_data import build_dataset


def populate_test_data(session: Session) -> None:
    dataset = build_dataset(seed=42, days=2, start_date="2026-01-01")

    session.execute(
        insert(Plant),
        [
            {
                "code": plant.code,
                "name": plant.name,
                "technology": plant.technology,
                "market_zone": plant.market_zone,
                "capacity_mw": plant.capacity_mw,
                "latitude": plant.latitude,
                "longitude": plant.longitude,
                "commissioned_at": plant.commissioned_at,
                "is_active": plant.is_active,
            }
            for plant in dataset.plants
        ],
    )
    session.execute(
        insert(MarketPrice),
        [
            {
                "market_zone": price.market_zone,
                "market_session": price.market_session,
                "price_at": price.price_at,
                "price_eur_mwh": price.price_eur_mwh,
            }
            for price in dataset.market_prices
        ],
    )
    session.execute(
        insert(ProductionMeasurement),
        [
            {
                "plant_code": record.plant_code,
                "measured_at": record.measured_at,
                "power_mw": record.power_mw,
                "energy_mwh": record.energy_mwh,
                "availability_pct": record.availability_pct,
            }
            for record in dataset.production_measurements
        ],
    )

    last_timestamp = dataset.timestamps[-1]
    run = ForecastRun(
        scope="portfolio",
        target_code=None,
        granularity="1h",
        horizon="next_24h",
        signal_type="production",
        model_name="naive_seasonal",
        fallback_used=True,
        status="completed",
        metadata_json={"source": "test"},
        started_at=last_timestamp + timedelta(minutes=15),
        completed_at=last_timestamp + timedelta(hours=1),
    )
    session.add(run)
    session.flush()

    current = (last_timestamp + timedelta(minutes=15)).replace(minute=0, second=0, microsecond=0)
    for index in range(24):
        session.add(
            ForecastValue(
                forecast_run_id=run.id,
                target_timestamp=(current + timedelta(hours=index)).astimezone(timezone.utc),
                value_mwh=100 + index,
            )
        )

    session.commit()


def create_all_tables(engine) -> None:
    Base.metadata.create_all(engine)
