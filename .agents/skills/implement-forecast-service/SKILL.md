---
name: implement-forecast-service
description: Use when creating or modifying a Python forecasting microservice, model contract, baseline models, fallback logic, or forecast validation.
---

Implement forecast services conservatively.

Recommended sequence:
1. define or update request/response schemas
2. keep history preparation explicit
3. implement the primary model path
4. implement a simpler fallback path
5. add tests for nominal and degraded cases
6. add logs for requested, completed, and failed runs

Guidelines:
- prefer understandable statistical baselines first
- surface fallback usage clearly
- keep runtime acceptable on a normal laptop
- avoid enterprise ML scaffolding unless the user asks for it
