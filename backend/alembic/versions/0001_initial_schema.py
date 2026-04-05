"""Initial relational schema for energy monitor demo."""

from alembic import op
import sqlalchemy as sa


revision = "0001_initial_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "plants",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("code", sa.String(length=32), nullable=False),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("technology", sa.String(length=16), nullable=False),
        sa.Column("market_zone", sa.String(length=16), nullable=False),
        sa.Column("capacity_mw", sa.Numeric(10, 3), nullable=False),
        sa.Column("latitude", sa.Numeric(8, 5), nullable=False),
        sa.Column("longitude", sa.Numeric(8, 5), nullable=False),
        sa.Column("commissioned_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.CheckConstraint("technology IN ('pv', 'wind', 'hydro', 'gas')", name="ck_plants_technology_allowed"),
        sa.CheckConstraint("market_zone IN ('ZONA_1', 'ZONA_2', 'ZONA_3', 'ZONA_4', 'ZONA_5')", name="ck_plants_market_zone_allowed"),
        sa.CheckConstraint("capacity_mw > 0", name="ck_plants_capacity_positive"),
        sa.CheckConstraint("latitude BETWEEN 37.0 AND 46.8", name="ck_plants_latitude_range"),
        sa.CheckConstraint("longitude BETWEEN 7.0 AND 18.5", name="ck_plants_longitude_range"),
        sa.UniqueConstraint("code", name="uq_plants_code"),
    )
    op.create_index("ix_plants_code", "plants", ["code"])
    op.create_index("ix_plants_market_zone", "plants", ["market_zone"])
    op.create_index("ix_plants_technology", "plants", ["technology"])

    op.create_table(
        "market_prices",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("market_zone", sa.String(length=16), nullable=False),
        sa.Column("market_session", sa.String(length=8), nullable=False),
        sa.Column("price_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("price_eur_mwh", sa.Numeric(12, 4), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.CheckConstraint("market_zone IN ('ZONA_1', 'ZONA_2', 'ZONA_3', 'ZONA_4', 'ZONA_5')", name="ck_market_prices_market_zone_allowed"),
        sa.CheckConstraint("market_session IN ('MGP', 'MI1', 'MI2', 'MI3')", name="ck_market_prices_market_session_allowed"),
        sa.CheckConstraint("price_eur_mwh >= 0", name="ck_market_prices_price_non_negative"),
        sa.UniqueConstraint("market_zone", "market_session", "price_at", name="uq_market_prices_market_zone"),
    )
    op.create_index("ix_market_prices_market_session", "market_prices", ["market_session"])
    op.create_index("ix_market_prices_market_zone", "market_prices", ["market_zone"])
    op.create_index("ix_market_prices_price_at", "market_prices", ["price_at"])

    op.create_table(
        "forecast_runs",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("scope", sa.String(length=16), nullable=False),
        sa.Column("target_code", sa.String(length=32), nullable=True),
        sa.Column("granularity", sa.String(length=8), nullable=False),
        sa.Column("horizon", sa.String(length=16), nullable=False),
        sa.Column("model_name", sa.String(length=64), nullable=False),
        sa.Column("fallback_used", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("status", sa.String(length=16), nullable=False, server_default=sa.text("'queued'")),
        sa.Column("metadata_json", sa.JSON(), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("scope IN ('plant', 'portfolio', 'technology', 'zone')", name="ck_forecast_runs_scope_allowed"),
        sa.CheckConstraint("granularity IN ('15m', '1h')", name="ck_forecast_runs_granularity_allowed"),
        sa.CheckConstraint("horizon IN ('next_24h', 'day_ahead')", name="ck_forecast_runs_horizon_allowed"),
        sa.CheckConstraint("status IN ('queued', 'running', 'completed', 'failed')", name="ck_forecast_runs_status_allowed"),
    )
    op.create_index("ix_forecast_runs_scope", "forecast_runs", ["scope"])
    op.create_index("ix_forecast_runs_target_code", "forecast_runs", ["target_code"])

    op.create_table(
        "production_measurements",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("plant_code", sa.String(length=32), nullable=False),
        sa.Column("measured_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("power_mw", sa.Numeric(12, 4), nullable=False),
        sa.Column("energy_mwh", sa.Numeric(12, 4), nullable=False),
        sa.Column("availability_pct", sa.Numeric(5, 2), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.CheckConstraint("power_mw >= 0", name="ck_production_measurements_power_non_negative"),
        sa.CheckConstraint("energy_mwh >= 0", name="ck_production_measurements_energy_non_negative"),
        sa.CheckConstraint("availability_pct BETWEEN 0 AND 100", name="ck_production_measurements_availability_range"),
        sa.ForeignKeyConstraint(["plant_code"], ["plants.code"], ondelete="CASCADE", name="fk_production_measurements_plant_code_plants"),
        sa.UniqueConstraint("plant_code", "measured_at", name="uq_production_measurements_plant_code"),
    )
    op.create_index("ix_production_measurements_measured_at", "production_measurements", ["measured_at"])
    op.create_index("ix_production_measurements_plant_code", "production_measurements", ["plant_code"])

    op.create_table(
        "forecast_values",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("forecast_run_id", sa.Integer(), nullable=False),
        sa.Column("target_timestamp", sa.DateTime(timezone=True), nullable=False),
        sa.Column("value_mwh", sa.Numeric(12, 4), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.CheckConstraint("value_mwh >= 0", name="ck_forecast_values_value_non_negative"),
        sa.ForeignKeyConstraint(["forecast_run_id"], ["forecast_runs.id"], ondelete="CASCADE", name="fk_forecast_values_forecast_run_id_forecast_runs"),
        sa.UniqueConstraint("forecast_run_id", "target_timestamp", name="uq_forecast_values_forecast_run_id"),
    )
    op.create_index("ix_forecast_values_forecast_run_id", "forecast_values", ["forecast_run_id"])
    op.create_index("ix_forecast_values_target_timestamp", "forecast_values", ["target_timestamp"])


def downgrade() -> None:
    op.drop_index("ix_forecast_values_target_timestamp", table_name="forecast_values")
    op.drop_index("ix_forecast_values_forecast_run_id", table_name="forecast_values")
    op.drop_table("forecast_values")

    op.drop_index("ix_production_measurements_plant_code", table_name="production_measurements")
    op.drop_index("ix_production_measurements_measured_at", table_name="production_measurements")
    op.drop_table("production_measurements")

    op.drop_index("ix_forecast_runs_target_code", table_name="forecast_runs")
    op.drop_index("ix_forecast_runs_scope", table_name="forecast_runs")
    op.drop_table("forecast_runs")

    op.drop_index("ix_market_prices_price_at", table_name="market_prices")
    op.drop_index("ix_market_prices_market_zone", table_name="market_prices")
    op.drop_index("ix_market_prices_market_session", table_name="market_prices")
    op.drop_table("market_prices")

    op.drop_index("ix_plants_technology", table_name="plants")
    op.drop_index("ix_plants_market_zone", table_name="plants")
    op.drop_index("ix_plants_code", table_name="plants")
    op.drop_table("plants")
