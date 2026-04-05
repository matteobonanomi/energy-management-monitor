compose-up:
	docker compose up --build

compose-down:
	docker compose down

compose-config:
	docker compose config

migrate:
	docker compose run --rm api alembic upgrade head

seed:
	docker compose run --rm api python scripts/seed_demo_data.py --write-db --truncate

test-backend:
	docker compose run --rm api pytest tests
