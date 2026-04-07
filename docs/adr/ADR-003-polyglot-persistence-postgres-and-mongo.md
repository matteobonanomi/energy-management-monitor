# ADR-003: Polyglot Persistence With PostgreSQL and MongoDB

- Status: Accepted
- Date: 2026-04-07

## Context

The current system persists two kinds of data with different characteristics:

- operational domain data that is relational and queried analytically
- user action events with flexible payload structure and lower coupling to core reads

The repository blueprint already distinguishes these responsibilities.

## Decision

Use:

- PostgreSQL for plant master data, production measurements, market prices, forecast runs, and forecast values
- MongoDB for user action events

## Rationale

- relational joins and aggregations are natural for dashboard and forecast history reads
- forecast runs belong to the core application domain and benefit from relational traceability
- event tracking payloads are flexible and evolve more easily in a document store
- the separation keeps telemetry concerns from distorting the operational schema

## Consequences

### Positive

- clean ownership split between domain data and telemetry
- backend can degrade tracking without compromising business reads
- easier schema stability for core product data

### Negative

- two persistence technologies to run and reason about
- different operational characteristics and backup concerns
- no unified query model across product data and telemetry

## Demo Assumptions

- MongoDB is optional from the user-flow perspective
- telemetry failure is acceptable and reported as `skipped` or `failed`
- local storage management is sufficient

## Production-Grade Note

A production-grade design could still keep this split, but it would need stronger data retention, operational governance, backup policy, and a clearer analytics strategy for events over time.
