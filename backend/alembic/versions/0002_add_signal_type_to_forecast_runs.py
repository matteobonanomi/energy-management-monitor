"""Add signal type to forecast runs for price and production runs."""

from alembic import op
import sqlalchemy as sa


revision = "0002_signal_type"
down_revision = "0001_initial_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("forecast_runs") as batch_op:
        batch_op.add_column(
            sa.Column(
                "signal_type",
                sa.String(length=16),
                nullable=False,
                server_default="production",
            )
        )
        batch_op.create_index("ix_forecast_runs_signal_type", ["signal_type"])
        batch_op.create_check_constraint(
            "ck_forecast_runs_signal_type_allowed",
            "signal_type IN ('production', 'price')",
        )


def downgrade() -> None:
    with op.batch_alter_table("forecast_runs") as batch_op:
        batch_op.drop_constraint("ck_forecast_runs_signal_type_allowed", type_="check")
        batch_op.drop_index("ix_forecast_runs_signal_type")
        batch_op.drop_column("signal_type")
