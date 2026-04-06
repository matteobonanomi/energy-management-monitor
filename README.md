# EnergyMonitor

EnergyMonitor is a local demo for monitoring synthetic energy-market prices and plant production, with on-demand forecasting, structured logging, and user-event tracking persisted in MongoDB.

## Current product shape

The application runs as a React dashboard with two user profiles:

- `Portfolio Manager`
- `Data Analyst`

The global header includes:

- `Profile`
- `Theme`
- `Granularity`

The `Portfolio Manager` view uses a `2x2` grid:

- top-left: `Price monitor`
- top-right: `Energy monitor`
- bottom-left: `Portfolio KPIs`
- bottom-right: `Forecast Engine`

The `Data Analyst` view uses:

- a merged top panel called `Price-Plant chart`
- a configurable `6-slot` KPI area in the lower-left panel
- the same `Forecast Engine` in the lower-right panel, with extra model options and advanced settings

Forecast outputs are drawn directly on the charts with a dashed line to keep actual and forecast clearly separated.

## Architecture

```text
┌──────────────────────────────┐
│ Frontend                     │
│ React + TypeScript + Vite    │
│ http://localhost:5173        │
└───────────────┬──────────────┘
                │ REST
                ▼
┌──────────────────────────────┐
│ API                          │
│ FastAPI + SQLAlchemy 2.0     │
│ http://localhost:8000        │
└───────────┬───────────┬──────┘
            │           │
            │           │ Forecast orchestration
            │           ▼
            │   ┌──────────────────────────┐
            │   │ Forecast Service         │
            │   │ FastAPI + ARIMA/Prophet  │
            │   │ + RF/GB + fallback       │
            │   │ http://localhost:8001    │
            │   └──────────────────────────┘
            │
            │ SQL persistence and queries
            ▼
┌──────────────────────────────┐
│ PostgreSQL                   │
│ prices, plant master data,   │
│ production, forecast runs    │
└──────────────────────────────┘

            API event tracking
                    │
                    ▼
┌──────────────────────────────┐
│ MongoDB                      │
│ user action events           │
│ future session traceability  │
└──────────────────────────────┘
```

## Main runtime flow

1. The frontend fetches filters, summary data, and time series from the API.
2. The API reads source data from PostgreSQL and aggregates it at `15m` or `1h`.
3. The user launches a forecast from the `Forecast Engine`.
4. The API builds the requested historical signal, calls the forecast microservice, persists forecast runs, and returns the result.
5. The frontend overlays the forecast on the existing charts.
6. Main user actions are posted to `POST /events/actions` and stored in MongoDB.

## Docker compose services

- `frontend`: Vite UI on `http://localhost:5173`
- `api`: FastAPI backend on `http://localhost:8000`
- `forecast-service`: forecasting microservice on `http://localhost:8001`
- `postgres`: relational database on `localhost:5432`
- `mongo`: non-relational event store on `localhost:27017`

## Quick start

```bash
cp .env.example .env
docker compose up --build
```

On startup, the API automatically runs:

- `alembic upgrade head`
- demo-data bootstrap if the relational database is empty

Manual equivalents:

```bash
docker compose run --rm api alembic upgrade head
docker compose run --rm api python scripts/seed_demo_data.py --write-db --truncate
docker compose run --rm api python scripts/validate_seed.py --days 60
```

## Synthetic dataset

Current demo characteristics:

- `60 days` of history
- `15m` source frequency
- `50 pv`, `10 wind`, `5 hydro`, `10 gas`
- separate price and production tables
- full plant master data with:
  - plant name
  - unique plant code
  - market zone
  - technology
  - nominal power
- hourly aggregation derived at query time
- plausibility and coverage validation included

The production profiles are intentionally technology-aware:

- `PV`: day/night pattern plus seasonal behavior
- `Wind`: more stochastic and autocorrelated
- `Hydro`: slower regime changes and longer inertia
- `Gas`: stable around nominal output with occasional curtailment windows

## Forecast engine

### Portfolio Manager

Available models:

- `ARIMA`
- `Prophet`

### Data Analyst

Available models:

- `ARIMA`
- `Prophet`
- `RandomForest`
- `GradientBoosting`

### Shared forecast behavior

- chronological split: first `80%` training, last `20%` validation
- validation metrics returned:
  - `MAE`
  - `MAPE`
  - validation period
  - total processing time
- output scopes supported for production:
  - portfolio
  - market zone
  - single plant
- microservice fallback:
  - simple seasonal fallback if the requested model fails or history is insufficient

### Forecast targets

- `price`
- `volume`
- `price and volume`

### Forecast horizons

- `intraday` = next `24h`
- `day-ahead` = next `48h`

## User event tracking

The backend exposes `POST /events/actions` to store relevant UI actions. Tracked events currently include:

- profile changes
- theme changes
- granularity changes
- monitor time-window changes
- analyst production-view changes
- plant selections
- forecast requests
- forecast completions

Stored event fields include, when available:

- `session_id`
- `event_name`
- `surface`
- `outcome`
- `user_role`
- `theme`
- `granularity`
- `context`
- `payload`
- request metadata:
  - `request_id`
  - `path`
  - `client_host`
  - `user_agent`

## Main endpoints

- `GET /health`
- `GET /ready`
- `GET /filters`
- `GET /dashboard/summary`
- `GET /dashboard/production-series`
- `GET /dashboard/price-series`
- `GET /dashboard/actual-vs-forecast`
- `GET /forecasts/runs`
- `GET /forecasts/runs/{id}`
- `POST /forecasts/runs`
- `POST /events/actions`
- `GET http://localhost:8001/health`
- `POST http://localhost:8001/forecast/v1/predict`

## Quality gates

### Backend

```bash
docker compose run --rm api pytest tests
docker compose run --rm api python scripts/validate_seed.py --days 60
```

### Forecast service

```bash
docker compose build forecast-service
docker compose run --rm forecast-service python -m pytest tests
```

### Frontend

```bash
docker run --rm -v /home/matteo/Documents/energy-monitor/frontend:/app -w /app node:20-alpine npm run test
docker run --rm -v /home/matteo/Documents/energy-monitor/frontend:/app -w /app node:20-alpine npm run build
```

### Infra

```bash
docker compose config
docker compose ps
```

## Recommended smoke tests

```bash
curl -s http://localhost:8000/health
curl -s "http://localhost:8000/dashboard/summary?granularity=1h"
curl -s "http://localhost:8000/dashboard/price-series?granularity=1h&breakdown_by=none"
curl -s "http://localhost:8000/dashboard/production-series?granularity=1h&breakdown_by=none"
curl -s -X POST http://localhost:8000/forecasts/runs \
  -H "content-type: application/json" \
  -d '{"model_type":"arima","target_kind":"both","horizon":"next_24h","granularity":"1h"}'
curl -s -X POST http://localhost:8000/events/actions \
  -H "content-type: application/json" \
  -d '{"events":[{"event_name":"smoke_test","surface":"manual","outcome":"attempted"}]}'
```

To verify that MongoDB is receiving events:

```bash
docker compose exec mongo mongosh --quiet --eval 'db.getSiblingDB("energy_monitor").user_action_events.find({}, { event_name: 1, surface: 1, outcome: 1 }).limit(5).toArray()'
```

## Environment variables

`.env.example` covers:

- base runtime: `APP_ENV`, `LOG_LEVEL`, `TZ`
- PostgreSQL: `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `DATABASE_URL`
- backend: `FORECAST_SERVICE_URL`, `CORS_ORIGINS`
- MongoDB: `MONGO_ENABLED`, `MONGO_URL`, `MONGO_DATABASE`, `MONGO_ACTION_COLLECTION`
- frontend: `VITE_API_BASE_URL`, `VITE_FORECAST_API_BASE_URL`

## Known limitations

- The page still restores only the forecast run generated in the current session, not the latest persisted run after refresh.
- The frontend bundle still deserves code splitting.
- `ARIMA` can emit non-blocking convergence warnings in some scenarios.
