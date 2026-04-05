from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.models import MARKET_SESSIONS, FORECAST_GRANULARITIES, Plant, ProductionMeasurement
from app.schemas.filters import DateRange, FilterPlantOption, FiltersResponse
from app.schemas.shared import TechnologyOption


class MetadataRepository:
    def get_filters(self, session: Session) -> FiltersResponse:
        plant_rows = session.execute(
            select(
                Plant.code,
                Plant.name,
                Plant.technology,
                Plant.market_zone,
                Plant.capacity_mw,
            ).order_by(Plant.technology, Plant.code)
        ).all()

        technologies = session.execute(select(Plant.technology).distinct().order_by(Plant.technology)).scalars().all()
        zones = session.execute(select(Plant.market_zone).distinct().order_by(Plant.market_zone)).scalars().all()
        min_max = session.execute(
            select(func.min(ProductionMeasurement.measured_at), func.max(ProductionMeasurement.measured_at))
        ).one()

        technology_labels = {
            "pv": "PV",
            "wind": "WIND",
            "hydro": "IDRO",
            "gas": "GAS",
        }

        return FiltersResponse(
            technologies=[
                TechnologyOption(code=item, label=technology_labels.get(item, item.upper()))
                for item in technologies
            ],
            market_zones=zones,
            market_sessions=list(MARKET_SESSIONS),
            granularities=list(FORECAST_GRANULARITIES),
            plants=[
                FilterPlantOption(
                    code=row.code,
                    name=row.name,
                    technology=row.technology,
                    market_zone=row.market_zone,
                    capacity_mw=float(row.capacity_mw),
                )
                for row in plant_rows
            ],
            date_range=DateRange(min_timestamp=min_max[0], max_timestamp=min_max[1]),
        )
