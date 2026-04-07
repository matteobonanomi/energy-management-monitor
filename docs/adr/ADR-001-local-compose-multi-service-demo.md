# ADR-001: Local Compose Multi-Service Demo

- Status: Accepted
- Date: 2026-04-07

## Context

The repository must demonstrate a real full stack system locally:

- frontend
- API backend
- forecast microservice
- relational persistence
- telemetry persistence

The demo also needs to be easy to boot on a normal Ubuntu host without mandatory host-level application dependencies outside containers.

## Decision

Run the platform locally through a single `docker compose` topology that starts:

- `frontend`
- `api`
- `forecast-service`
- `postgres`
- `mongo`

The API container also performs migration and demo-data bootstrap at startup.

## Rationale

- lowers setup friction for demos and evaluations
- makes service boundaries visible instead of hiding everything in one process
- keeps the environment reproducible enough for testing and walkthroughs
- demonstrates cross-stack interactions without introducing deployment orchestration complexity

## Consequences

### Positive

- one-command startup for the full stack
- realistic enough to show service decomposition and persistence boundaries
- good fit for local engineering and demo iteration

### Negative

- startup behavior couples runtime availability with migration and seeding
- local compose is not a deployment architecture
- limited operational realism for scaling, security, and resilience

## Demo Assumptions

- developer-operated environment
- trusted local network
- default demo credentials and ports
- no external traffic management, secrets platform, or SRE tooling

## Production-Grade Note

A production-grade system would likely keep the service split but replace local compose with environment-managed deployment, stronger config and secrets handling, and explicit operational ownership.
