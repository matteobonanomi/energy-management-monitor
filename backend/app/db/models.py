from __future__ import annotations

from datetime import datetime

from sqlalchemy import JSON, Boolean, CheckConstraint, DateTime, ForeignKey, Numeric, String, UniqueConstraint, text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


TECHNOLOGIES = ("pv", "wind", "hydro", "gas")
MARKET_ZONES = ("ZONA_1", "ZONA_2", "ZONA_3", "ZONA_4", "ZONA_5")
MARKET_SESSIONS = ("MGP", "MI1", "MI2", "MI3")
FORECAST_SCOPES = ("plant", "portfolio", "technology", "zone")
FORECAST_GRANULARITIES = ("15m", "1h")
FORECAST_HORIZONS = ("next_24h", "day_ahead")
FORECAST_SIGNAL_TYPES = ("production", "price")
FORECAST_STATUSES = ("queued", "running", "completed", "failed")


def _in_clause(values: tuple[str, ...]) -> str:
    return ", ".join(f"'{value}'" for value in values)


class Plant(Base):
    __tablename__ = "plants"
    __table_args__ = (
        CheckConstraint(f"technology IN ({_in_clause(TECHNOLOGIES)})", name="technology_allowed"),
        CheckConstraint(f"market_zone IN ({_in_clause(MARKET_ZONES)})", name="market_zone_allowed"),
        CheckConstraint("capacity_mw > 0", name="capacity_positive"),
        CheckConstraint("latitude BETWEEN 37.0 AND 46.8", name="latitude_range"),
        CheckConstraint("longitude BETWEEN 7.0 AND 18.5", name="longitude_range"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    code: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(128))
    technology: Mapped[str] = mapped_column(String(16), index=True)
    market_zone: Mapped[str] = mapped_column(String(16), index=True)
    capacity_mw: Mapped[float] = mapped_column(Numeric(10, 3))
    latitude: Mapped[float] = mapped_column(Numeric(8, 5))
    longitude: Mapped[float] = mapped_column(Numeric(8, 5))
    commissioned_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, server_default=text("true"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=text("CURRENT_TIMESTAMP"),
        nullable=False,
    )


class ProductionMeasurement(Base):
    __tablename__ = "production_measurements"
    __table_args__ = (
        UniqueConstraint("plant_code", "measured_at"),
        CheckConstraint("power_mw >= 0", name="power_non_negative"),
        CheckConstraint("energy_mwh >= 0", name="energy_non_negative"),
        CheckConstraint("availability_pct BETWEEN 0 AND 100", name="availability_range"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    plant_code: Mapped[str] = mapped_column(
        String(32),
        ForeignKey("plants.code", ondelete="CASCADE"),
        index=True,
    )
    measured_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    power_mw: Mapped[float] = mapped_column(Numeric(12, 4))
    energy_mwh: Mapped[float] = mapped_column(Numeric(12, 4))
    availability_pct: Mapped[float] = mapped_column(Numeric(5, 2))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=text("CURRENT_TIMESTAMP"),
        nullable=False,
    )


class MarketPrice(Base):
    __tablename__ = "market_prices"
    __table_args__ = (
        UniqueConstraint("market_zone", "market_session", "price_at"),
        CheckConstraint(f"market_zone IN ({_in_clause(MARKET_ZONES)})", name="market_zone_allowed"),
        CheckConstraint(f"market_session IN ({_in_clause(MARKET_SESSIONS)})", name="market_session_allowed"),
        CheckConstraint("price_eur_mwh >= 0", name="price_non_negative"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    market_zone: Mapped[str] = mapped_column(String(16), index=True)
    market_session: Mapped[str] = mapped_column(String(8), index=True)
    price_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    price_eur_mwh: Mapped[float] = mapped_column(Numeric(12, 4))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=text("CURRENT_TIMESTAMP"),
        nullable=False,
    )


class ForecastRun(Base):
    __tablename__ = "forecast_runs"
    __table_args__ = (
        CheckConstraint(f"scope IN ({_in_clause(FORECAST_SCOPES)})", name="scope_allowed"),
        CheckConstraint(f"granularity IN ({_in_clause(FORECAST_GRANULARITIES)})", name="granularity_allowed"),
        CheckConstraint(f"horizon IN ({_in_clause(FORECAST_HORIZONS)})", name="horizon_allowed"),
        CheckConstraint(f"signal_type IN ({_in_clause(FORECAST_SIGNAL_TYPES)})", name="signal_type_allowed"),
        CheckConstraint(f"status IN ({_in_clause(FORECAST_STATUSES)})", name="status_allowed"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    scope: Mapped[str] = mapped_column(String(16), index=True)
    target_code: Mapped[str | None] = mapped_column(String(32), nullable=True, index=True)
    granularity: Mapped[str] = mapped_column(String(8))
    horizon: Mapped[str] = mapped_column(String(16))
    signal_type: Mapped[str] = mapped_column(
        String(16),
        index=True,
        server_default=text("'production'"),
        nullable=False,
    )
    model_name: Mapped[str] = mapped_column(String(64))
    fallback_used: Mapped[bool] = mapped_column(Boolean, server_default=text("false"), nullable=False)
    status: Mapped[str] = mapped_column(String(16), server_default=text("'queued'"), nullable=False)
    metadata_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=text("CURRENT_TIMESTAMP"),
        nullable=False,
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class ForecastValue(Base):
    __tablename__ = "forecast_values"
    __table_args__ = (
        UniqueConstraint("forecast_run_id", "target_timestamp"),
        CheckConstraint("value_mwh >= 0", name="value_non_negative"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    forecast_run_id: Mapped[int] = mapped_column(
        ForeignKey("forecast_runs.id", ondelete="CASCADE"),
        index=True,
    )
    target_timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    value_mwh: Mapped[float] = mapped_column(Numeric(12, 4))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=text("CURRENT_TIMESTAMP"),
        nullable=False,
    )
