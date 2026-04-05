from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from scripts.seed_demo_data import build_dataset, validate_dataset


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Validate the synthetic seed dataset generation rules.")
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--days", type=int, default=60)
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

    print("validation_status=ok")
    print(f"plants={len(dataset.plants)}")
    print(f"production_measurements={len(dataset.production_measurements)}")
    print(f"market_prices={len(dataset.market_prices)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
