# Backend logging and errors

## Why this matters

This demo depends on multiple services and two storage technologies. Structured logging and explicit error policy are what keep local troubleshooting understandable when something fails during a walkthrough.

## Logging model

### Structured JSON logs

`app/core/logging.py` configures `structlog` once at startup. The intention is to keep every runtime log line machine-readable and consistent across modules instead of mixing plain strings and custom formats.

### Request context

`RequestContextMiddleware` binds these values at the start of each request:

- `request_id`
- `path`
- `method`

This is why service and repository logs can still be correlated to the originating HTTP request without explicitly threading those values through every function signature.

### Lifecycle and domain events

The current backend emits logs for:

- application start and stop
- request completion and request failure
- readiness degradation when the database is unavailable
- dashboard and metadata load events
- forecast request start, completion, and failure
- user action tracking stored, skipped, or failed

The log messages are short on purpose. The useful detail is meant to sit in structured fields, because that keeps filters and post-processing easier.

## Error policy by layer

### Middleware

The middleware logs unhandled exceptions with request context and then re-raises them. It should observe failure, not convert every exception into a custom response.

### Routes

Routes mostly rely on FastAPI defaults and service-level exceptions. This keeps them thin and avoids duplicating response policy across endpoints.

### Services

Services decide which failures are expected enough to turn into user-facing API outcomes.

Current examples:

- `ForecastService` raises `404` when a run does not exist, because that is a normal API lookup failure.
- `ForecastService` raises `400` when no historical data exists for the requested target, because the request cannot be satisfied meaningfully.
- `ForecastService` raises `502` when the forecast microservice call fails, because the backend itself is available but a downstream dependency is not.
- `UserActionService` does not fail the main request when tracking is disabled or storage fails; it returns `skipped` or `failed` status instead.

### Repositories

Repositories generally let database exceptions propagate upward. That is useful because the service layer is where backend-specific failures become product-facing policy.

## Practical implications

- A missing forecast run is treated as a client-visible lookup issue.
- Forecast dependency failures are preserved as failed runs before the API responds with an error.
- Telemetry is best-effort and intentionally non-blocking.
- Readiness is allowed to degrade without pretending the service is fully healthy.

## Current limits

- There is no global custom exception mapping layer yet beyond FastAPI defaults and middleware logging.
- Readiness checks only the relational database directly; it reports the configured forecast-service URL but does not probe that service.
- MongoDB failures are surfaced through tracking status rather than a dedicated health endpoint.

These are reasonable tradeoffs for the demo, but they are worth remembering before extending the backend into a stricter operational setting.
