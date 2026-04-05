from __future__ import annotations

import argparse
import csv
import math
import random
import sys
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta, timezone
from pathlib import Path
from typing import Iterable, Iterator
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
BACKEND_DIR = ROOT / "backend"

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

ROME_TZ = ZoneInfo("Europe/Rome")
MARKET_ZONES = ("NORD", "SUD", "EST", "OVEST")
MARKET_SESSIONS = ("MGP", "MI1", "MI2", "MI3")
TECHNOLOGY_COUNTS = {"pv": 50, "wind": 10, "hydro": 5, "gas": 10}
CITY_NAMES = (
    "Torino", "Milano", "Brescia", "Verona", "Padova", "Venezia", "Trieste", "Udine",
    "Bologna", "Parma", "Modena", "Ravenna", "Firenze", "Pisa", "Livorno", "Perugia",
    "Ancona", "Roma", "Latina", "Pescara", "Napoli", "Caserta", "Salerno", "Bari",
    "Taranto", "Lecce", "Potenza", "Cosenza", "Reggio Calabria", "Palermo", "Catania",
    "Messina", "Siracusa", "Cagliari", "Sassari", "Olbia", "Aosta", "Trento", "Bolzano",
    "Mantova", "Ferrara", "Forli", "Rimini", "Arezzo", "Siena", "Lucca", "Viterbo",
    "Frosinone", "Campobasso", "Isernia", "Foggia", "Brindisi", "Matera", "Catanzaro",
    "Trapani", "Agrigento", "Ragusa", "Nuoro", "Oristano", "Alessandria", "Novara",
    "Como", "Lecco", "Bergamo", "Vicenza", "Treviso", "Belluno", "Gorizia", "Pordenone",
    "Reggio Emilia", "Piacenza", "Prato", "Terni", "Ascoli", "Avellino", "Benevento",
)


@dataclass(slots=True)
class PlantRecord:
    code: str
    name: str
    technology: str
    market_zone: str
    capacity_mw: float
    latitude: float
    longitude: float
    commissioned_at: datetime
    is_active: bool


@dataclass(slots=True)
class ProductionRecord:
    plant_code: str
    measured_at: datetime
    power_mw: float
    energy_mwh: float
    availability_pct: float


@dataclass(slots=True)
class MarketPriceRecord:
    market_zone: str
    market_session: str
    price_at: datetime
    price_eur_mwh: float


@dataclass(slots=True)
class PlantState:
    profile_scale: float
    wind_state: float
    cloud_factor: float
    outage_remaining: int
    outage_scale: float
    gas_limit_remaining: int
    gas_limit_scale: float
    hydro_state: float
    hydro_regime_remaining: int
    hydro_regime_target: float


@dataclass(slots=True)
class SyntheticDataset:
    plants: list[PlantRecord]
    production_measurements: list[ProductionRecord]
    market_prices: list[MarketPriceRecord]
    timestamps: list[datetime]


def build_time_index(days: int, start_date: str | None = None) -> list[datetime]:
    if days <= 0:
        raise ValueError("days must be positive")

    periods = days * 96
    if start_date:
        start_utc = datetime.combine(date.fromisoformat(start_date), time.min, ROME_TZ).astimezone(timezone.utc)
    else:
        now_utc = datetime.now(timezone.utc).replace(second=0, microsecond=0)
        start_utc = now_utc - timedelta(minutes=15 * (periods - 1))
        start_utc = start_utc - timedelta(minutes=start_utc.minute % 15)

    return [start_utc + timedelta(minutes=15 * index) for index in range(periods)]


def _round(value: float, digits: int = 4) -> float:
    return round(value, digits)


def generate_plants(seed: int) -> list[PlantRecord]:
    rng = random.Random(seed)
    plants: list[PlantRecord] = []
    city_pool = list(CITY_NAMES)
    rng.shuffle(city_pool)
    city_index = 0

    def add_plants(technology: str, prefix: str, count: int, capacity_range: tuple[float, float]) -> None:
        nonlocal city_index
        for index in range(1, count + 1):
            commissioned_year = rng.randint(2004, 2023)
            commissioned_month = rng.randint(1, 12)
            commissioned_day = rng.randint(1, 28)
            city_name = city_pool[city_index % len(city_pool)]
            city_index += 1
            plants.append(
                PlantRecord(
                    code=f"{prefix}_{index:03d}",
                    name=f"{city_name} {technology.upper()} {index:03d}",
                    technology=technology,
                    market_zone=MARKET_ZONES[(index - 1) % len(MARKET_ZONES)],
                    capacity_mw=_round(rng.uniform(*capacity_range), 3),
                    latitude=_round(rng.uniform(37.0, 46.8), 5),
                    longitude=_round(rng.uniform(7.0, 18.5), 5),
                    commissioned_at=datetime(
                        commissioned_year,
                        commissioned_month,
                        commissioned_day,
                        tzinfo=timezone.utc,
                    ),
                    is_active=True,
                )
            )

    add_plants("pv", "PV", 50, (1.0, 30.0))
    add_plants("wind", "WND", 10, (10.0, 100.0))
    add_plants("hydro", "HDR", 5, (20.0, 250.0))
    add_plants("gas", "GAS", 10, (200.0, 800.0))
    return plants


def _initial_states(plants: list[PlantRecord], seed: int) -> dict[str, PlantState]:
    rng = random.Random(seed + 101)
    return {
        plant.code: PlantState(
            profile_scale=rng.uniform(0.9, 1.08),
            wind_state=rng.uniform(-0.15, 0.15),
            cloud_factor=rng.uniform(0.65, 0.95),
            outage_remaining=0,
            outage_scale=1.0,
            gas_limit_remaining=0,
            gas_limit_scale=1.0,
            hydro_state=rng.uniform(0.35, 0.72),
            hydro_regime_remaining=0,
            hydro_regime_target=rng.uniform(0.2, 0.8),
        )
        for plant in plants
    }


def _daylight_factor(hour_value: float, day_of_year: int) -> float:
    day_length = 12 + 4 * math.sin((2 * math.pi * (day_of_year - 80)) / 365.0)
    sunrise = 12 - day_length / 2
    sunset = 12 + day_length / 2
    if hour_value <= sunrise or hour_value >= sunset:
        return 0.0
    phase = (hour_value - sunrise) / day_length
    return math.sin(math.pi * phase) ** 1.6


def _demand_proxy(hour_value: float, is_weekend: bool) -> float:
    morning_peak = max(0.0, math.sin((math.pi * (hour_value - 6)) / 12))
    evening_peak = max(0.0, math.sin((math.pi * (hour_value - 16)) / 10))
    baseline = 0.35 if is_weekend else 0.5
    return baseline + 0.35 * morning_peak + 0.45 * evening_peak


def generate_production_measurements(
    plants: list[PlantRecord],
    timestamps: list[datetime],
    seed: int,
) -> list[ProductionRecord]:
    rng = random.Random(seed + 202)
    states = _initial_states(plants, seed)
    records: list[ProductionRecord] = []

    for plant in plants:
        state = states[plant.code]
        for point_index, timestamp in enumerate(timestamps):
            local_time = timestamp.astimezone(ROME_TZ)
            hour_value = local_time.hour + (local_time.minute / 60)
            day_of_year = local_time.timetuple().tm_yday
            is_weekend = local_time.weekday() >= 5

            if state.outage_remaining == 0 and rng.random() < 0.0015:
                state.outage_remaining = rng.randint(4, 24)
                state.outage_scale = rng.uniform(0.45, 0.88)

            if state.outage_remaining > 0:
                availability = rng.uniform(96.0, 99.5) * state.outage_scale
                state.outage_remaining -= 1
            else:
                availability = rng.uniform(97.0, 100.0)

            seasonal_factor = 0.85 + 0.12 * math.sin((2 * math.pi * (day_of_year - 30)) / 365.0)
            noise = rng.normalvariate(0, 0.018)

            if plant.technology == "pv":
                if point_index % 8 == 0:
                    state.cloud_factor = min(1.05, max(0.28, rng.betavariate(2.6, 2.1)))
                base_ratio = (
                    _daylight_factor(hour_value, day_of_year)
                    * state.cloud_factor
                    * seasonal_factor
                    * state.profile_scale
                )
            elif plant.technology == "wind":
                state.wind_state = 0.87 * state.wind_state + rng.normalvariate(0, 0.16)
                base_ratio = 0.42 + 0.24 * state.wind_state + 0.08 * math.sin(day_of_year / 8.0)
                base_ratio *= state.profile_scale
            elif plant.technology == "hydro":
                if state.hydro_regime_remaining == 0:
                    state.hydro_regime_remaining = rng.randint(96, 96 * 7)
                    regime_draw = rng.random()
                    if regime_draw < 0.18:
                        state.hydro_regime_target = rng.uniform(0.0, 0.08)
                    elif regime_draw < 0.42:
                        state.hydro_regime_target = rng.uniform(0.12, 0.28)
                    else:
                        state.hydro_regime_target = rng.uniform(0.42, 0.92)
                state.hydro_regime_remaining -= 1
                state.hydro_state = 0.985 * state.hydro_state + 0.015 * state.hydro_regime_target
                base_ratio = state.hydro_state + rng.normalvariate(0, 0.01)
                base_ratio *= (0.96 + 0.08 * seasonal_factor) * state.profile_scale
            else:
                if state.gas_limit_remaining == 0 and rng.random() < 0.002:
                    state.gas_limit_remaining = rng.choice((32, 64))
                    state.gas_limit_scale = rng.uniform(0.28, 0.62)
                if state.gas_limit_remaining > 0:
                    gas_limit_scale = state.gas_limit_scale
                    state.gas_limit_remaining -= 1
                else:
                    gas_limit_scale = 1.0
                demand = _demand_proxy(hour_value, is_weekend)
                base_ratio = (0.74 + 0.12 * demand + rng.normalvariate(0, 0.012)) * gas_limit_scale
                if is_weekend:
                    base_ratio *= 0.96
                base_ratio *= state.profile_scale

            bounded_ratio = min(1.0, max(0.0, base_ratio + noise))
            power_mw = min(plant.capacity_mw * 1.02, max(0.0, plant.capacity_mw * bounded_ratio * (availability / 100)))
            rounded_power_mw = _round(power_mw)
            rounded_energy_mwh = _round(rounded_power_mw * 0.25)

            records.append(
                ProductionRecord(
                    plant_code=plant.code,
                    measured_at=timestamp,
                    power_mw=rounded_power_mw,
                    energy_mwh=rounded_energy_mwh,
                    availability_pct=_round(availability, 2),
                )
            )

    return records


def generate_market_prices(timestamps: list[datetime], seed: int) -> list[MarketPriceRecord]:
    rng = random.Random(seed + 303)
    zone_bases = {
        "NORD": 86.0,
        "SUD": 78.0,
        "EST": 81.5,
        "OVEST": 83.5,
    }
    session_premiums = {"MGP": 0.0, "MI1": 3.5, "MI2": 6.0, "MI3": 8.5}
    session_volatility = {"MGP": 1.8, "MI1": 2.5, "MI2": 3.2, "MI3": 4.2}
    state: dict[tuple[str, str], float] = {
        (zone, session): rng.uniform(-1.0, 1.0)
        for zone in MARKET_ZONES
        for session in MARKET_SESSIONS
    }
    prices: list[MarketPriceRecord] = []

    for zone in MARKET_ZONES:
        for session in MARKET_SESSIONS:
            for timestamp in timestamps:
                local_time = timestamp.astimezone(ROME_TZ)
                hour_value = local_time.hour + (local_time.minute / 60)
                is_weekend = local_time.weekday() >= 5

                state[(zone, session)] = 0.76 * state[(zone, session)] + rng.normalvariate(0, session_volatility[session])
                intraday = 5.5 * _demand_proxy(hour_value, is_weekend)
                weekend_effect = -4.5 if is_weekend else 0.0
                spike = rng.uniform(18.0, 42.0) if rng.random() < 0.0018 else 0.0
                value = (
                    zone_bases[zone]
                    + session_premiums[session]
                    + intraday
                    + weekend_effect
                    + state[(zone, session)]
                    + spike
                )

                prices.append(
                    MarketPriceRecord(
                        market_zone=zone,
                        market_session=session,
                        price_at=timestamp,
                        price_eur_mwh=_round(max(10.0, value)),
                    )
                )

    return prices


def build_dataset(seed: int = 42, days: int = 60, start_date: str | None = None) -> SyntheticDataset:
    timestamps = build_time_index(days=days, start_date=start_date)
    plants = generate_plants(seed=seed)
    production_measurements = generate_production_measurements(plants=plants, timestamps=timestamps, seed=seed)
    market_prices = generate_market_prices(timestamps=timestamps, seed=seed)
    return SyntheticDataset(
        plants=plants,
        production_measurements=production_measurements,
        market_prices=market_prices,
        timestamps=timestamps,
    )


def validate_dataset(dataset: SyntheticDataset, expected_days: int) -> list[str]:
    errors: list[str] = []

    by_technology: dict[str, int] = {}
    for plant in dataset.plants:
        by_technology[plant.technology] = by_technology.get(plant.technology, 0) + 1

    if by_technology != TECHNOLOGY_COUNTS:
        errors.append(f"unexpected plant counts: {by_technology}")

    for plant in dataset.plants:
        if plant.technology == "pv" and not (1.0 <= plant.capacity_mw <= 30.0):
            errors.append(f"pv capacity out of range for {plant.code}")
        if plant.technology == "wind" and not (10.0 <= plant.capacity_mw <= 100.0):
            errors.append(f"wind capacity out of range for {plant.code}")
        if plant.technology == "gas" and not (200.0 <= plant.capacity_mw <= 800.0):
            errors.append(f"gas capacity out of range for {plant.code}")

    expected_measurements = len(dataset.plants) * expected_days * 96
    if len(dataset.production_measurements) != expected_measurements:
        errors.append(
            f"unexpected measurement count: {len(dataset.production_measurements)} != {expected_measurements}"
        )

    expected_prices = len(MARKET_ZONES) * len(MARKET_SESSIONS) * expected_days * 96
    if len(dataset.market_prices) != expected_prices:
        errors.append(f"unexpected price count: {len(dataset.market_prices)} != {expected_prices}")

    if len(set(dataset.timestamps)) != len(dataset.timestamps):
        errors.append("timestamp index contains duplicates")

    for previous, current in zip(dataset.timestamps, dataset.timestamps[1:]):
        if current - previous != timedelta(minutes=15):
            errors.append("timestamp index is not continuous at 15m granularity")
            break

    for record in dataset.production_measurements:
        if record.power_mw < 0 or record.energy_mwh < 0:
            errors.append("negative production value detected")
            break
        if not math.isclose(record.energy_mwh, round(record.power_mw * 0.25, 4), abs_tol=1e-4):
            errors.append("energy conversion mismatch detected")
            break

    coverage = {
        (price.market_zone, price.market_session, price.price_at)
        for price in dataset.market_prices
    }
    if len(coverage) != expected_prices:
        errors.append("market price coverage is incomplete")

    return errors


def _chunked(rows: Iterable[dict], chunk_size: int = 5000) -> Iterator[list[dict]]:
    chunk: list[dict] = []
    for row in rows:
        chunk.append(row)
        if len(chunk) >= chunk_size:
            yield chunk
            chunk = []
    if chunk:
        yield chunk


def _plant_rows(plants: list[PlantRecord]) -> Iterator[dict]:
    for plant in plants:
        yield {
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


def _production_rows(records: list[ProductionRecord]) -> Iterator[dict]:
    for record in records:
        yield {
            "plant_code": record.plant_code,
            "measured_at": record.measured_at,
            "power_mw": record.power_mw,
            "energy_mwh": record.energy_mwh,
            "availability_pct": record.availability_pct,
        }


def _price_rows(records: list[MarketPriceRecord]) -> Iterator[dict]:
    for record in records:
        yield {
            "market_zone": record.market_zone,
            "market_session": record.market_session,
            "price_at": record.price_at,
            "price_eur_mwh": record.price_eur_mwh,
        }


def export_dataset_to_csv(dataset: SyntheticDataset, export_dir: Path) -> None:
    export_dir.mkdir(parents=True, exist_ok=True)

    with (export_dir / "plants.csv").open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=["code", "name", "technology", "market_zone", "capacity_mw", "latitude", "longitude", "commissioned_at", "is_active"],
        )
        writer.writeheader()
        writer.writerows(_plant_rows(dataset.plants))

    with (export_dir / "production_measurements.csv").open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=["plant_code", "measured_at", "power_mw", "energy_mwh", "availability_pct"],
        )
        writer.writeheader()
        writer.writerows(_production_rows(dataset.production_measurements))

    with (export_dir / "market_prices.csv").open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=["market_zone", "market_session", "price_at", "price_eur_mwh"],
        )
        writer.writeheader()
        writer.writerows(_price_rows(dataset.market_prices))


def write_dataset_to_database(dataset: SyntheticDataset, truncate: bool) -> None:
    from sqlalchemy import create_engine, delete, insert

    from app.core.settings import get_settings
    from app.db.models import ForecastRun, ForecastValue, MarketPrice, Plant, ProductionMeasurement

    engine = create_engine(get_settings().database_url, future=True)
    if engine.dialect.name == "postgresql":
        _write_dataset_to_postgres(engine, dataset, truncate)
        return

    with engine.begin() as connection:
        if truncate:
            for model in (ForecastValue, ForecastRun, ProductionMeasurement, MarketPrice, Plant):
                connection.execute(delete(model))

        for chunk in _chunked(_plant_rows(dataset.plants)):
            connection.execute(insert(Plant), chunk)
        for chunk in _chunked(_price_rows(dataset.market_prices)):
            connection.execute(insert(MarketPrice), chunk)
        for chunk in _chunked(_production_rows(dataset.production_measurements)):
            connection.execute(insert(ProductionMeasurement), chunk)


def _write_dataset_to_postgres(engine, dataset: SyntheticDataset, truncate: bool) -> None:
    from sqlalchemy import delete

    from app.db.models import ForecastRun, ForecastValue, MarketPrice, Plant, ProductionMeasurement

    with engine.begin() as connection:
        if truncate:
            for model in (ForecastValue, ForecastRun, ProductionMeasurement, MarketPrice, Plant):
                connection.execute(delete(model))

    raw_connection = engine.raw_connection()
    try:
        with raw_connection.cursor() as cursor:
            with cursor.copy(
                "COPY plants (code, name, technology, market_zone, capacity_mw, latitude, longitude, commissioned_at, is_active) FROM STDIN"
            ) as copy:
                for row in _plant_rows(dataset.plants):
                    copy.write_row(
                        (
                            row["code"],
                            row["name"],
                            row["technology"],
                            row["market_zone"],
                            row["capacity_mw"],
                            row["latitude"],
                            row["longitude"],
                            row["commissioned_at"],
                            row["is_active"],
                        )
                    )

            with cursor.copy(
                "COPY market_prices (market_zone, market_session, price_at, price_eur_mwh) FROM STDIN"
            ) as copy:
                for row in _price_rows(dataset.market_prices):
                    copy.write_row(
                        (
                            row["market_zone"],
                            row["market_session"],
                            row["price_at"],
                            row["price_eur_mwh"],
                        )
                    )

            with cursor.copy(
                "COPY production_measurements (plant_code, measured_at, power_mw, energy_mwh, availability_pct) FROM STDIN"
            ) as copy:
                for row in _production_rows(dataset.production_measurements):
                    copy.write_row(
                        (
                            row["plant_code"],
                            row["measured_at"],
                            row["power_mw"],
                            row["energy_mwh"],
                            row["availability_pct"],
                        )
                    )

        raw_connection.commit()
    finally:
        raw_connection.close()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate demo synthetic dataset for the energy monitor.")
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--days", type=int, default=60)
    parser.add_argument("--write-db", action="store_true")
    parser.add_argument("--export-csv", type=Path)
    parser.add_argument("--truncate", action="store_true")
    parser.add_argument("--start-date", type=str)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    dataset = build_dataset(seed=args.seed, days=args.days, start_date=args.start_date)
    errors = validate_dataset(dataset, expected_days=args.days)

    if errors:
        for error in errors:
            print(f"validation_error: {error}")
        return 1

    if args.export_csv:
        export_dataset_to_csv(dataset, export_dir=args.export_csv)
        print(f"csv_exported_to={args.export_csv}")

    if args.write_db:
        write_dataset_to_database(dataset, truncate=args.truncate)
        print("database_seed_completed=true")

    print(f"plants={len(dataset.plants)}")
    print(f"production_measurements={len(dataset.production_measurements)}")
    print(f"market_prices={len(dataset.market_prices)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
