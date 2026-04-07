# Backend service boundaries

## Goal

This backend is intentionally split so each layer answers a different question:

- routers answer "which HTTP contract are we exposing?"
- services answer "which domain flow are we orchestrating?"
- repositories answer "which data do we need and how do we persist it?"
- schemas answer "which payload shape do we promise?"
- core/db modules answer "which runtime rules apply everywhere?"

That separation matters in this demo because the same codebase needs to stay understandable during live walkthroughs, not just technically correct.

## Current boundaries

### `app/main.py`

Owns application assembly only:

- logging bootstrap
- middleware registration
- CORS policy
- router inclusion
- lifecycle logs

It should not accumulate business logic, because bootstrap code is hard to unit test and easy to accidentally bypass.

### `app/api/`

Owns HTTP concerns:

- query/body parsing
- dependency injection
- route naming and grouping
- response model declaration

Routers delegate quickly to services. That keeps HTTP files readable and prevents route functions from becoming the place where domain policy slowly spreads.

### `app/services/`

Owns orchestration and response shaping:

- dashboard response composition
- forecast workflow coordination
- metadata logging
- readiness semantics
- telemetry fallback policy

Services are the right place for decisions that span more than one repository call or that need logging with domain meaning.

### `app/repositories/`

Owns persistence details:

- SQL aggregation
- filtering rules reused across endpoints
- forecast run creation/completion/failure persistence
- metadata extraction for frontend filters
- MongoDB repository selection for user action tracking

Repositories should know the database shape, but they should not decide HTTP status codes or user-facing error wording.

### `app/schemas/`

Owns public data contracts:

- filter payloads
- dashboard query/response shapes
- forecast request/response shapes
- telemetry payloads
- health/readiness responses

This keeps route and service code from inventing ad-hoc dicts and makes the contract easier to change safely.

### `app/core/` and `app/db/`

Own shared runtime rules:

- settings loading
- structured logging policy
- request context propagation
- ORM base and naming conventions
- engine/session lifecycle

These modules exist to stop infrastructure details from leaking into domain code.

## Forecast-specific boundary

The API backend does not run forecasting algorithms itself. It:

1. decides which historical signal to build;
2. persists run lifecycle state;
3. calls the forecast microservice through `ForecastClient`;
4. translates transport or dependency failures into API-friendly errors.

That line matters because it keeps the backend API readable for application engineers while leaving model logic in the dedicated forecasting service.

## Error ownership

- routers own HTTP exposure, not recovery logic
- services own user-facing error policy
- repositories own low-level persistence failures
- middleware owns request-scoped logging context

The current code mostly respects this. The main intentional exception is that `ForecastService` raises `HTTPException` directly, because forecast execution is already an API-facing orchestration boundary.

## Review heuristics for future changes

When a change is proposed, use these checks:

- if it needs request parsing, it probably belongs in `api/`
- if it combines multiple calls or decides fallback behavior, it probably belongs in `services/`
- if it adds SQL, Mongo, or data bucketing, it probably belongs in `repositories/`
- if it changes payload shape, it should touch `schemas/`
- if it changes logging, settings, request ids, or sessions, it should stay in `core/` or `db/`

If a route starts growing conditionals, loops, or persistence code, that is usually the first sign the boundary is slipping.
