# Architecture Decision Records

## Purpose

This folder records the key architectural decisions that shape the current Energy Monitor demo.

The ADRs are intentionally short and practical:

- enough for CIO and senior engineer alignment
- explicit on why the current choice exists
- explicit on where the choice is demo-oriented rather than production-grade

## Current ADR Index

- [ADR-001: local compose multi-service demo](./ADR-001-local-compose-multi-service-demo.md)
- [ADR-002: separate API and forecast service](./ADR-002-separate-api-and-forecast-service.md)
- [ADR-003: polyglot persistence with PostgreSQL and MongoDB](./ADR-003-polyglot-persistence-postgres-and-mongo.md)
- [ADR-004: single-page role-based dashboard](./ADR-004-single-page-role-based-dashboard.md)

## Status Vocabulary

- `Accepted`: current intended direction
- `Superseded`: kept for history but replaced
- `Proposed`: candidate not yet stabilized

## Note

These ADRs describe the implemented demo architecture. They do not claim that the same decisions should be copied unchanged into a production environment.
