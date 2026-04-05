"""Reset synthetic demo data and align market zones to cardinal values."""

from alembic import op
import sqlalchemy as sa


revision = "0003_market_zones"
down_revision = "0002_signal_type"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Demo-only repository: reset synthetic data so the next bootstrap reseeds
    # everything with the updated zone taxonomy.
    op.execute(sa.text("DELETE FROM forecast_values"))
    op.execute(sa.text("DELETE FROM forecast_runs"))
    op.execute(sa.text("DELETE FROM production_measurements"))
    op.execute(sa.text("DELETE FROM market_prices"))
    op.execute(sa.text("DELETE FROM plants"))

    with op.batch_alter_table("plants") as batch_op:
        batch_op.drop_constraint("ck_plants_market_zone_allowed", type_="check")
        batch_op.create_check_constraint(
            "ck_plants_market_zone_allowed",
            "market_zone IN ('NORD', 'SUD', 'EST', 'OVEST')",
        )

    with op.batch_alter_table("market_prices") as batch_op:
        batch_op.drop_constraint("ck_market_prices_market_zone_allowed", type_="check")
        batch_op.create_check_constraint(
            "ck_market_prices_market_zone_allowed",
            "market_zone IN ('NORD', 'SUD', 'EST', 'OVEST')",
        )


def downgrade() -> None:
    op.execute(sa.text("DELETE FROM forecast_values"))
    op.execute(sa.text("DELETE FROM forecast_runs"))
    op.execute(sa.text("DELETE FROM production_measurements"))
    op.execute(sa.text("DELETE FROM market_prices"))
    op.execute(sa.text("DELETE FROM plants"))

    with op.batch_alter_table("market_prices") as batch_op:
        batch_op.drop_constraint("ck_market_prices_market_zone_allowed", type_="check")
        batch_op.create_check_constraint(
            "ck_market_prices_market_zone_allowed",
            "market_zone IN ('ZONA_1', 'ZONA_2', 'ZONA_3', 'ZONA_4', 'ZONA_5')",
        )

    with op.batch_alter_table("plants") as batch_op:
        batch_op.drop_constraint("ck_plants_market_zone_allowed", type_="check")
        batch_op.create_check_constraint(
            "ck_plants_market_zone_allowed",
            "market_zone IN ('ZONA_1', 'ZONA_2', 'ZONA_3', 'ZONA_4', 'ZONA_5')",
        )
