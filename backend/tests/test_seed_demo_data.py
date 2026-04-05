from __future__ import annotations

from datetime import timedelta

from scripts.seed_demo_data import build_dataset, build_time_index, validate_dataset


def test_build_dataset_respects_required_counts() -> None:
    dataset = build_dataset(seed=42, days=2, start_date="2026-01-01")

    assert len(dataset.plants) == 75
    assert len(dataset.production_measurements) == 75 * 2 * 96
    assert len(dataset.market_prices) == 5 * 4 * 2 * 96

    errors = validate_dataset(dataset, expected_days=2)
    assert errors == []


def test_validation_detects_energy_conversion_mismatch() -> None:
    dataset = build_dataset(seed=42, days=1, start_date="2026-01-01")
    first_record = dataset.production_measurements[0]
    dataset.production_measurements[0] = first_record.__class__(
        plant_code=first_record.plant_code,
        measured_at=first_record.measured_at,
        power_mw=first_record.power_mw,
        energy_mwh=first_record.energy_mwh + 1,
        availability_pct=first_record.availability_pct,
    )

    errors = validate_dataset(dataset, expected_days=1)
    assert any("energy conversion" in error for error in errors)


def test_build_time_index_handles_dst_without_duplicates() -> None:
    timestamps = build_time_index(days=2, start_date="2026-03-29")

    assert len(timestamps) == 192
    assert len(set(timestamps)) == 192
    assert all(
        current - previous == timedelta(minutes=15)
        for previous, current in zip(timestamps, timestamps[1:])
    )
