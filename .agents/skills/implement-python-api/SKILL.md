---
name: implement-python-api
description: Use for FastAPI backend work: contracts, validation, query logic, orchestration, persistence, logging, and API tests.
---

Implement backend features with a senior-engineering approach.

Rules:
- keep routers thin
- put business rules in services
- keep repository/query code explicit and testable
- separate schemas from persistence models
- preserve backward compatibility unless the task explicitly changes the contract
- add or update endpoint and service tests

Typical responsibilities:
- health/readiness
- metadata/filters
- dashboard summaries and series
- forecast orchestration
- tracking or audit endpoints
