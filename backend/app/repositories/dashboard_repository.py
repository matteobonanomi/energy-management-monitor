from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from sqlalchemy import and_, case, distinct, func, literal, select
from sqlalchemy.orm import Session

from app.db.models import ForecastRun, ForecastValue, MarketPrice, Plant, ProductionMeasurement
from app.repositories.common import apply_price_filters, apply_production_filters, build_time_bucket
from app.schemas.dashboard import ActualForecastQueryFilters, DashboardQueryFilters, SeriesBreakdown


@dataclass(slots=True)
class SummaryMetrics:
    total_energy_mwh: float
    average_price_eur_mwh: float | None
    active_plants: int
    capture_price_eur_mwh: float | None
    daily_avg_price_eur_mwh: float | None
    weekly_avg_price_eur_mwh: float | None
    daily_avg_production_gwh: float
    active_plants_24h: int
    inactive_plants_24h: int
    renewables_share_pct_24h: float | None


@dataclass(slots=True)
class SeriesRow:
    bucket: datetime | str
    series_key: str
    value: float


@dataclass(slots=True)
class ForecastRunSnapshot:
    id: int
    scope: str
    target_code: str | None
    granularity: str
    horizon: str
    signal_type: str
    model_name: str
    fallback_used: bool
    status: str
    started_at: datetime
    completed_at: datetime | None
    metadata_json: dict | None


class DashboardRepository:
    def get_summary_metrics(self, session: Session, filters: DashboardQueryFilters) -> SummaryMetrics:
        summary_stmt = (
            select(
                func.coalesce(func.sum(ProductionMeasurement.energy_mwh), 0),
                func.count(distinct(ProductionMeasurement.plant_code)),
            )
            .select_from(ProductionMeasurement)
            .join(Plant, Plant.code == ProductionMeasurement.plant_code)
        )
        summary_stmt = apply_production_filters(summary_stmt, filters)
        total_energy, active_plants = session.execute(summary_stmt).one()

        filtered_zone_stmt = select(distinct(Plant.market_zone)).join(
            ProductionMeasurement, ProductionMeasurement.plant_code == Plant.code
        )
        filtered_zone_stmt = apply_production_filters(filtered_zone_stmt, filters)

        price_stmt = select(func.avg(MarketPrice.price_eur_mwh)).select_from(MarketPrice)
        price_stmt = apply_price_filters(price_stmt, filters)
        price_stmt = price_stmt.where(MarketPrice.market_zone.in_(filtered_zone_stmt))
        average_price = session.execute(price_stmt).scalar_one()

        capture_stmt = (
            select(
                func.sum(ProductionMeasurement.energy_mwh * MarketPrice.price_eur_mwh)
                / func.nullif(func.sum(ProductionMeasurement.energy_mwh), 0)
            )
            .select_from(ProductionMeasurement)
            .join(Plant, Plant.code == ProductionMeasurement.plant_code)
            .join(
                MarketPrice,
                and_(
                    MarketPrice.market_zone == Plant.market_zone,
                    MarketPrice.price_at == ProductionMeasurement.measured_at,
                    MarketPrice.market_session == filters.market_session,
                ),
            )
        )
        capture_stmt = apply_production_filters(capture_stmt, filters)
        capture_price = session.execute(capture_stmt).scalar_one()

        latest_production_timestamp = self._max_production_timestamp(session)
        latest_price_timestamp = self._max_price_timestamp(session) or latest_production_timestamp
        last_24h_start = latest_production_timestamp - timedelta(hours=24)
        last_24h_price_start = latest_price_timestamp - timedelta(hours=24)
        last_7d_start = latest_price_timestamp - timedelta(days=7)

        daily_production_filters = DashboardQueryFilters(
            technology=filters.technology,
            plant_code=filters.plant_code,
            market_zone=filters.market_zone,
            market_session=filters.market_session,
            date_from=last_24h_start,
            date_to=latest_production_timestamp,
            granularity=filters.granularity,
            breakdown_by="none",
        )
        weekly_price_filters = DashboardQueryFilters(
            technology=filters.technology,
            plant_code=filters.plant_code,
            market_zone=filters.market_zone,
            market_session=filters.market_session,
            date_from=last_7d_start,
            date_to=latest_price_timestamp,
            granularity=filters.granularity,
            breakdown_by="none",
        )
        daily_price_filters = DashboardQueryFilters(
            technology=filters.technology,
            plant_code=filters.plant_code,
            market_zone=filters.market_zone,
            market_session=filters.market_session,
            date_from=last_24h_price_start,
            date_to=latest_price_timestamp,
            granularity=filters.granularity,
            breakdown_by="none",
        )

        daily_production_stmt = (
            select(func.coalesce(func.sum(ProductionMeasurement.energy_mwh), 0))
            .select_from(ProductionMeasurement)
            .join(Plant, Plant.code == ProductionMeasurement.plant_code)
        )
        daily_production_stmt = apply_production_filters(daily_production_stmt, daily_production_filters)
        daily_production_mwh = float(session.execute(daily_production_stmt).scalar_one() or 0.0)

        active_24h_stmt = (
            select(func.count(distinct(ProductionMeasurement.plant_code)))
            .select_from(ProductionMeasurement)
            .join(Plant, Plant.code == ProductionMeasurement.plant_code)
            .where(ProductionMeasurement.energy_mwh > 0)
        )
        active_24h_stmt = apply_production_filters(active_24h_stmt, daily_production_filters)
        active_plants_24h = int(session.execute(active_24h_stmt).scalar_one() or 0)

        total_filtered_plants_stmt = select(func.count(Plant.id)).select_from(Plant)
        total_filtered_plants_stmt = self._apply_plant_filters(total_filtered_plants_stmt, filters)
        total_filtered_plants = int(session.execute(total_filtered_plants_stmt).scalar_one() or 0)

        renewable_share_stmt = (
            select(
                func.sum(
                    ProductionMeasurement.energy_mwh
                    * case(
                        (Plant.technology.in_(["pv", "wind", "hydro"]), 1),
                        else_=0,
                    )
                )
                / func.nullif(func.sum(ProductionMeasurement.energy_mwh), 0)
            )
            .select_from(ProductionMeasurement)
            .join(Plant, Plant.code == ProductionMeasurement.plant_code)
        )
        renewable_share_stmt = apply_production_filters(renewable_share_stmt, daily_production_filters)
        renewables_share = session.execute(renewable_share_stmt).scalar_one()

        daily_price_stmt = select(func.avg(MarketPrice.price_eur_mwh)).select_from(MarketPrice)
        daily_price_stmt = apply_price_filters(daily_price_stmt, daily_price_filters)
        daily_price_stmt = daily_price_stmt.where(MarketPrice.market_zone.in_(filtered_zone_stmt))
        daily_price = session.execute(daily_price_stmt).scalar_one()

        weekly_price_stmt = select(func.avg(MarketPrice.price_eur_mwh)).select_from(MarketPrice)
        weekly_price_stmt = apply_price_filters(weekly_price_stmt, weekly_price_filters)
        weekly_price_stmt = weekly_price_stmt.where(MarketPrice.market_zone.in_(filtered_zone_stmt))
        weekly_price = session.execute(weekly_price_stmt).scalar_one()

        return SummaryMetrics(
            total_energy_mwh=float(total_energy or 0.0),
            average_price_eur_mwh=float(average_price) if average_price is not None else None,
            active_plants=int(active_plants or 0),
            capture_price_eur_mwh=float(capture_price) if capture_price is not None else None,
            daily_avg_price_eur_mwh=float(daily_price) if daily_price is not None else None,
            weekly_avg_price_eur_mwh=float(weekly_price) if weekly_price is not None else None,
            daily_avg_production_gwh=daily_production_mwh / 1000,
            active_plants_24h=active_plants_24h,
            inactive_plants_24h=max(total_filtered_plants - active_plants_24h, 0),
            renewables_share_pct_24h=(float(renewables_share) * 100) if renewables_share is not None else None,
        )

    def get_production_series(self, session: Session, filters: DashboardQueryFilters) -> list[SeriesRow]:
        dialect_name = session.get_bind().dialect.name
        bucket = build_time_bucket(ProductionMeasurement.measured_at, filters.granularity, dialect_name)
        series_column = self._resolve_production_breakdown(filters.breakdown_by)

        stmt = (
            select(bucket, series_column.label("series_key"), func.sum(ProductionMeasurement.energy_mwh).label("value"))
            .select_from(ProductionMeasurement)
            .join(Plant, Plant.code == ProductionMeasurement.plant_code)
        )
        stmt = apply_production_filters(stmt, filters)
        stmt = stmt.group_by(bucket, series_column).order_by(bucket, series_column)

        return [SeriesRow(bucket=row.bucket, series_key=row.series_key, value=float(row.value)) for row in session.execute(stmt)]

    def get_price_series(self, session: Session, filters: DashboardQueryFilters) -> list[SeriesRow]:
        dialect_name = session.get_bind().dialect.name
        bucket = build_time_bucket(MarketPrice.price_at, filters.granularity, dialect_name)
        filtered_zone_stmt = select(distinct(Plant.market_zone)).join(
            ProductionMeasurement, ProductionMeasurement.plant_code == Plant.code
        )
        filtered_zone_stmt = apply_production_filters(filtered_zone_stmt, filters)
        if filters.breakdown_by == "market_zone":
            series_column = MarketPrice.market_zone
        else:
            series_column = literal(filters.market_session)

        stmt = select(bucket, series_column.label("series_key"), func.avg(MarketPrice.price_eur_mwh).label("value")).select_from(
            MarketPrice
        )
        stmt = apply_price_filters(stmt, filters)
        stmt = stmt.where(MarketPrice.market_zone.in_(filtered_zone_stmt))
        stmt = stmt.group_by(bucket, series_column).order_by(bucket, series_column)
        return [SeriesRow(bucket=row.bucket, series_key=row.series_key, value=float(row.value)) for row in session.execute(stmt)]

    def get_latest_matching_run(
        self,
        session: Session,
        filters: ActualForecastQueryFilters,
    ) -> ForecastRunSnapshot | None:
        if filters.forecast_run_id is not None:
            run = session.get(ForecastRun, filters.forecast_run_id)
            return self._to_run_snapshot(run) if run else None

        scope, target_code = self._resolve_forecast_scope(filters)
        stmt = (
            select(ForecastRun)
            .where(
                ForecastRun.scope == scope,
                ForecastRun.signal_type == "production",
                ForecastRun.status == "completed",
            )
            .order_by(ForecastRun.started_at.desc())
        )
        if target_code is None:
            stmt = stmt.where(ForecastRun.target_code.is_(None))
        else:
            stmt = stmt.where(ForecastRun.target_code == target_code)

        run = session.execute(stmt).scalars().first()
        return self._to_run_snapshot(run) if run else None

    def get_forecast_series(self, session: Session, run: ForecastRunSnapshot, granularity: str) -> list[SeriesRow]:
        dialect_name = session.get_bind().dialect.name
        bucket = build_time_bucket(ForecastValue.target_timestamp, granularity, dialect_name)

        stmt = (
            select(bucket, ForecastRun.scope.label("series_key"), func.sum(ForecastValue.value_mwh).label("value"))
            .select_from(ForecastValue)
            .join(ForecastRun, ForecastRun.id == ForecastValue.forecast_run_id)
            .where(ForecastValue.forecast_run_id == run.id)
            .group_by(bucket, ForecastRun.scope)
            .order_by(bucket)
        )
        return [SeriesRow(bucket=row.bucket, series_key=row.series_key, value=float(row.value)) for row in session.execute(stmt)]

    def get_actual_series_for_forecast(
        self,
        session: Session,
        filters: ActualForecastQueryFilters,
        run: ForecastRunSnapshot | None,
    ) -> list[SeriesRow]:
        metadata_first_target = None
        if run and run.metadata_json:
            metadata_first_target = run.metadata_json.get("first_target_timestamp")

        now_anchor = (
            datetime.fromisoformat(metadata_first_target)
            if isinstance(metadata_first_target, str)
            else run.started_at if run else self._max_production_timestamp(session)
        )
        actual_start = filters.date_from or (now_anchor - timedelta(hours=24))
        actual_end = filters.date_to or now_anchor

        derived_filters = DashboardQueryFilters(
            technology=filters.technology,
            plant_code=filters.plant_code,
            market_zone=filters.market_zone,
            market_session=filters.market_session,
            date_from=actual_start,
            date_to=actual_end,
            granularity=filters.granularity,
            breakdown_by="none",
        )
        return self.get_production_series(session, derived_filters)

    def _max_production_timestamp(self, session: Session) -> datetime:
        value = session.execute(select(func.max(ProductionMeasurement.measured_at))).scalar_one()
        if value is None:
            return datetime.now(timezone.utc)
        return value

    def _max_price_timestamp(self, session: Session) -> datetime | None:
        return session.execute(select(func.max(MarketPrice.price_at))).scalar_one()

    def _resolve_production_breakdown(self, breakdown_by: SeriesBreakdown):
        if breakdown_by == "technology":
            return Plant.technology
        if breakdown_by == "market_zone":
            return Plant.market_zone
        if breakdown_by == "plant_code":
            return Plant.code
        return literal("actual")

    def _apply_plant_filters(self, stmt, filters: DashboardQueryFilters):
        if filters.technology:
            stmt = stmt.where(Plant.technology.in_(filters.technology))
        if filters.plant_code:
            stmt = stmt.where(Plant.code.in_(filters.plant_code))
        if filters.market_zone:
            stmt = stmt.where(Plant.market_zone.in_(filters.market_zone))
        return stmt

    def _resolve_forecast_scope(self, filters: ActualForecastQueryFilters) -> tuple[str, str | None]:
        if len(filters.plant_code) == 1:
            return "plant", filters.plant_code[0]
        if len(filters.technology) == 1:
            return "technology", filters.technology[0]
        if len(filters.market_zone) == 1:
            return "zone", filters.market_zone[0]
        return "portfolio", None

    def _to_run_snapshot(self, run: ForecastRun | None) -> ForecastRunSnapshot | None:
        if run is None:
            return None
        return ForecastRunSnapshot(
            id=run.id,
            scope=run.scope,
            target_code=run.target_code,
            granularity=run.granularity,
            horizon=run.horizon,
            signal_type=run.signal_type,
            model_name=run.model_name,
            fallback_used=run.fallback_used,
            status=run.status,
            started_at=run.started_at,
            completed_at=run.completed_at,
            metadata_json=run.metadata_json,
        )
