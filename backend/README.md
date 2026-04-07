# Backend

The backend is the REST entrypoint for the demo. Its job is to expose a stable HTTP contract to the frontend, read and aggregate SQL data, orchestrate forecast execution through the dedicated microservice, and keep telemetry best-effort.

## Why the code is split this way

- `app/main.py` owns bootstrap concerns so logging, middleware, CORS, and router registration are configured once.
- `app/api/` translates HTTP requests into typed inputs and delegates early, which keeps route handlers easy to review.
- `app/services/` holds orchestration and response-shaping logic, because that is where business decisions become easiest to test.
- `app/repositories/` keeps SQL and persistence details close together, which reduces query drift between endpoints.
- `app/schemas/` defines the public API vocabulary so frontend and backend share the same contracts.
- `app/core/` centralizes runtime policies such as settings, request context, and structured logging.
- `app/db/` contains ORM definitions and session wiring so persistence stays predictable across local runs and tests.

## Main request flows

### Dashboard reads

1. A router resolves query parameters into a typed filter object.
2. The dashboard service asks the repository for summary or time-series data.
3. The repository aggregates quarter-hour source data into `15m` or `1h` buckets.
4. The service reshapes rows into response schemas the frontend can plot directly.

### Forecast execution

1. The forecast route passes a validated request to `ForecastService`.
2. The service resolves the effective signal scope and fetches historical data through `ForecastRepository`.
3. The repository reuses dashboard-style aggregation so forecast history matches what the UI already sees.
4. The service creates a `forecast_runs` record before calling the forecast microservice.
5. On success it stores forecast points and metadata; on failure it stores a failed run and raises an HTTP error.

### User action tracking

1. The events route enriches incoming events with request metadata.
2. `UserActionService` builds Mongo-friendly documents.
3. If tracking is disabled or Mongo is unavailable, the service returns a non-blocking status instead of failing the main product flow.

## Storage responsibilities

- PostgreSQL stores plant master data, production actuals, market prices, forecast runs, and forecast values.
- MongoDB stores user action events because the payload is flexible and intentionally decoupled from core product reads.

## Local quality checks

Run the smallest relevant checks first:

```bash
docker compose run --rm api pytest tests
```

For environment validation:

```bash
docker compose config
```

## Related docs

- [Service boundaries](../docs/backend/service_boundaries.md)
- [Logging and errors](../docs/backend/logging_and_errors.md)
