from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import Select, String, cast, func
from sqlalchemy.sql.elements import ColumnElement

from app.db.models import MarketPrice, Plant, ProductionMeasurement
from app.schemas.dashboard import DashboardQueryFilters


def normalize_timestamp(value: datetime | str) -> datetime:
    if isinstance(value, datetime):
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)

    normalized = value.replace(" ", "T")
    parsed = datetime.fromisoformat(normalized)
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def build_time_bucket(
    column: ColumnElement[datetime],
    granularity: str,
    dialect_name: str,
) -> ColumnElement:
    if granularity == "15m":
        return column.label("bucket")
    if dialect_name == "sqlite":
        return func.strftime("%Y-%m-%dT%H:00:00", column).label("bucket")
    return cast(func.date_trunc("hour", column), String).label("bucket")


def apply_production_filters(
    stmt: Select,
    filters: DashboardQueryFilters,
) -> Select:
    if filters.technology:
        stmt = stmt.where(Plant.technology.in_(filters.technology))
    if filters.plant_code:
        stmt = stmt.where(Plant.code.in_(filters.plant_code))
    if filters.market_zone:
        stmt = stmt.where(Plant.market_zone.in_(filters.market_zone))
    if filters.date_from:
        stmt = stmt.where(ProductionMeasurement.measured_at >= filters.date_from)
    if filters.date_to:
        stmt = stmt.where(ProductionMeasurement.measured_at <= filters.date_to)
    return stmt


def apply_price_filters(
    stmt: Select,
    filters: DashboardQueryFilters,
) -> Select:
    stmt = stmt.where(MarketPrice.market_session == filters.market_session)
    if filters.market_zone:
        stmt = stmt.where(MarketPrice.market_zone.in_(filters.market_zone))
    if filters.date_from:
        stmt = stmt.where(MarketPrice.price_at >= filters.date_from)
    if filters.date_to:
        stmt = stmt.where(MarketPrice.price_at <= filters.date_to)
    return stmt
