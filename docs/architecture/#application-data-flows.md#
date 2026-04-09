# Application and Data Flows

## Intent

This document describes the main end-to-end flows that make the current system valuable:

- dashboard read
- forecast execution
- user action tracking

The emphasis is on runtime collaboration between components, not on code-level implementation detail.

## 1. Dashboard Read Flow

The frontend shell loads filter metadata first, then requests the dashboard signals it needs for charts and KPI panels.

```mermaid
sequenceDiagram
    participant User
    participant FE as React SPA
    participant API as Backend API
    participant PG as PostgreSQL

    User->>FE: open application / change context
    FE->>API: GET /filters
    API->>PG: read master data + date range
    API-->>FE: filters metadata

    FE->>API: GET /dashboard/summary
    API->>PG: aggregate production + prices
    API-->>FE: summary payload

    FE->>API: GET /dashboard/price-series
    API->>PG: aggregate prices by granularity
    API-->>FE: price series

    FE->>API: GET /dashboard/production-series
    API->>PG: aggregate production by granularity
    API-->>FE: production series
```

### What Matters Architecturally

- source data remains quarter-hourly in storage
- hourly data is derived on query, not pre-materialized as a second source of truth
- the frontend owns rendering state, but aggregation semantics stay server-side
- one SPA shell composes different persona views from the same backend domain services

## 2. Forecast Execution Flow

The main forecast flow is intentionally API-led, not direct-from-frontend to the forecast microservice.

That choice keeps the backend responsible for:

- historical signal assembly
- run persistence
- error translation
- traceability metadata

```mermaid
sequenceDiagram
    participant User
    participant FE as React SPA
    participant API as Backend API
    participant PG as PostgreSQL
    participant FS as Forecast Service

    User->>FE: run forecast
    FE->>API: POST /forecasts/runs
    API->>PG: load historical signal by scope
    API->>PG: create forecast_run status=running
    API->>FS: POST /forecast/v1/predict
    FS-->>API: forecast points + metadata + fallback info
    API->>PG: persist forecast values and complete run
    API-->>FE: execution response with run details
    FE->>FE: overlay forecast on monitor charts
```

### Scope Resolution As Implemented Today

- price forecast is currently portfolio-scoped
- production forecast can be portfolio-scoped
- production forecast can also target a zone
- production forecast can also target a single plant

This is already real in the current app shell because the `Data Analyst` view can drive zone or plant forecast context.

## 3. Forecast Model Execution Inside the Forecast Service

The forecast service receives a normalized historical series rather than raw database access.

```mermaid
flowchart TD
    Request["Predict request"]
    Normalize["Normalize input series"]
    Split["80/20 train-validation split"]
    Primary["Requested model<br/>ARIMA / Prophet / RandomForest / GradientBoosting"]
    Fallback["Naive seasonal fallback"]
    Metrics["Validation metrics + metadata"]
    Output["Forecast points response"]

    Request --> Normalize --> Split --> Primary
    Primary --> Metrics
    Primary -->|model unavailable / insufficient history / runtime failure| Fallback
    Fallback --> Metrics --> Output
```

### Architecturally Relevant Details

- forecasting logic is isolated from the API backend
- fallback is explicit and returned in metadata
- validation metrics are computed as part of the request flow
- the design favors readability and demo traceability over enterprise ML complexity

## 4. User Action Tracking Flow

Tracking is intentionally best-effort.

```mermaid
sequenceDiagram
    participant User
    participant FE as React SPA
    participant API as Backend API
    participant Mongo as MongoDB

    User->>FE: change persona / theme / granularity / forecast action
    FE->>API: POST /events/actions
    API->>API: enrich with request metadata
    API->>Mongo: insert events when enabled
    API-->>FE: stored / skipped / failed
    Note over FE,API: Main UI flow does not fail if tracking is unavailable
```

## 5. Data Ownership Summary

| Data | Owner | Why |
|---|---|---|
| plant master data | PostgreSQL | relational domain reference data |
| production actuals | PostgreSQL | analytical joins and time-series aggregation |
| market prices | PostgreSQL | same business domain as dashboard and forecast history |
| forecast runs | PostgreSQL | product-facing domain artifact with audit value |
| forecast values | PostgreSQL | tied to forecast runs and chart overlays |
| user action events | MongoDB | flexible event payloads and looser schema evolution |

## Demo Assumptions Vs Production-Grade Expectations

### Demo assumptions

- forecast execution is synchronous from the user perspective
- dashboard reads operate directly on the demo relational store
- telemetry storage failure is acceptable as long as the product flow continues
- local service-to-service HTTP is sufficient

### Production-grade expectations

- forecast execution would likely move to asynchronous orchestration for heavier load
- read optimization might require caching, pre-aggregation, or dedicated serving patterns
- tracking might evolve toward session analytics or event streaming
- stronger cross-service observability would be required to correlate frontend actions, API calls, and model runs
